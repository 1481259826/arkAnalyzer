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

import { NodeID, BaseEdge, BaseGraph, BaseNode } from './BaseGraph';
import { CallGraph, CallSite } from './CallGraph';
import { ContextID } from '../pta/Context';
import { Value } from '../base/Value';
import { ArkNewExpr } from '../base/Expr';
import { ArkInstanceFieldRef, ArkStaticFieldRef } from '../base/Ref';
import { Local } from '../base/Local';

/*
 * Implementation of pointer-to assignment graph for pointer analysis
 */

export enum PagEdgeKind {
    Address, Copy, Load, Write, 
};

export class PagEdge extends BaseEdge {
    constructor(s: PagNode, d: PagNode, k: PagEdgeKind) {
        super(s, d, k);
    };

}

export class AddrPagEdge extends PagEdge {
    constructor(s: PagNode, d: PagNode) {
        super(s, d, PagEdgeKind.Address);
    };
}

export class CopyPagEdge extends PagEdge {
    constructor(s: PagNode, d: PagNode) {
        super(s, d, PagEdgeKind.Copy);
    };
}

export class LoadPagEdge extends PagEdge {
    constructor(s: PagNode, d: PagNode) {
        super(s, d, PagEdgeKind.Copy);
    };
}

export class WritePagEdge extends PagEdge {
    constructor(s: PagNode, d: PagNode) {
        super(s, d, PagEdgeKind.Write);
    };
}

type PagEdgeSet = Set<PagEdge>;

export class PagNode extends BaseNode {
    private cid: ContextID | undefined;
    private value: Value
    private pointerSet: Set<NodeID>

    private addressInEdges: PagEdgeSet;
    private addressOutEdges: PagEdgeSet;
    private copyInEdges: PagEdgeSet;
    private copyOutEdges: PagEdgeSet;
    private loadInEdges: PagEdgeSet;
    private loadOutEdges: PagEdgeSet;
    private writeInEdges: PagEdgeSet;
    private wirteOutEdges: PagEdgeSet;

    constructor (id: NodeID, cid: ContextID|undefined = undefined, value: Value) {
        super(id, 0);
        this.cid = cid;
        this.value = value
        this.pointerSet = new Set<NodeID>
    }

    public addAddressInEdge(e: AddrPagEdge): void {
        this.addAddressInEdge == undefined ? this.addressInEdges = new Set(): undefined;
        this.addressInEdges.add(e);
        this.addIncomingEdge(e);
    }

    public addAddressOutEdge(e:AddrPagEdge): void {
        this.addressOutEdges == undefined ? this.addressOutEdges = new Set() : undefined;
        this.addressOutEdges.add(e);
        this.addOutgoingEdge(e);
    }

    public addCopyInEdge(e: CopyPagEdge): void {
        this.copyInEdges == undefined ? this.copyInEdges = new Set() : undefined;
        this.copyInEdges.add(e);
        this.addIncomingEdge(e);
    }

    public addCopyOutEdge(e: CopyPagEdge): void {
        this.copyOutEdges == undefined ? this.copyOutEdges = new Set() : undefined;

        this.copyOutEdges.add(e);
        this.addOutgoingEdge(e);
    }

    public addLoadInEdge(e: LoadPagEdge): void {
        this.loadInEdges.add(e);
        this.addIncomingEdge(e);
    }

    public addLoadOutEdge(e: LoadPagEdge): void {
        this.loadOutEdges.add(e);
        this.addOutgoingEdge(e);
    }

    public addWriteInEdge(e: WritePagEdge): void {
        this.writeInEdges.add(e);
        this.addIncomingEdge(e);
    }

    public addWriteOutEdge(e: LoadPagEdge): void {
        this.wirteOutEdges.add(e);
        this.addOutgoingEdge(e);
    }
}

export class PagLocalNode extends PagNode {
    constructor(id: NodeID, cid: ContextID|undefined = undefined, value: Local) {
        super(id, cid, value)
    }
}

export class PagInstanceFieldNode extends PagNode {
    constructor(id: NodeID, cid: ContextID|undefined = undefined, instanceFieldRef: ArkInstanceFieldRef) {
        super(id, cid, instanceFieldRef)
    }
}

export class PagStaticFieldNode extends PagNode {
    constructor(id: NodeID, cid: ContextID|undefined = undefined, staticFieldRef: ArkStaticFieldRef) {
        super(id, cid, staticFieldRef)
    }
}

export class PagNewExprNode extends PagNode {
    constructor(id: NodeID, cid: ContextID|undefined = undefined, expr: ArkNewExpr) {
        super(id, cid, expr)
    }
}

export class Pag extends BaseGraph {

    private cg: CallGraph;
    private contextValueToIdMap: Map<[ContextID, Value], NodeID> = new Map();

    public getCG(): CallGraph {
        return this.cg;
    }
    public addPagNode(cid: ContextID, value: Value): PagNode{
        let id: NodeID = this.nodeNum++;
        let pagNode: PagNode
        if (value instanceof Local) {
            pagNode = new PagLocalNode(id, cid, value)
        } else if (value instanceof ArkInstanceFieldRef) {
            pagNode = new PagInstanceFieldNode(id, cid, value)
        } else if (value instanceof ArkStaticFieldRef) {
            pagNode = new PagStaticFieldNode(id, cid, value)
        } else if (value instanceof ArkNewExpr) {
            pagNode = new PagNewExprNode(id, cid, value)
        }

        this.addNode(pagNode!);
        this.contextValueToIdMap.set([cid, value], id);
        return pagNode!;
    }

    public getOrNewNode(cid: ContextID, v: Value): PagNode {
        let nodeId = this.contextValueToIdMap.get([cid, v]);
        if (nodeId != undefined) {
            return this.getNode(nodeId) as PagNode;
        }

        return this.addPagNode(cid, v);
    }

    public addCopyEdge(src: PagNode, dst: PagNode, kind: PagEdgeKind) {
        // TODO: check if the edge already existing
        let edge = new PagEdge(src, dst, kind); 

        src.addOutgoingEdge(edge);
        src.addCopyOutEdge(edge);
        dst.addIncomingEdge(edge);
        dst.addCopyInEdge(edge);
    }
}

export class FuncPag {
    private funcID: number;
    private interalEdges: Set<PagEdge>;
    private normalCallSites: Set<CallSite>;
    private dynamicCallSites: Set<CallSite>;
    private funPtrCallSite: Set<CallSite>;

    public addNormalCallSite(cs: CallSite): void {
        if (this.normalCallSites == undefined) {
            this.normalCallSites = new Set();
        }

        this.normalCallSites.add(cs);
    }

    public addDynamicCallSite(cs: CallSite): void {
        if (this.dynamicCallSites == undefined) {
            this.dynamicCallSites = new Set();
        }
        this.dynamicCallSites.add(cs);
    }

    public getNormalCallSites(): Set<CallSite> {
        return this.normalCallSites;
    }
}
