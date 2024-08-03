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

import { CallGraph, FuncID, CallGraphNode, CallSite, DynCallSite } from '../CallGraph';
import { Pag, FuncPag, PagNode, PagEdgeKind, PagThisRefNode } from '../Pag'
import { Scene } from '../../../Scene'
import { Stmt, ArkAssignStmt, ArkReturnStmt, ArkInvokeStmt } from '../../base/Stmt'
import { ArkInstanceInvokeExpr, ArkNewExpr, ArkStaticInvokeExpr } from '../../base/Expr';
import { KLimitedContextSensitive } from '../../pta/Context';
import { ArkInstanceFieldRef, ArkParameterRef, ArkStaticFieldRef, ArkThisRef } from '../../base/Ref';
import { Value } from '../../base/Value';
import { ContextID } from '../../pta/Context';
import { ArkMethod } from '../../model/ArkMethod';
import Logger from "../../../utils/logger";
import { Local } from '../../base/Local';
import { NodeID } from '../BaseGraph';
import { ClassSignature } from '../../model/ArkSignature';
import { ArkClass } from '../../model/ArkClass';
import { ClassType } from '../../base/Type';
import { ArkField } from '../../model/ArkField';
import { Constant } from '../../base/Constant';
import { PtsSet } from '../../pta/PtsDS';

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
    private staticField2UniqInstanceMap: Map<string, Value> = new Map();
    private instanceField2UniqInstanceMap: Map<[string, Value], Value> = new Map();
    private dynamicCallSites: Set<DynCallSite>;
    private cid2ThisRefPtMap: Map<ContextID, NodeID> = new Map();
    private cid2ThisRefMap: Map<ContextID, NodeID> = new Map();
    private sdkMethodReturnValueMap: Map<ArkMethod, Map<ContextID, ArkNewExpr>> = new Map()

    constructor(p: Pag, cg: CallGraph, s: Scene, kLimit: number) {
        this.pag = p;
        this.cg = cg;
        this.funcPags = new Map<FuncID, FuncPag>;
        this.ctx = new KLimitedContextSensitive(kLimit);
        this.scene = s;
    }

    public buildForEntries(funcIDs: FuncID[]): void {
        this.worklist = [];
        funcIDs.forEach(funcID => {
            let cid = this.ctx.getNewContextID(funcID);
            let csFuncID = new CSFuncID(cid, funcID);
            this.worklist.push(csFuncID)
        });

        this.handleReachable();
    }

    public handleReachable(): boolean {
        if (this.worklist.length == 0) {
            return false;
        }

        while (this.worklist.length > 0) {
            let csFunc = this.worklist.shift() as CSFuncID;
            this.buildFunPag(csFunc.funcID);
            this.buildPagFromFuncPag(csFunc.funcID, csFunc.cid);
        }

        return true;
    }

    public build(): void {
        for (let funcID of this.cg.getEntries()) {
            let cid = this.ctx.getNewContextID(funcID);
            let csFuncID =new CSFuncID(cid, funcID);
            this.worklist.push(csFuncID);

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

        for (let stmt of cfg.getStmts()){
            logger.debug('building FunPAG - handle stmt: ' + stmt.toString());
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
                        this.addToDynamicCallSite(ptcs);
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
                    this.addToDynamicCallSite(dycs);
                } else {
                    throw new Error('Can not find callsite by stmt');
                }

                // DUPILICATE code!!
                /*
                let inkExpr = stmt.getInvokeExpr();
                if (inkExpr instanceof ArkStaticInvokeExpr) {
                    let cs = this.cg.getCallSiteByStmt(stmt);
                    if (cs) {
                        // direct call is already existing in CG
                        fpag.addNormalCallSite(cs);
                    } else {
                        throw new Error('Can not find callsite by stmt');
                    }
                } else if (inkExpr instanceof ArkInstanceInvokeExpr) {
                    let ptcs = this.cg.getDynCallsiteByStmt(stmt);
                    if (ptcs) {
                        this.pag.addToDynamicCallSite(ptcs);
                    }
                }
                    */

            } else {
                // TODO: need handle other type of stmt?
            }
        }

        this.funcPags.set(funcID, fpag);
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
            this.addStaticPagCallEdge(cs, cid);
        }

        return true;
    }

    public addDynamicCallEdge(cs: DynCallSite, baseClassPTNode: NodeID, cid: ContextID): NodeID[] {
        let srcNodes: NodeID[] = [];
        let ivkExpr = cs.callStmt.getInvokeExpr() as ArkInstanceInvokeExpr;
        let calleeName = ivkExpr.getMethodSignature().getMethodSubSignature().getMethodName();

        let ptNode = this.pag.getNode(baseClassPTNode);
        let value = (ptNode as PagNode).getValue();
        if (value instanceof ArkNewExpr) {
            // get class signature
            let clsSig = (value.getType() as ClassType).getClassSignature() as ClassSignature;
            let cls;

            cls = this.scene.getClass(clsSig) as ArkClass;

            let callee = undefined;
            while (!callee) {
                callee = cls.getMethodWithName(calleeName);
                cls = cls.getSuperClass();
            }

            if (!callee) {
                // while pts has {o_1, o_2} and invoke expr represents a method that only {o_1} has
                // return empty node when {o_2} come in
                return []
            }

            let dstCGNode = this.cg.getCallGraphNodeByMethod(callee.getSignature());

            let callerNode = this.cg.getNode(cs.callerFuncID);
            if (!callerNode) {
                throw new Error("Can not get caller method node");
            }
            let calleeCid = this.ctx.getOrNewContext(cid, dstCGNode.getID());
            let staticCS = new CallSite(cs.callStmt,cs.args, dstCGNode.getID());
            let staticSrcNodes = this.addStaticPagCallEdge(staticCS, cid, calleeCid);
            this.cg.addDynamicCallEdge(callerNode.getID(), dstCGNode.getID(), cs.callStmt);
            srcNodes.push(...staticSrcNodes);

            // Pass base's pts to callee's this pointer
            let srcBaseNode = this.addThisRefCallEdge(baseClassPTNode, cid, ivkExpr, callee, calleeCid);
            srcNodes.push(srcBaseNode);
        }
        return srcNodes;
    }

    private addThisRefCallEdge(baseClassPTNode: NodeID, cid: ContextID,
        ivkExpr: ArkInstanceInvokeExpr, callee: ArkMethod, calleeCid: ContextID): NodeID {
        //let thisPtr = callee.getThisInstance();
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
            calleeCid = this.ctx.getOrNewContext(callerCid, cs.calleeFuncID);
        }

        let srcNodes: NodeID[] = []
        // Add reachable

        let calleeNode = this.cg.getNode(cs.calleeFuncID) as CallGraphNode;
        let calleeMethod: ArkMethod | null = this.scene.getMethod(calleeNode.getMethod());
        if (!calleeMethod || !calleeMethod.getCfg()) {
            // TODO: check if nodes need to delete
            // this.cg.removeCallGraphNode(cs.calleeFuncID)
            return srcNodes;
        }
        const isSdkMethod: boolean = this.scene.getSdkArkFilesMap().has(
            calleeMethod.getDeclaringArkFile().getFileSignature().toString()
        )
        if (isSdkMethod) {
            let returnType = calleeMethod.getReturnType()
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
                newExpr = new ArkNewExpr(returnType as ClassType)
            }
            cidMap.set(calleeCid, newExpr)
            this.sdkMethodReturnValueMap.set(calleeMethod, cidMap)

            let srcPagNode = this.getOrNewPagNode(calleeCid, newExpr)
            let dstPagNode = this.getOrNewPagNode(callerCid, cs.callStmt.getLeftOp(), cs.callStmt);

            this.pag.addPagEdge(srcPagNode, dstPagNode, PagEdgeKind.Address, cs.callStmt);
            return srcNodes
        }

        if (!calleeMethod.getCfg()) {
            // method have no cfg body
            return srcNodes;
        }
        this.worklist.push(new CSFuncID(calleeCid, cs.calleeFuncID));

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
                } else {
                    throw new Error ('return dst not a local')
                }
            }
        }

        return srcNodes;
    }

    public getOrNewPagNode(cid: ContextID, v: Value, s?: Stmt): PagNode {
        if (v instanceof ArkThisRef) {
            return this.getOrNewThisRefNode(cid, v as ArkThisRef);
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
        let rhOp = stmt.getRightOp();
        if (rhOp instanceof ArkNewExpr) {
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
    
    public addToDynamicCallSite(cs: DynCallSite): void {
        this.dynamicCallSites = this.dynamicCallSites ?? new Set();
        this.dynamicCallSites.add(cs);
    }

    public getDynamicCallSites(): Set<DynCallSite> {
        let tempSet = new Set(this.dynamicCallSites);
        this.clearDynamicCallSiteSet()
        return tempSet
    }

    public clearDynamicCallSiteSet() {
        if (this.dynamicCallSites) {
            this.dynamicCallSites.clear();
        }
    }

    public setPtForNode(node: NodeID, pts: PtsSet<NodeID> | undefined): void {
        if (!pts) {
            return;
        }

        (this.pag.getNode(node) as PagNode).setPointTo(pts.getProtoPtsSet());
    }

}
