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

import { NodeID, Kind, BaseEdge, BaseGraph, BaseNode } from './BaseGraph';
import { MethodSignature } from '../model/ArkSignature'
import { Stmt, ArkInvokeStmt } from '../base/Stmt'
import { Value } from '../base/Value'
import { Scene } from '../../Scene';
import { ArkMethod } from '../model/ArkMethod';
import { ContextID } from '../pta/Context';
//import { } from '../pta/Context'

export type Method = MethodSignature;
export type CallSiteID = number;
export type FuncID = number;
type StmtSet = Set<Stmt>;
export enum CallGraphNodeKind {
    real, vitual
}
export class CallSite {
    public callStmt: Stmt;
    public args: Value[] | undefined;
    public calleeFuncID: FuncID;

    constructor(s: Stmt, a: Value[] | undefined, c: FuncID) {
        this.callStmt = s;
        this.args = a;
        this.calleeFuncID = c;
    }
}
export class CSCallSite extends CallSite {
    public cid: ContextID;

    constructor(id: ContextID, cs: CallSite) {
        super(cs.callStmt, cs.args, cs.calleeFuncID);
        this.cid = id;
    }
}

export class CallGraphEdge extends BaseEdge {
    private directCalls: StmtSet = new Set();
    private indirectCalls: StmtSet = new Set();
    private callSiteID: CallSiteID;

    constructor(src: CallGraphNode, dst: CallGraphNode ) {
        super(src, dst, 0);
        //this.callSiteID = csID;
    }

    public addDirectCallSite(stmt: Stmt) {
        this.directCalls.add(stmt);
    }

    public addInDirectCallSite(stmt: Stmt) {
        this.indirectCalls.add(stmt);
    }
}

export class CallGraphNode extends BaseNode {
    private method: Method;

    constructor(id: number, m: Method, k: CallGraphNodeKind = CallGraphNodeKind.real) {
        super(id, k);
        this.method = m;
    }

    public getMethod(): Method {
        return this.method;
    }
}

export class CallGraph extends BaseGraph {
    private scene: Scene;
    private idToCallSiteMap: Map<CallSiteID, CallSite> = new Map();
    private callSiteToIdMap: Map<CallSite, CallSiteID> = new Map();
    private stmtToCallSitemap: Map<Stmt, CallSite> = new Map();
    private methodToCGNodeMap: Map<Method, CallGraphNode> = new Map();
    private callPairToEdgeMap: Map<string, CallGraphEdge> = new Map();
    private callSiteNum: number = 0;
    private directCallEdgeNum: number;
    private inDirectCallEdgeNum: number;
    private entries: NodeID[];

    constructor(s: Scene) {
        super();
        this.scene = s;
    }

    private getCallPairString(srcID: NodeID, dstID: NodeID): string {
        return `${srcID}-${dstID}`;
    }

    public getCallEdgeByPair(srcID: NodeID, dstID: NodeID): CallGraphEdge |undefined {
        let key: string = this.getCallPairString(srcID, dstID);
        return this.callPairToEdgeMap.get(key);
    }

    public addCallGraphNode(method: Method, kind: CallGraphNodeKind = CallGraphNodeKind.real): CallGraphNode {
        let id: NodeID = this.nodeNum;
        let cgNode = new CallGraphNode(id, method, kind);
        this.addNode(cgNode);
        this.methodToCGNodeMap.set(method, cgNode);
        return cgNode;
    }

    public getCallGraphNodeByMethod(method: Method): CallGraphNode {
        let n = this.methodToCGNodeMap.get(method);
        if (n == undefined) {
            // The method can't be found
            // means the method has no implementation, or base type is unclear to find it
            // Create a virtual CG Node
            // TODO: this virtual CG Node need be remove once the base type is clear 
            return this.addCallGraphNode(method, CallGraphNodeKind.vitual)
        }

        return n;
    } 

    public addDirectCallEdge(caller: Method, callee: Method, callStmt: Stmt): void {
        let callerNode = this.getCallGraphNodeByMethod(caller) as CallGraphNode;
        let calleeNode = this.getCallGraphNodeByMethod(callee) as CallGraphNode;
        let args = callStmt.getInvokeExpr()?.getArgs();
        //this.getMethodByFuncID

        let cs: CallSite = new CallSite(callStmt, args, calleeNode.getID());
        let csID: CallSiteID;
        if (!this.callSiteToIdMap.has(cs)) {
            csID = this.callSiteNum++;
            this.idToCallSiteMap.set(csID, cs);
            this.callSiteToIdMap.set(cs, csID);
        } else {
            csID = this.callSiteToIdMap.get(cs) as CallSiteID;
        }

        if(this.addStmtToCallSiteMap(callStmt, cs)) {
            // TODO: check stmt exists
        }

        // TODO: check if edge exists 
        let callEdge = this.getCallEdgeByPair(callerNode.getID(), calleeNode.getID());
        if (callEdge == undefined) {
            callEdge = new CallGraphEdge(callerNode, calleeNode);
            callEdge.getSrcNode().addOutgoingEdge(callEdge);
            callEdge.getDstNode().addIncomingEdge(callEdge);
            this.callPairToEdgeMap.set(this.getCallPairString(callerNode.getID(), calleeNode.getID()), callEdge);
        }
        callEdge.addDirectCallSite(callStmt);
    }

    public addStmtToCallSiteMap(stmt: Stmt, cs: CallSite): boolean{
        if (this.stmtToCallSitemap.has(stmt)) {
            return false;
        }
        this.stmtToCallSitemap.set(stmt, cs);
        return true;
    }

    public getCallSiteByStmt(stmt: Stmt): CallSite | undefined {
        return this.stmtToCallSitemap.get(stmt);
    }

    public getMethodByFuncID(id: FuncID): Method | null {
        let node = this.getNode(id);
        if(node != undefined) {
            return (node as CallGraphNode).getMethod();
        }
        //return undefined;
        return null;
    }

    public getArkMethodByFuncID(id: FuncID) : ArkMethod| null{
        let method = this.getMethodByFuncID(id);
        if (method != null) {
            // TODO: SDK Method search
            return this.scene.getMethod(method);
        }

        return null;
    }

    public getEntries(): FuncID[] {
        return this.entries;
    }

    public setEntries(n : NodeID[]): void {
        this.entries = n;
    }
}
