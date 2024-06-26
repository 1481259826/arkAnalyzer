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

import { CallGraph, CallSite, FuncID, CallGraphNode } from '../CallGraph';
import { Pag, FuncPag, PagNode, PagEdgeKind } from '../Pag'
import { Scene } from '../../../Scene'
import { Stmt, ArkInvokeStmt, ArkAssignStmt } from '../../base/Stmt'
import { AbstractInvokeExpr, ArkInstanceInvokeExpr, ArkStaticInvokeExpr } from '../../base/Expr';
import { KLimitedContextSensitive } from '../../pta/Context';
import { ArkParameterRef } from '../../base/Ref';
import { Value } from '../../base/Value';
import { ContextID } from '../../pta/Context';
import { ArkMethod } from '../../model/ArkMethod';

class CSFuncID{
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

    public build(): void {
        for (let funcID of this.cg.getEntries()) {
            let cid = this.ctx.getEmptyContextID();
            let csFuncID =new CSFuncID(cid, funcID);
            this.worklist.push(csFuncID);

            while (this.worklist.length > 0) {
                let csFunc = this.worklist.shift()
                if (this.buildFunPag(csFuncID.funcID)) {
                    this.buildPagFromFuncPag(csFuncID.funcID, csFuncID.cid);
                }
            }
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
            if (stmt instanceof ArkAssignStmt) {
                // TODO: add non-call edges
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

        this.addEdgesFromFuncPag(funcPag);
        this.addCallsEdgesFromFuncPag(funcPag, cid);

    }

    public addEdgesFromFuncPag(funcPag: FuncPag) {

    }

    /// add Copy edges interprocedural
    public addCallsEdgesFromFuncPag(funcPag: FuncPag, cid: ContextID): boolean {
        if (funcPag.getNormalCallSites() == undefined) {
            return false;
        }

        for (let cs of funcPag.getNormalCallSites()) {
            let calleeCid = this.ctx.newContext(cid);
            //let calleeCFId: ContextNFuncID = [calleeCid, cs.calleeFuncID];
            let calleeNode = this.cg.getNode(cs.calleeFuncID) as CallGraphNode;
            let calleeMethod: ArkMethod | null = this.scene.getMethod(calleeNode.getMethod());
            if (!calleeMethod) {
                throw new Error(`Failed to get ArkMethod`);
            }

            // TODO: getParameterInstances's performance is not good. Need to refactor 
            let params = calleeMethod.getParameterInstances();
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
                        let srcPagNode = this.getOrNewPagNode(cid, arg);
                        let dstPagNode = this.getOrNewPagNode(calleeCid, param);

                        this.pag.addCopyEdge(srcPagNode, dstPagNode, PagEdgeKind.Copy);
                    }
                    // TODO: handle other types of parmeters
                }
            }

            // add ret to caller edges
            let rets = calleeMethod.getReturnValues();
            // TODO: call statement must be a assignment state
            if (cs.callStmt instanceof ArkAssignStmt) {
                let retDst = cs.callStmt.getLeftOp();
                for (let retValue of rets) {
                    let srcPagNode = this.getOrNewPagNode(calleeCid, retValue);
                    let dstPagNode = this.getOrNewPagNode(calleeCid, retDst);

                    this.pag.addCopyEdge(srcPagNode, dstPagNode, PagEdgeKind.Copy);
                }
            }
        }
        return true;
    }

    public getOrNewPagNode(cid: ContextID, v: Value): PagNode {
        return this.pag.getOrNewNode(cid, v);
    }

}