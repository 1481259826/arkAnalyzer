export type NodeID = number;
export type Kind = number;

export class BaseEdge {
    private src: BaseNode;
    private dst: BaseNode;
    private kind: Kind;

    constructor(s: BaseNode, d: BaseNode, k: Kind) {
        this.src = s;
        this.dst = d;
        this.kind = k;
    }

    public getSrcID(): NodeID {
        return this.src.getID();
    }

    public getDstID(): NodeID {
        return this.dst.getID();
    }

    public getSrcNode(): BaseNode {
        return this.src;
    }

    public getDstNode(): BaseNode {
        return this.dst;
    }

    public getKind(): Kind {
        return this.kind;
    }
}

export class BaseNode {
    private id: NodeID;
    private kind: Kind;
    private inEdges: BaseEdge[];
    private outEdges: BaseEdge[];

    constructor(id: NodeID, k: Kind) {
        this.id = id;
        this.kind = k;
    }

    public getID(): NodeID {
        return this.id;
    }

    public getKind(): Kind {
        return this.kind;
    }

    public hasIncomingEdge(): boolean {
        return (this.inEdges.length != 0);
    }

    public hasOutgoingEdge(): boolean {
        return (this.outEdges.length !=0);
    }

    public addIncomingEdge(e: BaseEdge): void {
        this.inEdges.push(e);
    }

    public addOutgoingEdge(e: BaseEdge): void {
        this.outEdges.push(e);
    }

    public removeIncomingEdge(e: BaseEdge): boolean {
        let idx = this.inEdges.indexOf(e);
        if (idx != -1) {
            this.inEdges.splice(idx, 1);
            return true;
        }
        return false;
    }

    public removeOutgoingEdge(e: BaseEdge): boolean {
        let idx = this.outEdges.indexOf(e);
        if (idx != -1) {
            this.outEdges.splice(idx, 1);
            return true;
        }
        return false;
    }

}

export class BaseGraph {
    private edgeNum: number;
    private nodeNum: number = 0;
    protected idToNodeMap: Map<NodeID, BaseNode>;

    public addNode(n: BaseNode): void {
        this.idToNodeMap.set(n.getID(), n);
        this.nodeNum++;
    }

    public getNode(id: NodeID): BaseNode | undefined {
        return this.idToNodeMap.get(id);
    }

    public hasNode(id: NodeID): boolean {
        return this.idToNodeMap.has(id);
    }

    public removeNode(id: NodeID): boolean {
        if(this.idToNodeMap.delete(id)) {
            this.nodeNum--;
            return true;
        }
        return false;
    }
};