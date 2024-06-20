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

export type Method = MethodSignature;
type StmtSet = Set<Stmt>;
export type CallSiteID = number;
export type CallSite = [Stmt, Method];

export class CallGraphEdge extends BaseEdge {
    private directCalls: StmtSet;
    private indirectCalls: StmtSet;
    private callSiteID: CallSiteID;

    constructor(src: CallGraphNode, dst: CallGraphNode, kind: number, csID: CallSiteID) {
        super(src, dst, kind);
        this.callSiteID = csID;
    }
}

export class CallGraphNode extends BaseNode {
    private method: Method;

    constructor(id: number, m: Method) {
        super(id, 0);
        this.method = m;
    }

    public getMethod(): Method {
        return this.method;
    }
}

export class CallGraph extends BaseGraph {
    private idToCallSiteMap: Map<CallSiteID, CallSite>;
    private callSiteToIdMap: Map<CallSite, CallSiteID>;
    private methodToCGNodeMap: Map<Method, CallGraphNode>;
    private nodeNum: number = 0;
    private callSiteNum: number = 0;
    private directCallEdgeNum: number;
    private inDirectCallEdgeNum: number;

    constructor() {
        super();
    }

    public addCallGraphNode(method: Method): void {
        let id: NodeID = this.nodeNum++;
        let cgNode = new CallGraphNode(id, method);
        this.addNode(cgNode);
        this.methodToCGNodeMap.set(method, cgNode);
    }

    public getCallGraphNodeByMethod(method: Method): CallGraphNode | undefined {
        let n = this.methodToCGNodeMap.get(method);
        if (n == undefined) {
            throw(new Error("CallGraphNode can't be found for method " + method.toString()))
        }

        return n;
    }

    public addDirectCallEdge(caller: Method, callee: Method, callStmt: Stmt): void {
        let callerNode = this.getCallGraphNodeByMethod(caller) as CallGraphNode;
        let calleeNode = this.getCallGraphNodeByMethod(callee) as CallGraphNode;

        let cs: CallSite = [callStmt, callee];
        let csID: CallSiteID;
        if (!this.callSiteToIdMap.has(cs)) {
            csID = this.callSiteNum++;
            this.idToCallSiteMap.set(csID, cs);
            this.callSiteToIdMap.set(cs, csID);
        } else {
            csID = this.callSiteToIdMap.get(cs) as CallSiteID;
        }

        // TODO: check if edge exists 
        let callEdge = new CallGraphEdge(callerNode, calleeNode, 0, csID);
        callEdge.getSrcNode().addOutgoingEdge(callEdge);
        callEdge.getDstNode().addIncomingEdge(callEdge);
    }
}
