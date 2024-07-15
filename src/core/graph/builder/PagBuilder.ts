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

import { CallGraph, FuncID, CallGraphNode } from '../CallGraph';
import { Pag, FuncPag, PagNode, PagEdgeKind } from '../Pag'
import { Scene } from '../../../Scene'
import { Stmt, ArkAssignStmt, ArkReturnStmt, ArkInvokeStmt } from '../../base/Stmt'
import { ArkNewExpr, ArkStaticInvokeExpr } from '../../base/Expr';
import { KLimitedContextSensitive } from '../../pta/Context';
import { ArkInstanceFieldRef, ArkParameterRef, ArkStaticFieldRef } from '../../base/Ref';
import { Value } from '../../base/Value';
import { ContextID } from '../../pta/Context';
import { ArkMethod } from '../../model/ArkMethod';
import Logger from "../../../utils/logger";
import { Local } from '../../base/Local';
import { NodeID } from '../BaseGraph';

const logger = Logger.getLogger();
type PointerPair = [NodeID, NodeID]

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
    private ctx: KLimitedContextSensitive;
    private scene: Scene;
    private worklist: CSFuncID[] = [];

    constructor(p: Pag, cg: CallGraph, s: Scene) {
        this.pag = p;
        this.cg = cg;
        this.funcPags = new Map<FuncID, FuncPag>;
        this.ctx = new KLimitedContextSensitive(1);
        this.scene = s;
    }

    public buildForEntry(funcID: FuncID): void {
        this.worklist = [];
        let cid = this.ctx.getEmptyContextID();
        let csFuncID = new CSFuncID(cid, funcID);
        this.worklist.push(csFuncID);

        this.handleReachable();
    }

    public handleReachable() {
        while (this.worklist.length > 0) {
            let csFunc = this.worklist.shift() as CSFuncID
            this.buildFunPag(csFunc.funcID);
            this.buildPagFromFuncPag(csFunc.funcID, csFunc.cid);
        }
    }

    public build(): void {
        for (let funcID of this.cg.getEntries()) {
            let cid = this.ctx.getEmptyContextID();
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
            throw new Error("function ID");
        }

        for (let stmt of arkMethod.getCfg().getStmts()){
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
                        // TODO: handle non-direct call
                    }
                }
            } else if (stmt instanceof ArkInvokeStmt) {
                // TODO: discuss if we need a invokeStmt

                // DUPILICATE code!!
                let inkExpr = stmt.getInvokeExpr();
                if (inkExpr instanceof ArkStaticInvokeExpr) {
                    let cs = this.cg.getCallSiteByStmt(stmt);
                    if (cs) {
                        // direct call is already existing in CG
                        fpag.addNormalCallSite(cs);
                    } else {
                        // TODO: handle non-direct call
                    }
                }
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
            throw new Error("No Func PAG is found for #" + funcID);
        }

        this.addEdgesFromFuncPag(funcPag, cid);
        this.addCallsEdgesFromFuncPag(funcPag, cid);
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
            let calleeCid = this.ctx.newContext(cid);
            // Add reachable
            this.worklist.push(new CSFuncID(calleeCid, cs.calleeFuncID));

            let calleeNode = this.cg.getNode(cs.calleeFuncID) as CallGraphNode;
            let calleeMethod: ArkMethod | null = this.scene.getMethod(calleeNode.getMethod());
            if (!calleeMethod) {
                throw new Error(`Failed to get ArkMethod`);
            }

            // TODO: getParameterInstances's performance is not good. Need to refactor 
            //let params = calleeMethod.getParameterInstances();
            let params = calleeMethod.getCfg().getStmts()
                .filter(stmt => stmt instanceof ArkAssignStmt && stmt.getRightOp() instanceof ArkParameterRef)
                .map(stmt => (stmt as ArkAssignStmt).getRightOp());
            let argNum = cs.args?.length;

            if (argNum) {
            // add args to parameters edges
                for (let i = 0; i < argNum; i ++) {
                    let arg = cs.args?.at(i);
                    let param = params.at(i);
                    // TODO: param type should be ArkParameterRef?
                    //if (arg && param && param instanceof ArkParameterRef) {
                    if (arg && param) {
                        // Get or create new PAG node for argument and parameter
                        let srcPagNode = this.getOrNewPagNode(cid, arg, cs.callStmt);
                        let dstPagNode = this.getOrNewPagNode(calleeCid, param, cs.callStmt);

                        this.pag.addPagEdge(srcPagNode, dstPagNode, PagEdgeKind.Copy, cs.callStmt);
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
                    let srcPagNode = this.getOrNewPagNode(calleeCid, retValue, retStmt);
                    let dstPagNode = this.getOrNewPagNode(calleeCid, retDst, cs.callStmt);

                    this.pag.addPagEdge(srcPagNode, dstPagNode, PagEdgeKind.Copy, retStmt);
                }
            }
        }
        return true;
    }

    public getOrNewPagNode(cid: ContextID, v: Value, s?: Stmt): PagNode {
        return this.pag.getOrNewNode(cid, v, s);
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

        if (lhOp instanceof Local && (rhOp instanceof Local || rhOp instanceof ArkParameterRef)) {
            return true;
        }
        return false;
    }

    private stmtIsWriteKind(stmt: ArkAssignStmt): boolean {
        let lhOp = stmt.getLeftOp();
        let rhOp = stmt.getRightOp();

        if (rhOp instanceof Local && 
            (lhOp instanceof ArkInstanceFieldRef || lhOp instanceof ArkStaticFieldRef)) {
            return true;
        }
        return false;
    }

    private stmtIsReadKind(stmt: ArkAssignStmt): boolean {
        let lhOp = stmt.getLeftOp();
        let rhOp = stmt.getRightOp();

        if (lhOp instanceof Local && 
            (rhOp instanceof ArkInstanceFieldRef || rhOp instanceof ArkStaticFieldRef)) {
            return true;
        }
        return false;
    }
}