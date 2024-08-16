/*
 * Copyright (c) 2024 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Scene } from "../../Scene";
import { ArkInstanceInvokeExpr } from "../../core/base/Expr";
import { Local } from "../../core/base/Local";
import { ArkInstanceFieldRef } from "../../core/base/Ref";
import { Value } from "../../core/base/Value";
import { NodeID } from "../model/BaseGraph";
import path from "path";
import { CallGraph, FuncID } from "../model/CallGraph";
import { AbstractAnalysis } from "../algorithm/AbstractAnalysis";
import { DiffPTData, PtsSet } from "./PtsDS";
import { ClassType, Type } from "../../core/base/Type";
import { CallGraphBuilder } from "../model/builder/CallGraphBuilder";
import { PointerAnalysisConfig } from "./PointerAnalysisConfig";
import { ArkMethod } from "../../core/model/ArkMethod";
import { ArkAssignStmt } from "../../core/base/Stmt";
import Logger from "../../utils/logger"
import { DummyMainCreater } from "../../core/common/DummyMainCreater";
import { Pag, PagNode, PagEdgeKind, PagEdge, PagLocalNode } from "./Pag";
import { PagBuilder } from "./PagBuilder";

const logger = Logger.getLogger()

export class PointerAnalysis extends AbstractAnalysis{
    private pag: Pag;
    private pagBuilder: PagBuilder;
    private ptd: DiffPTData<NodeID, NodeID, PtsSet<NodeID>>;
    private entries: FuncID[];
    private worklist: NodeID[];
    private ptaStat: PTAStat;
    private typeDiffMap: Map<Value, Set<Type>>;
    private config: PointerAnalysisConfig

    constructor(p: Pag, cg: CallGraph, s: Scene, config: PointerAnalysisConfig) {
        super(s)
        this.pag = p;
        this.cg = cg;
        this.ptd = new DiffPTData<NodeID, NodeID, PtsSet<NodeID>>(PtsSet);
        this.pagBuilder = new PagBuilder(this.pag, this.cg, s, config.kLimit);
        this.cgBuilder = new CallGraphBuilder(this.cg, s);
        this.ptaStat = new PTAStat();
        this.config = config
    }

    static pointerAnalysisForWholeProject(projectScene: Scene, config?: PointerAnalysisConfig): PointerAnalysis {
        let cg = new CallGraph(projectScene);
        let cgBuilder = new CallGraphBuilder(cg, projectScene)
        cgBuilder.buildDirectCallGraph();
        let pag = new Pag();
        if (!config) {
            config = new PointerAnalysisConfig(1, "out/", false, false)
        }

        let entries: FuncID[] = [];// to get from dummy main
        const dummyMainCreator = new DummyMainCreater(projectScene)
        dummyMainCreator.createDummyMain()
        const dummyMainMethod = dummyMainCreator.getDummyMain()
        dummyMainMethod.getBody()?.getCfg().getStmts().forEach((stmt) => {
            let invokeExpr = stmt.getInvokeExpr()
            if (invokeExpr) {
                entries.push(cg.getCallGraphNodeByMethod(invokeExpr.getMethodSignature()).getID())
            }
        })
        let pta = new PointerAnalysis(pag, cg, projectScene, config)
        pta.setEntries(entries);
        pta.start();
        return pta;
    }

    protected init() {
        logger.warn(`========== Init Pointer Analysis ==========`)
        this.ptaStat.startStat();
        this.pagBuilder.buildForEntries(this.entries);
        if (this.config.dotDump) {
            this.pag.dump(path.join(this.config.outputDirectory, 'ptaInit_pag.dot'));
            this.cg.dump(path.join(this.config.outputDirectory, 'cg_init.dot'));
        }
    }

    public start() {
        this.init();
        this.solveConstraint();
        this.postProcess();
    }

    private postProcess() {
        this.ptaStat.endStat();
        this.ptaStat.printStat();
        if (this.config.dotDump) {
            this.pag.dump(path.join(this.config.outputDirectory, 'ptaEnd_pag.dot'));
            this.cg.dump(path.join(this.config.outputDirectory, 'cgEnd.dot'))
        }
    }

    public setEntries(fIds: FuncID[]) {
        this.entries = fIds;
    }

    private solveConstraint() {
        this.worklist = []
        logger.warn(`========== Pointer Analysis Start ==========`)
        this.initWorklist();
        let reanalyzer: boolean = true;

        while (reanalyzer) {
            this.ptaStat.iterTimes++;
            logger.warn(`========== Pointer Analysis Round ${this.ptaStat.iterTimes} ==========`)

            this.solveWorklist();
            // process dynamic call
            reanalyzer = this.updateCallGraph();
            if (this.config.dotDump) {
                this.pag.dump(path.join(this.config.outputDirectory, `pta_pag_itor#${this.ptaStat.iterTimes}.dot`));
            }
        }
    }

    private initWorklist() {
        for (let e of this.pag.getAddrEdges()) {
            this.ptaStat.numProcessedAddr++;

            let { src, dst } = e.getEndPoints();
            this.ptd.addPts(dst, src);

            this.worklist.push(dst);
        }
        this.pag.resetAddrEdges()
    }

    private solveWorklist(): boolean {
        while (this.worklist.length > 0) {
            let node = this.worklist.shift() as NodeID;
            this.processNode(node);
        }

        return true;
    }

    private processNode(nodeId: NodeID): boolean {
        this.handleThis(nodeId)
        this.handleLoadWrite(nodeId);
        this.handleCopy(nodeId);

        this.ptd.flush(nodeId);
        this.pagBuilder.setPtForNode(nodeId, this.ptd.getPropaPts(nodeId));
        this.detectTypeDiff(nodeId);
        return true;
    }

    private handleCopy(nodeID: NodeID): boolean {
        this.ptaStat.numProcessedCopy++;

        let node = this.pag.getNode(nodeID) as PagNode;
        node.getOutgoingCopyEdges()?.forEach(copyEdge => {
            this.propagate(copyEdge);
        });

        return true;
    }

    private handleLoadWrite(nodeID: NodeID): boolean {
        let node = this.pag.getNode(nodeID) as PagNode;
        let diffPts = this.ptd.getDiffPts(nodeID);
        if (!diffPts || diffPts.count() == 0) {
            return false;
        }

        // get related field node with current node's value
        let instanceFieldNodeMap = this.pag.getNodesByBaseValue(node.getValue());

        if (instanceFieldNodeMap === undefined) {
            return true;
        }

        instanceFieldNodeMap.forEach((nodeIDs, cid) => {
            // TODO: check cid
            if (cid != node.getCid()) {
                return
            }
            nodeIDs.forEach((nodeID) => {
                let fieldNode = this.pag.getNode(nodeID) as PagNode;
                fieldNode?.getIncomingEdge().forEach((edge) => {
                    if (edge.getKind() != PagEdgeKind.Write) {
                        throw new Error ("field node in edge is not write edge")
                    }
                    let srcNode = edge.getSrcNode() as PagNode;
                    this.ptaStat.numProcessedWrite++;
                    for (let pt of diffPts) {
                        // filter pt
                        let dstNode = this.pag.getOrClonePagFieldNode(fieldNode, pt);
                        if (this.pag.addPagEdge(srcNode, dstNode, PagEdgeKind.Copy)) {
                            this.ptaStat.numRealWrite++;

                            if (this.ptd.resetElem(srcNode.getID())) {
                                this.worklist.push(srcNode.getID());
                            }
                        }
                    }
                })

                fieldNode.getOutgoingEdges().forEach((edge) => {
                    if (edge.getKind() != PagEdgeKind.Load) {
                       return;
                    }
                    let dstNode = edge.getDstNode() as PagNode;
                    this.ptaStat.numProcessedLoad++;
                    for (let pt of diffPts) {
                        let srcNode = this.pag.getOrClonePagFieldNode(fieldNode, pt);
                        if (this.pag.addPagEdge(srcNode, dstNode, PagEdgeKind.Copy)) {
                            this.ptaStat.numRealLoad++;

                            // TODO: if field is used before initialzed, newSrc node has no diff pts
                            if (this.ptd.resetElem(srcNode.getID())) {
                                this.worklist.push(srcNode.getID());
                            }
                        }
                    }
                })
            })
        })

        return true;
    }

    private handleThis(nodeID: NodeID): boolean {
        this.ptaStat.numProcessedThis++;

        let node = this.pag.getNode(nodeID) as PagNode;
        node.getOutgoingThisEdges()?.forEach(thisEdge => {
            this.propagate(thisEdge);
            // const dst = thisEdge.getDstID();
            // let thisRefNode = thisEdge.getDstNode() as PagThisRefNode;
            // thisRefNode.getThisPTNode().forEach((basePT) => {
            //     this.ptd.addPts(dst, basePT);
            // })

            // this.processNode(dst);
        });

        return true
    }

    private propagate(edge: PagEdge): boolean {
        let changed: boolean = false;
        let { src, dst } = edge.getEndPoints();
        let diffPts = this.ptd.getDiffPts(src);
        if (!diffPts) {
            return changed;
        }
        let realDiffPts = this.ptd.calculateDiff(src, dst);

        for (let pt of realDiffPts) {
           changed = this.ptd.addPts(dst, pt) || changed;
        }

        if (changed) {
            this.worklist.push(dst);
        }

        return changed;
    }

    private updateCallGraph(): boolean {
        let changed = false;
        let dynCallsites = this.pagBuilder.getDynamicCallSites();

        dynCallsites?.forEach(cs => {
            let ivkExpr = cs.callStmt.getInvokeExpr() as ArkInstanceInvokeExpr;
            {
                //debug
                let name = ivkExpr.getMethodSignature().getMethodSubSignature().getMethodName()
                if(name === 'forEach')
                    debugger
            }
            // Get local of base class
            let base = ivkExpr.getBase();
            // TODO: remove this after multiple this local fixed
            base = this.pagBuilder.getRealThisLocal(base, cs.callerFuncID)
            // Get PAG nodes for this base's local
            let ctx2NdMap = this.pag.getNodesByValue(base);
            if (ctx2NdMap) {
                for (let [cid, nodeId] of ctx2NdMap.entries()) {

                    let pts = this.ptd.getPropaPts(nodeId);
                    if (pts) {
                        for(let pt of pts) {
                            let srcNodes = this.pagBuilder.addDynamicCallEdge(cs, pt, cid);
                            changed = this.addToReanalyze(srcNodes) || changed;
                        }
                    }
                }
            }
        })
        
        changed = this.pagBuilder.handleReachable() || changed;

        this.initWorklist();

        // TODO: on The Fly UpdateCG
        return changed;
    }

    // private temp() {
    //     let funcPtrID: NodeID = 0
    //     let funcPtrNode = this.pag.getNode(funcPtrID) as PagFuncNode

    //     let methodSig = funcPtrNode.getMethod()
    //     // TODO: maybe a new kind of callsite? and check static and instance
    //     this.pagBuilder.addStaticPagCallEdge()
    // }

    private addToReanalyze(startNodes: NodeID[]): boolean {
        let flag = false
        for (let node of startNodes) {
            if (!this.worklist.includes(node) && this.ptd.resetElem(node)) {
                this.worklist.push(node);
                flag = true
            }
        }
        return flag;
    }

    /**
     * compare interface
     */
    public noAlias(leftValue: Value, rightValue: Value) {
        let leftValueNodes = this.pag.getNodesByValue(leftValue)?.values()!
        let rightValueNodes = this.pag.getNodesByValue(rightValue)?.values()!

        let leftValuePts: Set<NodeID> = new Set(), rightValuePts: Set<NodeID> = new Set()

        for (let nodeID of leftValueNodes) {
            let node = this.pag.getNode(nodeID) as PagNode
            for (let pt of node.getPointTo()) {
                leftValuePts.add(pt)
            }
        }

        for (let nodeID of rightValueNodes) {
            let node = this.pag.getNode(nodeID) as PagNode
            for (let pt of node.getPointTo()) {
                rightValuePts.add(pt)
            }
        }

        if (leftValuePts.size > rightValuePts.size) {
            [leftValuePts, rightValuePts] = [rightValuePts, leftValuePts];
        }
        
        for (const elem of leftValuePts) {
            if (rightValuePts.has(elem)) {
                return false;
            }
        }
        
        // no alias
        return true;
    }

    private detectTypeDiff(nodeId: NodeID): void {
        if (this.config.detectTypeDiff == false) {
            return;
        }

        this.typeDiffMap = this.typeDiffMap ?? new Map();
        let node = this.pag.getNode(nodeId) as PagNode;
        // We any consider type diff for Local node
        if (!(node instanceof PagLocalNode)) {
            return;
        }

        let value = node.getValue();
        let origType = node.getValue().getType();
        // TODO: union type
        if (!(origType instanceof ClassType)) {
            return;
        }

        let findSameType = false;
        let pts = node.getPointTo();
        pts.forEach(pt => {
            let ptNode = this.pag.getNode(pt) as PagNode;
            let type = ptNode.getValue().getType();
            if (type.toString() != origType.toString()) {
                let diffSet = this.typeDiffMap.get(value);
                if (!diffSet) {
                    diffSet = new Set();
                    this.typeDiffMap.set(value, diffSet);
                }
                diffSet.add(type);
            } else {
                findSameType = true;
            }
        })

        // If find pts to original type, 
        // need add original type back since it is a correct type
        let diffSet = this.typeDiffMap.get(value);
        if (diffSet && findSameType) {
            diffSet.add(origType);
        }
    }

    public getTypeDiffMap(): Map<Value, Set<Type>> {
        return this.typeDiffMap;
    }

    protected resolveCall(sourceMethod: NodeID, invokeStmt: Stmt): CallSite[] {
        return []
    }
}

//TODO: to be defined and move to seperated source file
interface StatTraits {}
class PTAStat implements StatTraits {
    numProcessedAddr: number = 0;
    numProcessedCopy: number = 0;
    numProcessedLoad: number = 0;
    numProcessedWrite: number = 0;
    numProcessedThis: number = 0;
    numRealWrite: number = 0;
    numRealLoad: number = 0;

    numDynamicCall: number = 0;
    numDirectCall: number = 0;

    iterTimes: number = 0;
    TotalTime: number;

    startTime: number;
    endTime: number;

    startMemUsage: any;
    endMemUsage: any;
    rssUsed: number;
    heapUsed: number;

    public startStat(): void {
        this.startTime = this.getNow();
        this.startMemUsage = process.memoryUsage();
    }

    public endStat(): void {
        this.endTime = this.getNow();
        this.endMemUsage = process.memoryUsage();
        this.TotalTime = (this.endTime - this.startTime) / 1000;
        this.rssUsed = Number(this.endMemUsage.rss - this.startMemUsage.rss) / Number(1024 * 1024);
        this.heapUsed = Number(this.endMemUsage.heapTotal - this.startMemUsage.heapTotal) / Number(1024 * 1024);
    }

    public getNow(): number {
        return new Date().getTime();
    }

    public getStat(): string {
        // TODO: get PAG stat and CG stat
        let output: string;
        output = '==== Pointer analysis Statictics: ====\n'
        output = output + `Processed address\t${this.numProcessedAddr}\n`
        output = output + `Processed copy\t\t${this.numProcessedCopy}\n`
        output = output + `Processed load\t\t${this.numProcessedLoad}\n`
        output = output + `Processed write\t\t${this.numProcessedWrite}\n`
        output = output + `Real write\t\t${this.numRealWrite}\n`
        output = output + `Real load\t\t${this.numRealLoad}\n`
        output = output + `Processed This\t\t${this.numProcessedThis}\n\n`
        output = output + `Dynamic call\t\t${this.numDynamicCall}\n`
        output = output + `Direct call\t\t${this.numDirectCall}\n\n`
        output = output + `Total Time\t\t${this.TotalTime} S\n`
        output = output + `Total iterator Times\t${this.iterTimes}\n`
        output = output + `RSS used\t\t${this.rssUsed.toFixed(3)} Mb\n`
        output = output + `Heap used\t\t${this.heapUsed.toFixed(3)} Mb\n`
        return output;

    }

    public printStat(): void {
        console.log(this.getStat());
    }
}
