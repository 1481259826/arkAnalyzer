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

import { Scene } from "../../../Scene";
import { AbstractInvokeExpr, ArkInstanceInvokeExpr, ArkNewExpr, ArkStaticInvokeExpr } from "../../base/Expr";
import { Local } from "../../base/Local";
import { AbstractFieldRef, ArkInstanceFieldRef } from "../../base/Ref";
import { ArkAssignStmt, Stmt } from "../../base/Stmt";
import { Value } from "../../base/Value";
import { ArkMethod } from "../../model/ArkMethod";
import { ClassSignature, MethodSignature } from "../../model/ArkSignature";
import { NodeID } from "../BaseGraph";
import { CallGraph, FuncID, Method } from "../CallGraph";
import { Pag, PagEdge, PagEdgeKind, PagInstanceFieldNode, PagLocalNode, PagNode, PagStaticFieldNode, PagThisRefNode } from "../Pag";
import { CSFuncID, PagBuilder } from "../builder/PagBuilder";
import { AbstractAnalysis } from "./AbstractAnalysis";
import { DiffPTData, PtsSet } from "../../pta/PtsDS";
import { KLimitedContextSensitive } from "../../pta/Context";
import { ArkClass } from "../../model/ArkClass";

type PointerPair = [NodeID, NodeID]

export class PointerAnalysis extends AbstractAnalysis{
    private pag: Pag;
    private pagBuilder: PagBuilder;
    private cg: CallGraph;
    private pointerPairList: PointerPair[] = [];
    private reachableMethods: Set<CSFuncID>
    private reachableStmts: Stmt[]
    private ptd: DiffPTData<NodeID, NodeID, PtsSet<NodeID>>;
    private entry: FuncID;
    private ctx: KLimitedContextSensitive;
    private worklist: NodeID[];
    private handledNodes: NodeID[] = [];
    private ptaStat: PTAStat;

    constructor(p: Pag, cg: CallGraph, s: Scene) {
        super(s)
        this.pag = p;
        this.cg = cg;
        this.reachableStmts = []
        this.reachableMethods = new Set()
        this.ptd = new DiffPTData<NodeID, NodeID, PtsSet<NodeID>>(PtsSet);
        this.pagBuilder = new PagBuilder(this.pag, this.cg, s);
        this.ptaStat = new PTAStat();
    }

    private init() {
        this.ptaStat.startStat();
        // TODO: how to get entry
        this.pagBuilder.buildForEntry(this.entry);
        this.pag.dump('out/ptaInit_pag.dot');
    }

    public start() {
        this.init();
        this.solveConstraint();

        this.postProcess();
    }

    private postProcess() {
        this.ptaStat.endStat();
        this.ptaStat.printStat();
        this.pag.dump('out/ptaEnd_pag.dot');
        this.cg.dump('out/cgEnd.dot')
    }

    public setEntry(fid: FuncID) {
        this.entry = fid;
    }

    private solveConstraint() {
        this.initWorklist();
        let reanalyzer: boolean = true;

        while (reanalyzer) {
            this.handledNodes = [];
            this.ptaStat.iterTimes++;

            this.solveWorklist();
            reanalyzer = this.updateCallGraph();
            this.pag.dump('out/pta_pag.dot');
        }

    }

    private initWorklist() {
        this.worklist = []
        for (let e of this.pag.getAddrEdges()) {
            this.ptaStat.numProcessedAddr++;

            let { src, dst } = e.getEndPoints();
            this.ptd.addPts(dst, src);

            this.worklist.push(dst);
        }
    }

    private solveWorklist(): boolean {
        while (this.worklist.length > 0) {
            let node = this.worklist.shift() as NodeID;
            this.processNode(node);
        }

        return true;
    }

    private processNode(node: NodeID): boolean {
        this.handleThis(node)
        this.handleLoadWrite(node);
        this.handleCopy(node);

        this.ptd.flush(node);
        try{
            (this.pag.getNode(node) as PagNode).setPointerSet(this.ptd.getPropaPts(node)!.getProtoPtsSet());
        } catch(e) {
            console.log(e);
        }
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
        if (this.handledNodes.includes(nodeID)) {
            return false;
        }
        this.handledNodes.push(nodeID);

        let node = this.pag.getNode(nodeID) as PagNode;
        let diffPts = this.ptd.getDiffPts(nodeID);
        if (!diffPts) {
            return false;
        }

        node.getOutgoingLoadEdges()?.forEach(loadEdge => {
            this.processLoad(nodeID, loadEdge);
        });   

        node.getOutgoingWriteEdges()?.forEach(writeEdge => {
            this.processWrite(nodeID, writeEdge);
        });

        return true;
    }

    private handleThis(nodeID: NodeID): boolean {
        this.ptaStat.numProcessedThis++;

        let node = this.pag.getNode(nodeID) as PagNode;
        node.getOutgoingThisEdges()?.forEach(thisEdge => {
            const dst = thisEdge.getDstID();
            this.ptd.addPts(
                dst, 
                (thisEdge.getDstNode() as PagThisRefNode).getThisPTNode()
            );

            this.processNode(dst);
        });

        return true
    }

    /*
     *  b = a.f
     *	src --load--> dst,
     *	node \in pts(src) ==>  node--copy-->dst
     */
    private processLoad(nodeID: NodeID, loadEdge: PagEdge) {
        this.ptaStat.numProcessedLoad++;

        let src = this.pag.getNode(nodeID) as PagNode;  // field
        let dst = loadEdge.getDstNode() as PagNode;     // Local

        // In case src node is a cloned instance field node
        if (src.getClonedFrom()) {
            src.getOutgoingLoadEdges().forEach(edge => {
                src.removeOutgoingEdge(edge);
            });

            if (this.pag.addPagEdge(src, dst, PagEdgeKind.Copy)) {
                this.worklist.push(src.getID());
            }
        } else if (src instanceof PagStaticFieldNode) {
            this.propagate(loadEdge);
        } else {
            let basePts = this.getBasePts(src);
            for (let pt of basePts) {
                let newSrc = this.pag.getOrClonePagNode(src, pt);
                if (this.pag.addPagEdge(newSrc, dst, PagEdgeKind.Copy)) {
                    this.worklist.push(newSrc.getID());
                }
            }
        }
    }

    /*
     *  a.f = b
     *	src --store--> dst,
     *	node \in pts(dst) ==>  src--copy-->node
     */
    private processWrite(nodeID: NodeID, writeEdge: PagEdge) {
        this.ptaStat.numProcessedWrite++;

        let src = this.pag.getNode(nodeID) as PagNode;
        let wr2 = writeEdge.getDstNode() as PagNode;

        if (wr2 instanceof PagInstanceFieldNode) {
            let basePts = this.getBasePts(wr2);
            for (let pt of basePts) {
                // 1st. clone the ref node for each base class instance
                let newDst = this.pag.getOrClonePagNode(wr2, pt);
                (newDst as PagInstanceFieldNode).setBasePt(pt);
                if (this.pag.addPagEdge(src, newDst, PagEdgeKind.Copy)) {
                    this.ptaStat.numRealWrite++;

                    this.worklist.push(src.getID());
                }

                // 2nd. add edge from cloned nodes to successor nodes
                wr2.getOutgoingEdges().forEach(edge => {
                    let succNode = edge.getDstNode() as PagNode;
                    this.pag.addPagEdge(newDst, succNode, edge.getKind());
                })
            }
        } else if (wr2 instanceof PagStaticFieldNode) {
            this.propagate(writeEdge);
        } else {
            throw new Error ('dst not a field ref node');
        }
    }

    /*
     * a.f
     * Get a's pts
     * only process instance field ref
     */
    private getBasePts(inNode: PagNode) {
        let ret: Set<NodeID> = new Set();
        let value = inNode.getValue();
        if (!(value instanceof ArkInstanceFieldRef)) {
            throw new Error ('Not a Ref field');
        }
        let base: Local = value.getBase();
        let ctx2NdMap = this.pag.getNodesByValue(base);
        if (!ctx2NdMap) {
            throw new Error ('Cannot find pag node for a local');
        }

        for (let [cid, nodeId] of ctx2NdMap.entries()) {
            if (cid != inNode.getCid()) {
                continue;
            }
            let pts = this.ptd.getPropaPts(nodeId);
            if (!pts) {
                throw new Error (`Can't find pts for Node${nodeId}}`);
            }

            for(let pt of pts) {
                if (!ret.has(pt)) {
                    ret.add(pt);
                }
            }
        }

        return ret;
    }


    private propagate(edge: PagEdge): boolean {
        let changed: boolean = false;
        let { src, dst } = edge.getEndPoints();
        let diffPts = this.ptd.getDiffPts(src);
        if (!diffPts) {
            return changed;
        }

        // changed = this.ptd.unionDiffPts(dst, src);

        // which one is better?
        for (let pt of diffPts) {
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
            // Get local of base class
            let base = ivkExpr.getBase();
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

        this.pagBuilder.clearDynamicCallSiteSet();

        // TODO: on The Fly UpdateCG
        return changed;
    }

    private addToReanalyze(startNodes: NodeID[]): boolean {
        for (let node of startNodes) {
            if (!this.worklist.includes(node) && this.ptd.resetElem(node)) {
                this.worklist.push(node);
                return true;
            }
        }
        return false;
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
        output = output + `Processed write\t\t${this.numProcessedThis}\n`
        output = output + `Real write\t\t${this.numRealWrite}\n\n`
        output = output + `Dynamic call\t\t${this.numDynamicCall}\n`
        output = output + `Direct call\t\t${this.numDirectCall}\n\n`
        output = output + `Totol Time\t\t${this.TotalTime} S\n`
        output = output + `Totol iterator Times\t${this.iterTimes}\n`
        output = output + `RSS used\t\t${this.rssUsed.toFixed(3)} Mb\n`
        output = output + `Heap used\t\t${this.heapUsed.toFixed(3)} Mb\n`
        return output;

    }

    public printStat(): void {
        console.log(this.getStat());
    }
}