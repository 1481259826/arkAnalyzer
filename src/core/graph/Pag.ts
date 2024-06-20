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

/*
 * Implementation of pointer-to assignment graph for pointer analysis
 */

enum PagEdgeKind {
    Address, Copy, Load, Write
};

class PagEdge extends BaseEdge {
    constructor(s: PagNode, d: PagNode, k: PagEdgeKind) {
        super(s, d, k);
    };
}

class AddrPagEdge extends PagEdge {
    constructor(s: PagNode, d: PagNode) {
        super(s, d, PagEdgeKind.Address);
    };
}

class CopyPagEdge extends PagEdge {
    constructor(s: PagNode, d: PagNode) {
        super(s, d, PagEdgeKind.Copy);
    };
}

class LoadPagEdge extends PagEdge {
    constructor(s: PagNode, d: PagNode) {
        super(s, d, PagEdgeKind.Copy);
    };
}

class WritePagEdge extends PagEdge {
    constructor(s: PagNode, d: PagNode) {
        super(s, d, PagEdgeKind.Write);
    };
}

type PagEdgeSet = Set<PagEdge>;

class PagNode extends BaseNode {
    private addressInEdges: PagEdgeSet;
    private addressOutEdges: PagEdgeSet;
    private copyInEdges: PagEdgeSet;
    private copyOutEdges: PagEdgeSet;
    private loadInEdges: PagEdgeSet;
    private loadOutEdges: PagEdgeSet;
    private writeInEdges: PagEdgeSet;
    private wirteOutEdges: PagEdgeSet;

    constructor (id: NodeID) {
        super(id, 0);
    }

    public addAddressInEdge(e: AddrPagEdge): void {
        this.addressInEdges.add(e);
        this.addIncomingEdge(e);
    }

    public addAddressOutEdge(e:AddrPagEdge): void {
        this.addressOutEdges.add(e);
        this.addOutgoingEdge(e);
    }

    public addCopyInEdge(e: CopyPagEdge): void {
        this.copyInEdges.add(e);
        this.addIncomingEdge(e);
    }

    public addCopyOutEdge(e: CopyPagEdge): void {
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