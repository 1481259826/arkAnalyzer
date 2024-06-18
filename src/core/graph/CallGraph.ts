import { BaseEdge, BaseGraph, BaseNode } from './BaseGraph';
import { MethodSignature } from '../model/ArkSignature'
import { Stmt, ArkInvokeStmt } from '../base/Stmt'

type Method = MethodSignature;
type StmtSet = Set<Stmt>;
type CallSiteID = number;
type CallSite = [CallSiteID, Stmt];

class CallEdge extends BaseEdge {
    private directCalls: StmtSet;
    private indirectCalls: StmtSet;
    private callSiteID: CallSiteID;

    constructor(src: CallNode, dst: CallNode, kind: number, csID: CallSiteID) {
        super(src, dst, kind);
        this.callSiteID = csID;
    }

}

class CallNode extends BaseNode {
    private method: Method;

    constructor(id: number, m: Method) {
        super(id, 0);
        this.method = m;
    }

    public getMethod(): Method {
        return this.method;
    }
}

class CallGraph extends BaseGraph {
    private idToCallSiteMap: Map<CallSiteID, CallSite>;
    private nodeNum: number;
    private directCallEdgeNum: number;
    private inDirectCallEdgeNum: number;

}
