import { BaseEdge, BaseExplicitGraph, BaseNode, NodeID } from '../core/graph/BaseExplicitGraph'
import { CallGraph } from '../callgraph/model/CallGraph'
import { ArkAssignStmt, Stmt } from '../core/base/Stmt';

/**
 * Direct value flow graph
 * Consist of stmt(node) and direct Def-Use edge
 * Is basic of VFG. And VFG is building on DVFG
 */
export class DVFG extends BaseExplicitGraph {
    private cg: CallGraph;
    private stmtToVFGMap: Map<Stmt, NodeID>;
    constructor(cg: CallGraph) {
        super();
        this.cg = cg;
        this.stmtToVFGMap = new Map();
    }

    public getCG(): CallGraph {
        return this.cg;
    }

    public getGraphName(): string {
        return 'Direct-VFG';
    }

    public getOrNewDVFGNode(stmt: Stmt): DVFGNode {
        let node = this.stmtToVFGMap.get(stmt);
        if (node) {
            return this.getNode(node)! as DVFGNode;
        }

        let kind: DVFGNodeKind = DVFGNodeKind.normal;
        if (stmt instanceof ArkAssignStmt) {
            //TODO: split assign to copy, write, load
            kind = DVFGNodeKind.assign;
        } else {
            // TODO: handle other type of stmt
        }

        return this.addDVFGNode(stmt, kind);
    }

    public addDVFGNode(stmt: Stmt, kind: DVFGNodeKind): DVFGNode {
        let id: NodeID = this.nodeNum;
        let dvfgNode = new DVFGNode(id, kind, stmt);

        this.addNode(dvfgNode);
        this.stmtToVFGMap.set(stmt, dvfgNode.getID());
        return dvfgNode;
    }

    public addDVFGEdge(src: DVFGNode, dst: DVFGNode): boolean {
        let kind = 0; //common kind
        let edge = new DVFGEdge(src, dst, kind);
        if (this.ifEdgeExisting(edge)) {
            return false;
        }

        src.addOutgoingEdge(edge);
        dst.addIncomingEdge(edge);

        return true;
    }
}

export enum DVFGNodeKind {
    assign, copy, write, load, addr, if, actualParm, formalParm, actualRet,
    formalRet, unary, binary, normal
}

export class DVFGNode extends BaseNode {
    private stmt: Stmt;

    constructor(i: NodeID, k: DVFGNodeKind, s: Stmt) {
        super(i, k);
        this.stmt = s;
    }

    public getDotLabel(): string {
        throw new Error('Method not implemented.');
    }

    public getStmt(): Stmt {
        return this.stmt;
    }
}

export class DVFGEdge extends BaseEdge {

}