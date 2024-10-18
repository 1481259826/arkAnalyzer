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

import { CallGraph, FuncID, CallGraphNode, CallSite, DynCallSite, CallGraphNodeKind } from '../model/CallGraph';
import { Scene } from '../../Scene'
import { Stmt, ArkAssignStmt, ArkReturnStmt, ArkInvokeStmt } from '../../core/base/Stmt'
import { AbstractExpr, AbstractInvokeExpr, ArkInstanceInvokeExpr, ArkNewArrayExpr, ArkNewExpr, ArkStaticInvokeExpr } from '../../core/base/Expr';
import { ArkArrayRef, ArkInstanceFieldRef, ArkParameterRef, ArkStaticFieldRef, ArkThisRef } from '../../core/base/Ref';
import { Value } from '../../core/base/Value';
import { ArkMethod } from '../../core/model/ArkMethod';
import Logger, { LOG_MODULE_TYPE } from "../../utils/logger";
import { Local } from '../../core/base/Local';
import { NodeID } from '../model/BaseGraph';
import { ClassSignature } from '../../core/model/ArkSignature';
import { ArkClass } from '../../core/model/ArkClass';
import { ClassType, FunctionType } from '../../core/base/Type';
import { Constant } from '../../core/base/Constant';
import { PAGStat } from '../common/Statistics';
import { ContextID, DUMMY_CID, KLimitedContextSensitive } from './Context';
import { Pag, FuncPag, PagEdgeKind, PagLocalNode, PagNode, PagThisRefNode, InternalEdge, GLOBAL_THIS } from './Pag';
import { PtsSet } from './PtsDS';
import { STATIC_KEYWORD } from '../../core/common/TSConst';

const logger = Logger.getLogger(LOG_MODULE_TYPE.ARKANALYZER, 'PTA');

export class CSFuncID{
    public cid: ContextID;
    public funcID: FuncID;
    constructor(cid:ContextID, fid: FuncID ) {
        this.cid = cid;
        this.funcID = fid;
    }
}

export class PagBuilder {
    private pag: Pag;
    private cg: CallGraph;
    private funcPags: Map<FuncID, FuncPag>;
    private handledFunc: Set<string> = new Set()
    private ctx: KLimitedContextSensitive;
    private scene: Scene;
    private worklist: CSFuncID[] = [];
    private pagStat: PAGStat;
    // TODO: change string to hash value
    private staticField2UniqInstanceMap: Map<string, Value> = new Map();
    private instanceField2UniqInstanceMap: Map<[string, Value], Value> = new Map();
    private cid2ThisRefPtMap: Map<ContextID, NodeID> = new Map();
    private cid2ThisRefMap: Map<ContextID, NodeID> = new Map();
    private cid2ThisLocalMap: Map<ContextID, NodeID> = new Map();
    private sdkMethodReturnValueMap: Map<ArkMethod, Map<ContextID, ArkNewExpr>> = new Map();
    private funcHandledThisRound: Set<FuncID> = new Set();
    private updatedNodesThisRound: Map<NodeID, PtsSet<NodeID>> = new Map()
    private singletonFuncMap: Map<FuncID, boolean> = new Map();
    private globalThisValue?: Value;

    constructor(p: Pag, cg: CallGraph, s: Scene, kLimit: number) {
        this.pag = p;
        this.cg = cg;
        this.funcPags = new Map<FuncID, FuncPag>;
        this.ctx = new KLimitedContextSensitive(kLimit);
        this.scene = s;
        this.pagStat = new PAGStat();
    }

    private buildFuncPagAndAddToWorklist(cs: CSFuncID): CSFuncID {
        if (this.worklist.includes(cs)) {
            return cs;
        }

        this.buildFuncPag(cs.funcID);
        if (this.isSingletonFunction(cs.funcID)) {
            cs.cid= DUMMY_CID;
        }

        this.worklist.push(cs);
        return cs
    }

    private addToFuncHandledListThisRound(id: FuncID) {
        if (this.funcHandledThisRound.has(id)) {
            return;
        }

        this.funcHandledThisRound.add(id)
    }

    public buildForEntries(funcIDs: FuncID[]): void {
        this.worklist = [];
        funcIDs.forEach(funcID => {
            let cid = this.ctx.getNewContextID(funcID);
            let csFuncID = new CSFuncID(cid, funcID);
            this.buildFuncPagAndAddToWorklist(csFuncID)
        });

        this.handleReachable();
    }

    public handleReachable(): boolean {
        if (this.worklist.length == 0) {
            return false;
        }
        this.funcHandledThisRound.clear();

        while (this.worklist.length > 0) {
            let csFunc = this.worklist.shift() as CSFuncID;
            this.buildPagFromFuncPag(csFunc.funcID, csFunc.cid);
            this.addToFuncHandledListThisRound(csFunc.funcID);
        }

        return true;
    }

    public build(): void {
        for (let funcID of this.cg.getEntries()) {
            let cid = this.ctx.getNewContextID(funcID);
            let csFuncID =new CSFuncID(cid, funcID);
            this.buildFuncPagAndAddToWorklist(csFuncID);

            this.handleReachable();
        }
    }

    public buildFuncPag(funcID: FuncID): boolean {
        if (this.funcPags.has(funcID)) {
            return false;
        }

        let fpag = new FuncPag();

        let arkMethod = this.cg.getArkMethodByFuncID(funcID);
        if (arkMethod == null) {
            //throw new Error("function ID");
            return false;
        }
        
        let cfg = arkMethod.getCfg()
        if (!cfg) {
            return false
        }

        logger.trace(`[build FuncPag] ${arkMethod.getSignature().toString()}`)

        for (let stmt of cfg.getStmts()){
            if (stmt instanceof ArkAssignStmt) {
                // Add non-call edges
                let kind = this.getEdgeKindForAssignStmt(stmt);
                if (kind != PagEdgeKind.Unknown) {
                    fpag.addInternalEdge(stmt, kind);
                    continue;
                }

                // handle call
                let inkExpr = stmt.getInvokeExpr();
                if (inkExpr instanceof ArkStaticInvokeExpr) {
                    let cs = this.cg.getCallSiteByStmt(stmt);
                    if (cs) {
                        // direct call is already existing in CG
                        fpag.addNormalCallSite(cs);
                    } else {
                        throw new Error( 'Can not find static callsite');
                    }
                } else if (inkExpr instanceof ArkInstanceInvokeExpr) {
                    let ptcs = this.cg.getDynCallsiteByStmt(stmt);
                    if (ptcs) {
                        this.addToDynamicCallSite(fpag, ptcs);
                    }
                }
            } else if (stmt instanceof ArkInvokeStmt) {
                // TODO: discuss if we need a invokeStmt

                let cs = this.cg.getCallSiteByStmt(stmt);
                if (cs) {
                    // direct call or constructor call is already existing in CG
                    fpag.addNormalCallSite(cs);
                    continue;
                }

                let dycs = this.cg.getDynCallsiteByStmt(stmt);
                if (dycs) {
                    this.addToDynamicCallSite(fpag, dycs);
                } else {
                    throw new Error('Can not find callsite by stmt');
                }
            } else {
                // TODO: need handle other type of stmt?
            }
        }

        this.funcPags.set(funcID, fpag);
        this.pagStat.numTotalFunction++;
        return true;
    }

    public buildPagFromFuncPag(funcID: FuncID, cid: ContextID) {
        let funcPag = this.funcPags.get(funcID);
        if (funcPag == undefined) {
            //throw new Error("No Func PAG is found for #" + funcID);
            return;
        }
        if (this.handledFunc.has(`${cid}-${funcID}`)) {
            return;
        }

        this.addEdgesFromFuncPag(funcPag, cid);
        this.addCallsEdgesFromFuncPag(funcPag, cid);
        this.addDynamicCallSite(funcPag);
        this.handledFunc.add(`${cid}-${funcID}`)
    }

    /// Add Pag Nodes and Edges in function
    public addEdgesFromFuncPag(funcPag: FuncPag, cid: ContextID): boolean {
        let inEdges = funcPag.getInternalEdges();
        if (inEdges == undefined) {
            return false;
        }

        for (let e of inEdges) {
            let srcPagNode = this.getOrNewPagNode(cid, e.src, e.stmt);
            let dstPagNode = this.getOrNewPagNode(cid, e.dst, e.stmt);
            
            this.pag.addPagEdge(srcPagNode, dstPagNode, e.kind, e.stmt);

            // Take place of the real stmt for return
            if (dstPagNode.getStmt() instanceof ArkReturnStmt) {
                dstPagNode.setStmt(e.stmt);
            }
        }

        return true;
    }

    /// add Copy edges interprocedural
    public addCallsEdgesFromFuncPag(funcPag: FuncPag, cid: ContextID): boolean {
        for (let cs of funcPag.getNormalCallSites()) {
            let calleeCid = this.ctx.getOrNewContext(cid, cs.calleeFuncID, true);
            this.addStaticPagCallEdge(cs, cid, calleeCid);

            // Add edge to thisRef for special calls
            let calleeCGNode = this.cg.getNode(cs.calleeFuncID) as CallGraphNode;
            let ivkExpr = cs.callStmt.getInvokeExpr()
            if(calleeCGNode.getKind() == CallGraphNodeKind.constructor ||
                calleeCGNode.getKind() == CallGraphNodeKind.intrinsic) { 
                let callee = this.scene.getMethod(this.cg.getMethodByFuncID(cs.calleeFuncID)!)!
                if (ivkExpr instanceof ArkInstanceInvokeExpr) {
                    let baseNode = this.getOrNewPagNode(cid, ivkExpr.getBase())
                    let baseNodeID = baseNode.getID();
                    
                    this.addThisRefCallEdge(baseNodeID, cid, ivkExpr, callee, calleeCid, cs.callerFuncID);
                } else {
                    logger.error(`constructor or intrinsic func is static ${ivkExpr!.toString()}`)
                }
            }
        }

        return true;
    }

    public addDynamicCallSite(funcPag: FuncPag) {
        // add dyn callsite in funcpag to base node
        for (let cs of funcPag.getDynamicCallSites()) {
            let base = (cs.callStmt.getInvokeExpr()! as ArkInstanceInvokeExpr).getBase()
            // TODO: check base under different cid
            let baseNodeIDs = this.pag.getNodesByValue(base)
            if (!baseNodeIDs) {
                logger.warn(`[build dynamic call site] can not handle call site with base ${base.toString()}`)
                continue
            }
            for (let nodeID of baseNodeIDs!.values()) {
                let node = this.pag.getNode(nodeID)
                if (!(node instanceof PagLocalNode)) {
                    continue
                }

                node.addRelatedDynCallSite(cs)
            }
        }
    }

    public addDynamicCallEdge(cs: DynCallSite, baseClassPTNode: NodeID, cid: ContextID): NodeID[] {
        let srcNodes: NodeID[] = [];
        let ivkExpr = cs.callStmt.getInvokeExpr() as ArkInstanceInvokeExpr;
        let calleeName = ivkExpr.getMethodSignature().getMethodSubSignature().getMethodName();

        let ptNode = this.pag.getNode(baseClassPTNode);
        let value = (ptNode as PagNode).getValue();
        if (!(value instanceof ArkNewExpr || value instanceof ArkNewArrayExpr)) {
            return srcNodes;
        }

        let callee: ArkMethod | null = null;
        if (value instanceof ArkNewExpr) {
            // get class signature
            let clsSig = (value.getType() as ClassType).getClassSignature() as ClassSignature;
            let cls;

            cls = this.scene.getClass(clsSig) as ArkClass;

            while (!callee && cls) {
                callee = cls.getMethodWithName(calleeName);
                cls = cls.getSuperClass();
            }

            if (!callee) {
                callee = this.scene.getMethod(ivkExpr.getMethodSignature());
            }
        }

        // anonymous method
        if (!callee) {
            // try to change callee to param anonymous method
            // TODO: anonymous method param and return value pointer pass
            let args = cs.args
            if (args?.length == 1 && args[0].getType() instanceof FunctionType) {
                callee = this.scene.getMethod((args[0].getType() as FunctionType).getMethodSignature())
            }
        }

        if (!callee) {
            // while pts has {o_1, o_2} and invoke expr represents a method that only {o_1} has
            // return empty node when {o_2} come in
            return []
        }

        let dstCGNode = this.cg.getCallGraphNodeByMethod(callee.getSignature());
        let callerNode = this.cg.getNode(cs.callerFuncID) as CallGraphNode;
        if (!callerNode) {
            throw new Error("Can not get caller method node");
        }
        // update call graph
        // TODO: movo to cgbuilder
        this.cg.addDynamicCallEdge(callerNode.getID(), dstCGNode.getID(), cs.callStmt);
        if (!this.cg.detectReachable(dstCGNode.getID(), callerNode.getID())) {
            let calleeCid = this.ctx.getOrNewContext(cid, dstCGNode.getID(), true);
            let staticCS = new CallSite(cs.callStmt, cs.args, dstCGNode.getID(), cs.callerFuncID);
            let staticSrcNodes = this.addStaticPagCallEdge(staticCS, cid, calleeCid);
            srcNodes.push(...staticSrcNodes);

            // Pass base's pts to callee's this pointer
            if (!dstCGNode.getIsSdkMethod()) {
                let srcBaseNode = this.addThisRefCallEdge(baseClassPTNode, cid, ivkExpr, callee, calleeCid, cs.callerFuncID);
                srcNodes.push(srcBaseNode);
            }
        }

        return srcNodes;
    }

    public addUpdatedNode(nodeID: NodeID, diffPT: PtsSet<NodeID>) {
        let updatedNode = this.updatedNodesThisRound.get(nodeID) ?? new PtsSet()
        updatedNode.union(diffPT)
        this.updatedNodesThisRound.set(nodeID, updatedNode)
    }

    public getUpdatedNodes() {
        return this.updatedNodesThisRound
    }

    public resetUpdatedNodes() {
        this.updatedNodesThisRound.clear()
    }

    public handleUnkownDynamicCall(cs: DynCallSite, cid: ContextID): NodeID[] {
        let srcNodes: NodeID[] = [];
        let callerNode = this.cg.getNode(cs.callerFuncID) as CallGraphNode;
        let ivkExpr = cs.callStmt.getInvokeExpr() as AbstractInvokeExpr;
        logger.warn( "Handling unknown dyn call site : \n  " + callerNode.getMethod().toString() 
            + '\n  --> ' + ivkExpr.toString() + '\n  CID: ' + cid );

        let callees: ArkMethod[] = []
        let callee: ArkMethod | null = null;
        callee = this.scene.getMethod(ivkExpr.getMethodSignature());
        if (!callee) {
            cs.args?.forEach(arg => {
                if (arg.getType() instanceof FunctionType) {
                    callee = this.scene.getMethod((arg.getType() as FunctionType).getMethodSignature())
                    if (callee) {
                        callees.push(callee);
                    }
                }
            })
        } else {
            callees.push(callee);
        }

        if (callees.length == 0) {
            return srcNodes;
        }

        callees.forEach(callee => {
            let dstCGNode = this.cg.getCallGraphNodeByMethod(callee.getSignature());
            if (!callerNode) {
                throw new Error("Can not get caller method node");
            }
            logger.warn(`\tAdd call edge of unknown call ${callee.getSignature().toString()}`)
            this.cg.addDynamicCallEdge(callerNode.getID(), dstCGNode.getID(), cs.callStmt);
            if (!this.cg.detectReachable(dstCGNode.getID(), callerNode.getID())) {
                let calleeCid = this.ctx.getOrNewContext(cid, dstCGNode.getID(), true);
                let staticCS = new CallSite(cs.callStmt, cs.args, dstCGNode.getID(), cs.callerFuncID);
                let staticSrcNodes = this.addStaticPagCallEdge(staticCS, cid, calleeCid);
                srcNodes.push(...staticSrcNodes);
            }
        })
        return srcNodes;
    }

    public handleUnprocessedCallSites(processedCallSites: Set<DynCallSite>) {
        for (let funcID of this.funcHandledThisRound) {
            let funcPag = this.funcPags.get(funcID)
            if (!funcPag) {
                logger.error(`can not find funcPag of handled func ${funcID}`)
                continue
            }
            let callSites = funcPag.getDynamicCallSites()

            const diffCallSites = new Set(Array.from(callSites).filter(item => !processedCallSites.has(item)))
            diffCallSites.forEach((cs) => {
                let ivkExpr = cs.callStmt.getInvokeExpr() as ArkInstanceInvokeExpr;
                // Get local of base class
                let base = ivkExpr.getBase();
                // TODO: remove this after multiple this local fixed
                base = this.getRealThisLocal(base, cs.callerFuncID)
                // Get PAG nodes for this base's local
                let ctx2NdMap = this.pag.getNodesByValue(base);
                if (ctx2NdMap) {
                    for (let [cid] of ctx2NdMap.entries()) {
                        this.handleUnkownDynamicCall(cs, cid);
                    }
                }
            })
        }
    }

    private addThisRefCallEdge(baseClassPTNode: NodeID, cid: ContextID,
        ivkExpr: ArkInstanceInvokeExpr, callee: ArkMethod, calleeCid: ContextID, callerFunID: FuncID): NodeID {
        //let thisPtr = callee.getThisInstance();

        if(!callee || !callee.getCfg()) {
            console.log("callee is null")
            return -1;
        }
        let thisAssignStmt = callee.getCfg()?.getStmts().filter(s =>
            s instanceof ArkAssignStmt && s.getRightOp() instanceof ArkThisRef);
        let thisPtr = (thisAssignStmt?.at(0) as ArkAssignStmt).getRightOp() as ArkThisRef;
        if (!thisPtr) {
            throw new Error('Can not get this ptr');
        }

        // IMPORTANT: set cid 2 base Pt info firstly
        this.cid2ThisRefPtMap.set(calleeCid, baseClassPTNode);
        let thisRefNode = this.getOrNewThisRefNode(calleeCid, thisPtr) as PagThisRefNode;
        thisRefNode.addPTNode(baseClassPTNode);
        let srcBaseLocal = ivkExpr.getBase();
        srcBaseLocal = this.getRealThisLocal(srcBaseLocal, callerFunID);
        let srcNodeId = this.pag.hasCtxNode(cid, srcBaseLocal);
        if (!srcNodeId) {
            throw new Error('Can not get base node');
        }

        this.pag.addPagEdge(this.pag.getNode(srcNodeId) as PagNode, thisRefNode, PagEdgeKind.This);
        return srcNodeId;
    }

    /*
     * Add copy edges from arguments to parameters
     *     ret edges from return values to callsite
     * Return src node
     */
    public addStaticPagCallEdge(cs: CallSite, callerCid: ContextID, calleeCid?: ContextID): NodeID[] {
        if(!calleeCid) {
            calleeCid = this.ctx.getOrNewContext(callerCid, cs.calleeFuncID, true);
        }

        let srcNodes: NodeID[] = []
        // Add reachable

        let calleeNode = this.cg.getNode(cs.calleeFuncID) as CallGraphNode;
        let calleeMethod: ArkMethod | null = this.scene.getMethod(calleeNode.getMethod());
        if (!calleeMethod) {
            // TODO: check if nodes need to delete
            // this.cg.removeCallGraphNode(cs.calleeFuncID)
            return srcNodes;
        }
        if (calleeNode.getIsSdkMethod()) {
            let returnType = calleeMethod.getReturnType()
            // TODO: add new array type
            if (!(returnType instanceof ClassType) || !(cs.callStmt instanceof ArkAssignStmt)) {
                return srcNodes
            }

            // check fake heap object exists or not
            let cidMap = this.sdkMethodReturnValueMap.get(calleeMethod)
            if (!cidMap) {
                cidMap = new Map()
            }
            let newExpr = cidMap.get(calleeCid)
            if (!newExpr) {
                if (returnType instanceof ClassType) {
                    newExpr = new ArkNewExpr(returnType)
                }
                // } else if (returnType instanceof ArrayType) {
                    // TODO: check how to transform array type 2 newArrayExpr
                    // newExpr = new ArkNewArrayExpr(returnType.getBaseType(), )
                // }
            }
            cidMap.set(calleeCid, newExpr!)
            this.sdkMethodReturnValueMap.set(calleeMethod, cidMap)

            let srcPagNode = this.getOrNewPagNode(calleeCid, newExpr!)
            let dstPagNode = this.getOrNewPagNode(callerCid, cs.callStmt.getLeftOp(), cs.callStmt);

            this.pag.addPagEdge(srcPagNode, dstPagNode, PagEdgeKind.Address, cs.callStmt);
            return srcNodes
        }

        if (!calleeMethod.getCfg()) {
            // method have no cfg body
            return srcNodes;
        }

        let calleeCS = this.buildFuncPagAndAddToWorklist(new CSFuncID(calleeCid, cs.calleeFuncID));
        // callee cid will updated if callee is singleton
        calleeCid = calleeCS.cid

        // TODO: getParameterInstances's performance is not good. Need to refactor 
        //let params = calleeMethod.getParameterInstances();
        let params = calleeMethod.getCfg()!.getStmts()
            .filter(stmt => stmt instanceof ArkAssignStmt && stmt.getRightOp() instanceof ArkParameterRef)
            .map(stmt => (stmt as ArkAssignStmt).getRightOp());
        let argNum = cs.args?.length;

        if (argNum) {
            // add args to parameters edges
            for (let i = 0; i < argNum; i++) {
                let arg = cs.args?.at(i);
                let param = params.at(i);
                // TODO: param type should be ArkParameterRef?
                //if (arg && param && param instanceof ArkParameterRef) {
                if (arg && param) {
                    if (arg instanceof Constant) {
                        continue
                    }
                    if ( arg instanceof AbstractExpr) {
                        // TODO: handle this
                        continue;
                    }
                    // Get or create new PAG node for argument and parameter
                    let srcPagNode = this.getOrNewPagNode(callerCid, arg, cs.callStmt);
                    let dstPagNode = this.getOrNewPagNode(calleeCid, param, cs.callStmt);

                    this.pag.addPagEdge(srcPagNode, dstPagNode, PagEdgeKind.Copy, cs.callStmt);
                    srcNodes.push(srcPagNode.getID());
                }
                // TODO: handle other types of parmeters
            }
        }

        // add ret to caller edges
        let retStmts = calleeMethod.getReturnStmt();
        // TODO: call statement must be a assignment state
        if (cs.callStmt instanceof ArkAssignStmt) {
            let retDst = cs.callStmt.getLeftOp();
            for (let retStmt of retStmts) {
                let retValue = (retStmt as ArkReturnStmt).getOp();
                if (retValue instanceof Local) {
                    let srcPagNode = this.getOrNewPagNode(calleeCid, retValue, retStmt);
                    let dstPagNode = this.getOrNewPagNode(callerCid, retDst, cs.callStmt);

                    this.pag.addPagEdge(srcPagNode, dstPagNode, PagEdgeKind.Copy, retStmt);
                } else if (retValue instanceof Constant){
                    continue;
                } else if (retValue instanceof AbstractExpr){
                    console.log(retValue)
                    continue;
                } else {
                    throw new Error ('return dst not a local or constant, but: ' + retValue.getType().toString())
                }
            }
        }

        return srcNodes;
    }

    public getOrNewPagNode(cid: ContextID, v: Value, s?: Stmt): PagNode {
        if (v instanceof ArkThisRef) {
            return this.getOrNewThisRefNode(cid, v as ArkThisRef);
        } 

        // this local is also not uniq!!!
        // remove below block once this issue fixed

        // globalThis process can not be removed while all `globalThis` ref is the same Value
        if (v instanceof Local) {
            if (v.getName() == "this") {
                return this.getOrNewThisLoalNode(cid, v as Local, s);
            } else if (v.getName() == GLOBAL_THIS && v.getDeclaringStmt() == null) {
                // globalThis node has no cid
                return this.getOrNewGlobalThisNode(0)
            }
        }

        v = this.getRealInstanceRef(v);
        return this.pag.getOrNewNode(cid, v, s);
    }

    /**
     * return ThisRef PAG node according to cid, a cid has a unique ThisRef node
     * @param cid: current contextID
     */
    public getOrNewThisRefNode(cid: ContextID, v: ArkThisRef): PagNode {
        let thisRefNodeID = this.cid2ThisRefMap.get(cid)
        if (!thisRefNodeID) {
            thisRefNodeID = -1;
        }

        let thisRefNode = this.pag.getOrNewThisRefNode(thisRefNodeID, v)
        this.cid2ThisRefMap.set(cid, thisRefNode.getID())
        return thisRefNode
    }

    // TODO: remove it once this local not uniq issue is fixed
    public getOrNewThisLoalNode(cid: ContextID, v: Local, s?: Stmt): PagNode {
        let thisLocalNodeID = this.cid2ThisLocalMap.get(cid)
        if (thisLocalNodeID) {
            return this.pag.getNode(thisLocalNodeID) as PagNode;
        }

        let thisNode = this.pag.getOrNewNode(cid, v, s);
        this.cid2ThisLocalMap.set(cid, thisNode.getID());
        return thisNode;
    }

    public getOrNewGlobalThisNode(cid: ContextID): PagNode {
        return this.pag.getOrNewNode(cid, this.getGlobalThisValue());
    }

    public getUniqThisLocalNode(cid: ContextID): NodeID | undefined{
        return this.cid2ThisLocalMap.get(cid);
    }

    /*
     * In ArkIR, ArkField has multiple instances for each stmt which use it
     * But the unique one is needed for pointer analysis
     * This is a temp solution to use a ArkField->(first instance) 
     *  as the unique instance
     * 
     * node merge condition:
     * instance field: value and ArkField
     * static field: ArkField
     */
    public getRealInstanceRef(v: Value): Value {
        if (!(v instanceof ArkInstanceFieldRef || v instanceof ArkStaticFieldRef)) {
            return v;
        }

        let sig = v.getFieldSignature();
        let sigStr = sig.toString()
        let base: Value;
        let real: Value | undefined;

        if (v instanceof ArkInstanceFieldRef) {
            base = (v as ArkInstanceFieldRef).getBase()
            if (base instanceof Local && base.getName() == GLOBAL_THIS && base.getDeclaringStmt() == null) {
                // replace the base in fieldRef
                base = this.getGlobalThisValue();
                (v as ArkInstanceFieldRef).setBase(base as Local)
            }

            real = this.instanceField2UniqInstanceMap.get([sigStr, base!]);
            if (!real) {
                this.instanceField2UniqInstanceMap.set([sigStr, base!], v);
                real = v;
            }
        } else {
            real = this.staticField2UniqInstanceMap.get(sigStr);
            if (!real) {
                this.staticField2UniqInstanceMap.set(sigStr, v);
                real = v;
            }
        } 
        return real;
    }

    /**
     * check if a method is singleton function
     * rule: static method, assign heap obj to global var or static field, return the receiver
     */
    public isSingletonFunction(funcID: FuncID): boolean {
        if (this.singletonFuncMap.has(funcID)) {
            return this.singletonFuncMap.get(funcID)!;
        }

        let arkMethod = this.cg.getArkMethodByFuncID(funcID);
        if (!arkMethod) {
            this.singletonFuncMap.set(funcID, false);
            return false;
        }

        if (!arkMethod.getModifiers().has(STATIC_KEYWORD)) {
            this.singletonFuncMap.set(funcID, false);
            return false;
        }

        let funcPag = this.funcPags.get(funcID)!;
        let heapObjects = [...funcPag.getInternalEdges()!]
            .filter(edge => edge.kind == PagEdgeKind.Address)
            .map(edge => edge.dst);

        let returnValues = arkMethod.getReturnValues();

        let result = this.isValueConnected([...funcPag.getInternalEdges()!], heapObjects, returnValues);
        this.singletonFuncMap.set(funcID, result);
        if (result) {
            logger.info(`function ${funcID} is marked as singleton function`);
        }
        return result;
    }

    private isValueConnected(edges: InternalEdge[], leftNodes: Value[], targetNodes: Value[]): boolean {
        // build funcPag graph
        const graph = new Map<Value, Value[]>();
        let hasStaticFieldOrGlobalVar: boolean = false;
    
        for (const edge of edges) {
            let dst = this.getRealInstanceRef(edge.dst);
            let src = this.getRealInstanceRef(edge.src);
            if (!graph.has(dst)) {
                graph.set(dst, []);
            }
            if (!graph.has(src)) {
                graph.set(src, []);
            }

            if (dst instanceof ArkStaticFieldRef || src instanceof ArkStaticFieldRef) {
                hasStaticFieldOrGlobalVar = true;
            }

            graph.get(src)!.push(dst);
        }

        if (!hasStaticFieldOrGlobalVar) {
            return false;
        }

        for (const targetNode of targetNodes) {
            for (const leftNode of leftNodes) {
                const visited = new Set<Value>();
                let meetStaticField = false;
                if (this.funcPagDfs(graph, visited, leftNode, targetNode, meetStaticField)) {
                    return true; // a value pair that satisfy condition
                }

                if (!meetStaticField) {
                    break; // heap obj will not deal any more
                }
            }
        }

        return false;
    }

    private funcPagDfs(graph: Map<Value, Value[]>, visited: Set<Value>, currentNode: Value, targetNode: Value, 
        staticFieldFound: boolean): boolean {
        if (currentNode === targetNode) {
            return staticFieldFound;
        }
    
        visited.add(currentNode);
    
        for (const neighbor of graph.get(currentNode) || []) {
            // TODO: add global variable
            const isSpecialNode = neighbor instanceof ArkStaticFieldRef;

            if (!visited.has(neighbor)) {
                if (isSpecialNode) {
                    staticFieldFound = true;
                }

                if (this.funcPagDfs(graph, visited, neighbor, targetNode, staticFieldFound)) {
                    return true;
                }
            }
        }

        return false;
    }

    public getGlobalThisValue(): Value {
        return this.globalThisValue ?? new Local(GLOBAL_THIS);
    }

    private getEdgeKindForAssignStmt(stmt: ArkAssignStmt): PagEdgeKind {
        if (this.stmtIsCreateAddressObj(stmt)) {
            return PagEdgeKind.Address;
        }

        if (this.stmtIsCopyKind(stmt)) {
            return PagEdgeKind.Copy;
        }

        if (this.stmtIsReadKind(stmt)) {
            return PagEdgeKind.Load;
        }

        if (this.stmtIsWriteKind(stmt)) {
            return PagEdgeKind.Write;
        }

        return PagEdgeKind.Unknown;
    }

    /**\
     * ArkNewExpr, ArkNewArrayExpr, function ptr, globalThis
     */
    private stmtIsCreateAddressObj(stmt: ArkAssignStmt): boolean {
        let lhOp = stmt.getLeftOp();
        let rhOp = stmt.getRightOp();
        if ((rhOp instanceof ArkNewExpr || rhOp instanceof ArkNewArrayExpr) || 
            (lhOp instanceof Local && rhOp instanceof Local && 
            rhOp.getType() instanceof FunctionType && 
            rhOp.getDeclaringStmt() === null || 
            (rhOp instanceof Local && rhOp.getName() == GLOBAL_THIS && rhOp.getDeclaringStmt() == null))
        ) {
            return true;
        }

        // TODO: add other Address Obj creation
        // like static object
        return false;
    }

    private stmtIsCopyKind(stmt: ArkAssignStmt): boolean {
        let lhOp = stmt.getLeftOp();
        let rhOp = stmt.getRightOp();

        let condition: boolean = 
            (lhOp instanceof Local && (
                rhOp instanceof Local || rhOp instanceof ArkParameterRef || 
                rhOp instanceof ArkThisRef || rhOp instanceof ArkStaticFieldRef)) || 
            (lhOp instanceof ArkStaticFieldRef && rhOp instanceof Local)

        if (condition) {
            return true;
        }
        return false;
    }

    private stmtIsWriteKind(stmt: ArkAssignStmt): boolean {
        let lhOp = stmt.getLeftOp();
        let rhOp = stmt.getRightOp();

        if (rhOp instanceof Local && 
            (lhOp instanceof ArkInstanceFieldRef || lhOp instanceof ArkArrayRef)) {
            return true;
        }
        return false;
    }

    private stmtIsReadKind(stmt: ArkAssignStmt): boolean {
        let lhOp = stmt.getLeftOp();
        let rhOp = stmt.getRightOp();

        if (lhOp instanceof Local && 
            (rhOp instanceof ArkInstanceFieldRef || rhOp instanceof ArkArrayRef)) {
            return true;
        }
        return false;
    }

    public addToDynamicCallSite(funcPag: FuncPag, cs: DynCallSite): void {
        funcPag.addDynamicCallSite(cs);
        this.pagStat.numDynamicCall++;

        logger.trace("[add dynamic callsite] "+cs.callStmt.toString()+":  "+cs.callStmt.getCfg()?.getDeclaringMethod().getSignature().toString());
    }

    public setPtForNode(node: NodeID, pts: PtsSet<NodeID> | undefined): void {
        if (!pts) {
            return;
        }

        (this.pag.getNode(node) as PagNode).setPointTo(pts.getProtoPtsSet());
    }

    public getRealThisLocal(input: Local, funcId: FuncID): Local {
        if (input.getName() != 'this')
            return input;
        let real = input;

        let f = this.cg.getArkMethodByFuncID(funcId);
        f?.getCfg()?.getStmts().forEach(s => {
            if (s instanceof ArkAssignStmt && s.getLeftOp() instanceof Local) {
                if ((s.getLeftOp() as Local).getName() === 'this') {
                    real = s.getLeftOp() as Local;
                    return;
                }
            }
        })
        return real;
    }

    public doStat(): void {
        this.pagStat.numTotalNode = this.pag.getNodeNum();
    }

    public printStat(): void {
        this.pagStat.printStat();
    }

    public getUnhandledFuncs(): FuncID[] {
        let handledFuncs = this.getHandledFuncs();
        let unhandleFuncs = Array.from(this.cg.getNodesIter())
            .filter(f => !handledFuncs.includes(f.getID()))
            .map(f => f.getID());
        return unhandleFuncs;
    }

    public getHandledFuncs(): FuncID[] {
        return Array.from(this.funcPags.keys());
    }

}
