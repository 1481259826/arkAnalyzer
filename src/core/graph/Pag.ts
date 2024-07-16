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

import { NodeID, BaseEdge, BaseGraph, BaseNode, Kind } from './BaseGraph';
import { CallGraph, CallSite, DynCallSite } from './CallGraph';
import { ContextID } from '../pta/Context';
import { Value } from '../base/Value';
import { ArkAssignStmt, ArkReturnStmt, Stmt } from '../base/Stmt';
import { ArkInstanceInvokeExpr, ArkNewExpr } from '../base/Expr';
import { ArkInstanceFieldRef, ArkParameterRef, ArkStaticFieldRef } from '../base/Ref';
import { Local } from '../base/Local';
import { GraphPrinter } from '../../save/GraphPrinter';
import { PrinterBuilder } from '../../save/PrinterBuilder';

/*
 * Implementation of pointer-to assignment graph for pointer analysis
 */

export enum PagEdgeKind {
    Address, Copy, Load, Write, Unknown
};

export class PagEdge extends BaseEdge {
    private stmt: Stmt | undefined;

    constructor(n: PagNode, d: PagNode, k: PagEdgeKind, s?: Stmt) {
        super(n, d, k);
        this.stmt = s;
    };

    public getDotAttr(): string {
        switch(this.getKind()) {
            case PagEdgeKind.Address:
                return "color=green";
            case PagEdgeKind.Copy:
                if (this.stmt?.getInvokeExpr() != undefined || this.stmt instanceof ArkReturnStmt) {
                    return "color=black,style=dotted"
                }
                return "color=black";
            case PagEdgeKind.Load:
                return "color=red";
            case PagEdgeKind.Write:
                return "color=blue"
            default:
                return "color=black";
        }
    }
}

export class AddrPagEdge extends PagEdge {
    constructor(n: PagNode, d: PagNode, s: Stmt) {
        super(n, d, PagEdgeKind.Address, s);
    };
}

export class CopyPagEdge extends PagEdge {
    constructor(n: PagNode, d: PagNode, s: Stmt) {
        super(n, d, PagEdgeKind.Copy, s);
    };
}

export class LoadPagEdge extends PagEdge {
    constructor(n: PagNode, d: PagNode, s: Stmt) {
        super(n, d, PagEdgeKind.Copy, s);
    };
}

export class WritePagEdge extends PagEdge {
    constructor(n: PagNode, d: PagNode, s: Stmt) {
        super(n, d, PagEdgeKind.Write, s);
    };
}

type PagEdgeSet = Set<PagEdge>;

export enum PagNodeKind { HeapObj, LocalVar, RefVar, Param }
export class PagNode extends BaseNode {
    private cid: ContextID | undefined;
    private value: Value;
    private stmt: Stmt | undefined; // stmt is just used for graph print
    private pointerSet: Set<NodeID>;

    private addressInEdges: PagEdgeSet;
    private addressOutEdges: PagEdgeSet;
    private copyInEdges: PagEdgeSet;
    private copyOutEdges: PagEdgeSet;
    private loadInEdges: PagEdgeSet;
    private loadOutEdges: PagEdgeSet;
    private writeInEdges: PagEdgeSet;
    private writeOutEdges: PagEdgeSet;

    constructor (id: NodeID, cid: ContextID|undefined = undefined, value: Value, k: Kind, s?: Stmt) {
        super(id, k);
        this.cid = cid;
        this.value = value;
        this.stmt = s;
        this.pointerSet = new Set<NodeID>;
    }

    public setStmt(s: Stmt) {
        this.stmt = s;
    }

    public getStmt(): Stmt | undefined {
        return this.stmt;
    }

    public hasOutgoingCopyEdge(): boolean {
        return (this.copyOutEdges.size !== 0);
    }

    public getOutgoingCopyEdges(): PagEdgeSet {
        return this.copyOutEdges;
    }

    public getOutgoingLoadEdges(): PagEdgeSet {
        return this.loadOutEdges;
    }

    public getOutgoingWriteEdges(): PagEdgeSet {
        return this.writeOutEdges;
    }

    public addAddressInEdge(e: AddrPagEdge): void {
        this.addressInEdges == undefined ? this.addressInEdges = new Set() : undefined;
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
        this.loadInEdges == undefined? this.loadInEdges = new Set() : undefined;
        this.loadInEdges.add(e);
        this.addIncomingEdge(e);
    }

    public addLoadOutEdge(e: LoadPagEdge): void {
        this.loadOutEdges == undefined ? this.loadOutEdges = new Set() : undefined;
        this.loadOutEdges.add(e);
        this.addOutgoingEdge(e);
    }

    public addWriteInEdge(e: WritePagEdge): void {
        this.writeInEdges = this.writeInEdges ?? new Set();
        this.writeInEdges.add(e);
        this.addIncomingEdge(e);
    }

    public addWriteOutEdge(e: LoadPagEdge): void {
        this.writeOutEdges = this.writeOutEdges ?? new Set();
        this.writeOutEdges.add(e);
        this.addOutgoingEdge(e);
    }

    public getValue(): Value {
        return this.value
    }

    public getPointerSet(): Set<NodeID> {
        return this.pointerSet
    }

    public addPointerSetElement(node: NodeID) {
        this.pointerSet.add(node)
    }

    public setPointerSet(pts: Set<NodeID>): void {
        this.pointerSet = pts;
    }

    public getOutEdges() {
        return {
            AddressEdge: this.addressOutEdges,
            CopyEdge: this.copyOutEdges,
            LoadEdge: this.loadOutEdges,
            WriteEdge: this.writeOutEdges
        }
    }

    public getDotAttr(): string {
        switch(this.getKind()) {
            case PagNodeKind.HeapObj:
                return 'shape=box3d';
            case PagNodeKind.LocalVar:
                return 'shape=box';
            case PagNodeKind.RefVar:
                return 'shape=component';
            case PagNodeKind.Param:
                return 'shape=box'
            default:
                return 'shape=box';
        }
    }

    public getDotLabel(): string {
        let lable: string;
        let param: ArkParameterRef;

        lable = PagNodeKind[this.getKind()];
        lable = lable + ` ID: ${this.getID()} Ctx: ${this.cid}`;
        lable = lable + ` pts:{${Array.from(this.pointerSet).join(',')}}`

        if (this.getKind() == PagNodeKind.Param) {
            param = this.value as ArkParameterRef;
            lable = lable + `\nParam#${param.getIndex()} ${param.toString()}`;
        }

        if (this.stmt) {
            lable = lable + `\n${this.stmt.toString()} ln:`;
            lable = lable + this.stmt.getOriginPositionInfo().getLineNo();
        }


        if (this.getKind() == PagNodeKind.Param) {
            //lable = lable + '\n' + (this.value as ArkParameterRef).toString();

        }

        return lable;
    }
}

export class PagLocalNode extends PagNode {
    constructor(id: NodeID, cid: ContextID|undefined = undefined, value: Local, stmt?: Stmt) {
        super(id, cid, value, PagNodeKind.LocalVar, stmt)
    }
}

export class PagInstanceFieldNode extends PagNode {
    constructor(id: NodeID, cid: ContextID|undefined = undefined, instanceFieldRef: ArkInstanceFieldRef, stmt?: Stmt) {
        super(id, cid, instanceFieldRef,PagNodeKind.RefVar, stmt)
    }
}

export class PagStaticFieldNode extends PagNode {
    constructor(id: NodeID, cid: ContextID|undefined = undefined, staticFieldRef: ArkStaticFieldRef, stmt?: Stmt) {
        super(id, cid, staticFieldRef, PagNodeKind.RefVar, stmt)
    }
}

export class PagNewExprNode extends PagNode {
    constructor(id: NodeID, cid: ContextID|undefined = undefined, expr: ArkNewExpr, stmt?: Stmt) {
        super(id, cid, expr, PagNodeKind.HeapObj, stmt)
    }
}

export class PagParamNode extends PagNode {
    constructor(id: NodeID, cid: ContextID|undefined = undefined, r: ArkParameterRef, stmt?: Stmt) {
        super(id, cid, r, PagNodeKind.Param, stmt)
    }
}

export class Pag extends BaseGraph {

    private cg: CallGraph;
    //private contextValueToIdMap: Map<[ContextID, Value], NodeID> = new Map();
    private contextValueToIdMap: Map<Value, Map<ContextID,NodeID>> = new Map();
    private addrEdges: PagEdgeSet = new Set();
    private dynamicCallSites: Set<DynCallSite>;

    public getCG(): CallGraph {
        return this.cg;
    }

    public addToDynamicCallSite(cs: DynCallSite): void {
        this.dynamicCallSites = this.dynamicCallSites ?? new Set();
        this.dynamicCallSites.add(cs);
    }

    public getDynamicCallSites(): Set<DynCallSite> {
        return this.dynamicCallSites;
    }

    public clearDynamicCallSiteSet() {
        this.dynamicCallSites.clear();
    }

    public addPagNode(cid: ContextID, value: Value, stmt?: Stmt): PagNode{
        let id: NodeID = this.nodeNum;
        let pagNode: PagNode
        if (value instanceof Local) {
            pagNode = new PagLocalNode(id, cid, value, stmt);
        } else if (value instanceof ArkInstanceFieldRef) {
            pagNode = new PagInstanceFieldNode(id, cid, value, stmt);
        } else if (value instanceof ArkStaticFieldRef) {
            pagNode = new PagStaticFieldNode(id, cid, value, stmt);
        } else if (value instanceof ArkNewExpr) {
            pagNode = new PagNewExprNode(id, cid, value, stmt);
        } else if (value instanceof ArkParameterRef) {
            pagNode = new PagParamNode(id, cid, value, stmt);
        } else {
            throw new Error('unsupported Value type ' + value.getType().toString());
        }

        this.addNode(pagNode!);
        let ctx2NdMap = this.contextValueToIdMap.get(value);
        if (!ctx2NdMap) {
            ctx2NdMap = new Map();
            this.contextValueToIdMap.set(value, ctx2NdMap);
        }
        ctx2NdMap.set(cid, id);
        
        return pagNode!;
    }

    public hasCtxNode(cid: ContextID, v: Value): NodeID | undefined {
        let ctx2nd = this.contextValueToIdMap.get(v);
        if (!ctx2nd) {
            return undefined;
        }

        let ndId = ctx2nd.get(cid);
        if(!ndId) {
            return undefined;
        }

        return ndId;
    }

    public hasCtxRetNode(cid: ContextID, v: Value): NodeID | undefined {
        let ctx2nd = this.contextValueToIdMap.get(v);
        if (!ctx2nd) {
            return undefined;
        }

        let ndId = ctx2nd.get(cid);
        if(!ndId) {
            return undefined;
        }

        return ndId;
    }
    public getOrNewNode(cid: ContextID, v: Value, s?: Stmt): PagNode {
        let nodeId = this.hasCtxNode(cid, v);
        if (nodeId != undefined) {
            return this.getNode(nodeId) as PagNode;
        }

        return this.addPagNode(cid, v, s);
    }

    public getNodesByValue(v: Value): Map<ContextID, NodeID> | undefined {
        return this.contextValueToIdMap.get(v);
    }

    public addPagEdge(src: PagNode, dst: PagNode, kind: PagEdgeKind, stmt?: Stmt): boolean {
        // TODO: check if the edge already existing
        let edge = new PagEdge(src, dst, kind, stmt); 
        if (this.ifEdgeExisting(edge)) {
            return false;
        }

        //src.addOutgoingEdge(edge);
        //dst.addIncomingEdge(edge);
        switch (kind) {
            case PagEdgeKind.Copy:
                src.addCopyOutEdge(edge);
                dst.addCopyInEdge(edge);
                break;
            case PagEdgeKind.Address:
                src.addAddressOutEdge(edge);
                dst.addAddressInEdge(edge);
                this.addrEdges.add(edge);
                break;
            case PagEdgeKind.Write:
                src.addWriteOutEdge(edge);
                dst.addWriteInEdge(edge);
                break;
            case PagEdgeKind.Load:
                src.addLoadOutEdge(edge);
                dst.addLoadInEdge(edge);
                break;
            default:
                ;
        }
        return true;
    }

    public getAddrEdges(): PagEdgeSet {
        return this.addrEdges;
    }

    public getGraphName(): string {
        return 'PAG';
    }

    public dump(name: string): void {
        let printer = new GraphPrinter<this>(this);
        PrinterBuilder.dump(printer, name);
    }
}

type InternalEdge = {src: Value, dst: Value, kind: PagEdgeKind, stmt: Stmt}

export class FuncPag {
    private funcID: number;
    private internalEdges: Set<InternalEdge>;
    private normalCallSites: Set<CallSite>;
    private funPtrCallSite: Set<CallSite>;

    public getInternalEdges(): Set<InternalEdge> | undefined {
        return this.internalEdges;
    }

    public addNormalCallSite(cs: CallSite): void {
        this.normalCallSites = this.normalCallSites ?? new Set();
        this.normalCallSites.add(cs);
    }

    public getNormalCallSites(): Set<CallSite> {
        return this.normalCallSites;
    }

    public addInternalEdge(stmt: ArkAssignStmt, k: PagEdgeKind): boolean {
        this.internalEdges == undefined ? this.internalEdges = new Set() : undefined;
        let lhOp = stmt.getLeftOp();
        let rhOp = stmt.getRightOp();

        let iEdge: InternalEdge = { src: rhOp, dst: lhOp, kind: k, stmt: stmt};
        this.internalEdges.add(iEdge);

        return true;
    }
}
