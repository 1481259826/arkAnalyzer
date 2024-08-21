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
import { ArkInstanceFieldRef, ArkParameterRef, ArkStaticFieldRef, ArkThisRef } from '../../core/base/Ref';
import { Value } from '../../core/base/Value';
import { ArkMethod } from '../../core/model/ArkMethod';
import Logger from "../../utils/logger";
import { Local } from '../../core/base/Local';
import { NodeID } from '../model/BaseGraph';
import { ClassSignature } from '../../core/model/ArkSignature';
import { ArkClass } from '../../core/model/ArkClass';
import { ArrayType, ClassType, FunctionType } from '../../core/base/Type';
import { Constant } from '../../core/base/Constant';
import { PtsSet } from './PtsDS';
import { ContextID, KLimitedContextSensitive } from './Context';
import { Pag, FuncPag, PagEdgeKind, PagNode, PagThisRefNode } from './Pag';
import { PAGStat } from '../common/Statistics';

const logger = Logger.getLogger();

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
    private dynamicCallSitesMap: Map<FuncID, Set<DynCallSite>> = new Map();
    private cid2ThisRefPtMap: Map<ContextID, NodeID> = new Map();
    private cid2ThisRefMap: Map<ContextID, NodeID> = new Map();
    private cid2ThisLocalMap: Map<ContextID, NodeID> = new Map();
    private sdkMethodReturnValueMap: Map<ArkMethod, Map<ContextID, ArkNewExpr>> = new Map();
    private funcHandledThisRound: Set<FuncID> = new Set();

    constructor(p: Pag, cg: CallGraph, s: Scene, kLimit: number) {
        this.pag = p;
        this.cg = cg;
        this.funcPags = new Map<FuncID, FuncPag>;
        this.ctx = new KLimitedContextSensitive(kLimit);
        this.scene = s;
        this.pagStat = new PAGStat();
    }

    private addToWorklist(id: CSFuncID) {
        if (this.worklist.includes(id)) {
            return;
        }

        this.worklist.push(id);
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
            this.addToWorklist(csFuncID)
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
            this.buildFunPag(csFunc.funcID);
            this.buildPagFromFuncPag(csFunc.funcID, csFunc.cid);
            this.addToFuncHandledListThisRound(csFunc.funcID);
        }

        return true;
    }

    public build(): void {
        for (let funcID of this.cg.getEntries()) {
            let cid = this.ctx.getNewContextID(funcID);
            let csFuncID =new CSFuncID(cid, funcID);
            this.addToWorklist(csFuncID);

            this.handleReachable();
        }
    }

    public buildFunPag(funcID: FuncID): boolean {
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
                        this.addToDynamicCallSite(funcID, ptcs);
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
                    this.addToDynamicCallSite(funcID, dycs);
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
        if (funcPag.getNormalCallSites() == undefined) {
            return false;
        }

        for (let cs of funcPag.getNormalCallSites()) {
            let calleeCid = this.ctx.getOrNewContext(cid, cs.calleeFuncID, true);
            this.addStaticPagCallEdge(cs, cid, calleeCid);

            // Add edge to thisRef for special calls
            let calleeCGNode = this.cg.getNode(cs.calleeFuncID) as CallGraphNode;
            let ivkExpr = cs.callStmt.getInvokeExpr() as ArkInstanceInvokeExpr
            if(calleeCGNode.getKind() == CallGraphNodeKind.constructor ||
                calleeCGNode.getKind() == CallGraphNodeKind.intrinsic) { 
                let callee = this.scene.getMethod(this.cg.getMethodByFuncID(cs.calleeFuncID)!)!
                let baseNode = this.getOrNewPagNode(cid, ivkExpr.getBase())
                let baseNodeID = baseNode.getID();
                // baseNode.getIncomingEdge().forEach(e => {
                //     if(e.getKind() == PagEdgeKind.Address)
                //         baseNodeID = e.getSrcNode().getID()
                // })
                // if (!baseNodeID) {
                //     throw new Error()
                // }
                
                this.addThisRefCallEdge(baseNodeID, cid, ivkExpr, callee, calleeCid, cs.callerFuncID);
            }
        }

        return true;
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

    public handleUnkownDynamicCall(cs: DynCallSite, cid: ContextID): NodeID[] {
        let srcNodes: NodeID[] = [];
        let callerNode = this.cg.getNode(cs.callerFuncID) as CallGraphNode;
        let ivkExpr = cs.callStmt.getInvokeExpr() as AbstractInvokeExpr;
        logger.warn( "Handling unknown dyn call : \n  " + callerNode.getMethod().toString() 
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
        this.addToWorklist(new CSFuncID(calleeCid, cs.calleeFuncID));

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
        if (v instanceof Local && v.getName() === 'this') {
            return this.getOrNewThisLoalNode(cid, v as Local, s);

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
        let base: Value

        if (!sig.isStatic()) {
            base = (v as ArkInstanceFieldRef).getBase()
        }
        let real
        if (sig.isStatic()) {
            real = this.staticField2UniqInstanceMap.get(sigStr);
            if (!real) {
                this.staticField2UniqInstanceMap.set(sigStr, v);
                real = v;
            }
        } else {
            real = this.instanceField2UniqInstanceMap.get([sigStr, base!]);
            if (!real) {
                this.instanceField2UniqInstanceMap.set([sigStr, base!], v);
                real = v;
            }
        }

        return real;
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
            return PagEdgeKind.Write
        }

        return PagEdgeKind.Unknown;
    }

    private stmtIsCreateAddressObj(stmt: ArkAssignStmt): boolean {
        let lhOp = stmt.getLeftOp();
        let rhOp = stmt.getRightOp();
        if ((rhOp instanceof ArkNewExpr || rhOp instanceof ArkNewArrayExpr) || (
                lhOp instanceof Local && rhOp instanceof Local && 
                rhOp.getType() instanceof FunctionType && 
                rhOp.getDeclaringStmt() === null)
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
            (lhOp instanceof ArkInstanceFieldRef)) {
            return true;
        }
        return false;
    }

    private stmtIsReadKind(stmt: ArkAssignStmt): boolean {
        let lhOp = stmt.getLeftOp();
        let rhOp = stmt.getRightOp();

        if (lhOp instanceof Local && 
            (rhOp instanceof ArkInstanceFieldRef)) {
            return true;
        }
        return false;
    }
    
    public addToDynamicCallSite(funcId: FuncID, cs: DynCallSite): void {
        this.dynamicCallSitesMap = this.dynamicCallSitesMap ?? new Map();
        let csSet: Set<DynCallSite>;
        if (this.dynamicCallSitesMap.has(funcId)) {
            csSet = this.dynamicCallSitesMap.get(funcId)!;
        } else {
            csSet = new Set();
            this.dynamicCallSitesMap.set(funcId, csSet);
        }
        csSet.add(cs);
        this.pagStat.numDynamicCall++;

        logger.trace("[add dynamic callsite] "+cs.callStmt.toString()+":  "+cs.callStmt.getCfg()?.getDeclaringMethod().getSignature().toString())
    }

    public getDynamicCallSites(): Set<DynCallSite> {
        let tempSet = new Set<DynCallSite>();
        for(let funcId of this.funcHandledThisRound) {
            this.dynamicCallSitesMap.get(funcId)?.forEach(s => {
                if(tempSet.has(s)) {
                    return;
                }
                tempSet.add(s);
            });
        }

        return tempSet
    }

    public clearDynamicCallSiteSet() {
        if (this.dynamicCallSitesMap) {
            this.dynamicCallSitesMap.clear();
        }
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
}
