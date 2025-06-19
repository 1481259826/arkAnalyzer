/*
 * Copyright (c) 2025 Huawei Device Co., Ltd.
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

import { Constant } from "../../../core/base/Constant";
import { AbstractInvokeExpr, ArkInstanceInvokeExpr, ArkStaticInvokeExpr } from "../../../core/base/Expr";
import { Local } from "../../../core/base/Local";
import { Stmt, ArkAssignStmt } from "../../../core/base/Stmt";
import { ClassType, StringType } from "../../../core/base/Type";
import { Value } from "../../../core/base/Value";
import { NodeID } from "../../../core/graph/GraphTraits";
import { ArkMethod } from "../../../core/model/ArkMethod";
import { CallGraph, CallGraphNode, FuncID } from "../../model/CallGraph";
import { CallSite, ICallSite } from "../../model/CallSite";
import { ContextID } from "../context/Context";
import { Pag, PagEdgeKind, PagLocalNode, PagNode } from "../Pag";
import { PagBuilder } from "../PagBuilder";
import { IPagPlugin } from "./IPagPlugin";

export enum StorageType {
    APP_STORAGE,
    LOCAL_STORAGE,
    SUBSCRIBED_ABSTRACT_PROPERTY,
    Undefined,
}

export enum StorageLinkEdgeType {
    Property2Local,
    Local2Property,
    TwoWay,
}

// plugins/StoragePlugin.ts
export class StoragePlugin implements IPagPlugin {
    pag: Pag;
    pagBuilder: PagBuilder;
    cg: CallGraph;
    private storagePropertyMap: Map<StorageType, Map<string, Local>> = new Map();

    constructor(pag: Pag, pagBuilder: PagBuilder, cg: CallGraph) {
        this.pag = pag;
        this.pagBuilder = pagBuilder;
        this.cg = cg;

        // Initialize storagePropertyMap for each StorageType
        this.storagePropertyMap.set(StorageType.APP_STORAGE, new Map());
        this.storagePropertyMap.set(StorageType.LOCAL_STORAGE, new Map());
    }

    getName(): string {
        return 'StoragePlugin';
    }

    canHandle(cs: ICallSite, cgNode: CallGraphNode): boolean {
        const storageName = cgNode.getMethod().getDeclaringClassSignature().getClassName();
        return this.getStorageType(storageName) !== StorageType.Undefined;
    }

    processCallSite(cs: ICallSite, cid: ContextID, emptyNode: NodeID): NodeID[] {
        let calleeFuncID = cs.getCalleeFuncID();
        if (!calleeFuncID) {
            return [];
        }

        const cgNode = this.cg.getNode(calleeFuncID) as CallGraphNode;
        const storageName = cgNode.getMethod().getDeclaringClassSignature().getClassName();
        const storageType = this.getStorageType(storageName);
        const calleeName = cgNode.getMethod().getMethodSubSignature().getMethodName();

        this.processStorageAPI(cs, cid, storageType, calleeName, this.pagBuilder);
        return [];
    }

    /**
     * get storageType enum with method's Declaring ClassName
     *
     * @param storageName ClassName that method belongs to, currently support AppStorage and SubscribedAbstractProperty
     * SubscribedAbstractProperty: in following listing, `link1` is infered as ClassType `SubscribedAbstractProperty`,
     * it needs to get PAG node to check the StorageType
     * let link1: SubscribedAbstractProperty<A> = AppStorage.link('PropA');
     * link1.set(a);
     * @param cs: for search PAG node in SubscribedAbstractProperty
     * @param cid: for search PAG node in SubscribedAbstractProperty
     * @returns StorageType enum
     */
    private getStorageType(storageName: string): StorageType {
        switch (storageName) {
            case 'AppStorage':
                return StorageType.APP_STORAGE;
            case 'SubscribedAbstractProperty':
                return StorageType.SUBSCRIBED_ABSTRACT_PROPERTY;
            case 'LocalStorage':
                return StorageType.LOCAL_STORAGE;
            default:
                return StorageType.Undefined;
        }
    }

    private processStorageAPI(cs: ICallSite, cid: ContextID, storageType: StorageType, calleeName: string, pagBuilder: PagBuilder): boolean {
        switch (calleeName) {
            case 'setOrCreate':
                return this.processStorageSetOrCreate(cs, cid, storageType);
            case 'link':
                return this.processStorageLink(cs, cid, storageType);
            case 'prop':
                return this.processStorageProp(cs, cid, storageType);
            case 'set':
                return this.processStorageSet(cs, cid, storageType);
            case 'get':
                return this.processStorageGet(cs, cid, storageType);
            default:
                return false;
        }

    }

    private processStorageSetOrCreate(cs: ICallSite, cid: ContextID, storageType: StorageType): boolean {
        let propertyStr = this.getPropertyName(cs.args![0]);
        if (!propertyStr) {
            return false;
        }

        let propertyName = propertyStr;
        let propertyNode = this.getOrNewPropertyNode(StorageType.APP_STORAGE, propertyName, cs.callStmt);

        if (storageType === StorageType.APP_STORAGE) {
            let storageObj = cs.args![1];

            return this.addPropertyLinkEdge(propertyNode, storageObj, cid, cs.callStmt, StorageLinkEdgeType.Local2Property);
        } else if (storageType === StorageType.LOCAL_STORAGE) {
            // TODO: WIP
        }

        return false;
    }

    /**
     * search the storage map to get propertyNode with given storage and propertyFieldName
     * @param storage storage type: AppStorage, LocalStorage etc.
     * @param propertyName string property key
     * @returns propertyNode: PagLocalNode
     */
    public getOrNewPropertyNode(storage: StorageType, propertyName: string, stmt: Stmt): PagNode {
        let storageMap = this.storagePropertyMap.get(storage)!;

        let propertyLocal = storageMap.get(propertyName);

        if (!propertyLocal) {
            propertyLocal = new Local(propertyName);
            storageMap.set(propertyName, propertyLocal);
        }

        return this.pag.getOrNewNode(-1, propertyLocal, stmt);
    }

    /**
     * add PagEdge
     * @param edgeKind: edge kind differs from API
     * @param propertyNode: PAG node created by protpertyName
     * @param obj: heapObj stored with Storage API
     */
    public addPropertyLinkEdge(propertyNode: PagNode, storageObj: Value, cid: ContextID, stmt: Stmt, edgeKind: number): boolean {
        if (!(storageObj.getType() instanceof ClassType)) {
            return false;
        }

        if (edgeKind === StorageLinkEdgeType.Property2Local) {
            // propertyNode --> objNode
            this.pag.addPagEdge(propertyNode, this.pag.getOrNewNode(cid, storageObj), PagEdgeKind.Copy, stmt);
        } else if (edgeKind === StorageLinkEdgeType.Local2Property) {
            // propertyNode <-- objNode
            this.pag.addPagEdge(this.pag.getOrNewNode(cid, storageObj), propertyNode, PagEdgeKind.Copy, stmt);
        } else if (edgeKind === StorageLinkEdgeType.TwoWay) {
            // propertyNode <-> objNode
            this.pag.addPagEdge(propertyNode, this.pag.getOrNewNode(cid, storageObj), PagEdgeKind.Copy, stmt);
            this.pag.addPagEdge(this.pag.getOrNewNode(cid, storageObj), propertyNode, PagEdgeKind.Copy, stmt);
        }
        return true;
    }

    private processStorageLink(cs: ICallSite, cid: ContextID, storageType: StorageType): boolean {
        let propertyStr = this.getPropertyName(cs.args![0]);
        if (!propertyStr) {
            return false;
        }

        let propertyName = propertyStr;
        let propertyNode = this.getOrNewPropertyNode(StorageType.APP_STORAGE, propertyName, cs.callStmt);
        let leftOp = (cs.callStmt as ArkAssignStmt).getLeftOp() as Local;
        let linkedOpNode = this.pag.getOrNewNode(cid, leftOp) as PagNode;

        if (storageType === StorageType.APP_STORAGE) {
            if (linkedOpNode instanceof PagLocalNode) {
                linkedOpNode.setStorageLink(StorageType.APP_STORAGE, propertyName);
            }

            this.pag.addPagEdge(propertyNode, linkedOpNode, PagEdgeKind.Copy);
            this.pag.addPagEdge(linkedOpNode, propertyNode, PagEdgeKind.Copy);
        } else if (storageType === StorageType.LOCAL_STORAGE) {
            // TODO: WIP
        }
        return false;
    }

    private processStorageProp(cs: ICallSite, cid: ContextID, storageType: StorageType): boolean {
        let propertyStr = this.getPropertyName(cs.args![0]);
        if (!propertyStr) {
            return false;
        }

        let propertyName = propertyStr;
        let propertyNode = this.getOrNewPropertyNode(StorageType.APP_STORAGE, propertyName, cs.callStmt);
        let leftOp = (cs.callStmt as ArkAssignStmt).getLeftOp() as Local;
        let linkedOpNode = this.pag.getOrNewNode(cid, leftOp) as PagNode;
        if (linkedOpNode instanceof PagLocalNode) {
            linkedOpNode.setStorageLink(StorageType.APP_STORAGE, propertyName);
        }

        this.pag.addPagEdge(propertyNode, linkedOpNode, PagEdgeKind.Copy);

        if (storageType === StorageType.APP_STORAGE) {
            // If it's AppStorage, we can also link the property to the storage object
            let storageObj = cs.args![1];
            return this.addPropertyLinkEdge(propertyNode, storageObj, cid, cs.callStmt, StorageLinkEdgeType.TwoWay);
        } else if (storageType === StorageType.LOCAL_STORAGE) {
            // TODO: WIP
        }

        return false;
    }

    private processStorageSet(cs: ICallSite, cid: ContextID, storageType: StorageType): boolean {
        let ivkExpr: AbstractInvokeExpr = cs.callStmt.getInvokeExpr()!;

        if (ivkExpr instanceof ArkInstanceInvokeExpr) {
            let base = ivkExpr.getBase();
            let baseNode = this.pag.getOrNewNode(cid, base) as PagLocalNode;

            if (baseNode.isStorageLinked()) {
                let argsNode = this.pag.getOrNewNode(cid, cs.args![0]) as PagNode;

                this.pag.addPagEdge(argsNode, baseNode, PagEdgeKind.Copy);
                return true;
            }
        } else if (ivkExpr instanceof ArkStaticInvokeExpr) {
            // TODO: process AppStorage.set()
        }

        return false;
    }

    private processStorageGet(cs: ICallSite, cid: ContextID, storageType: StorageType): boolean {
        if (!(cs.callStmt instanceof ArkAssignStmt)) {
            return false;
        }

        let leftOp = (cs.callStmt as ArkAssignStmt).getLeftOp() as Local;
        let ivkExpr = cs.callStmt.getInvokeExpr();
        let propertyName!: string;
        if (ivkExpr instanceof ArkStaticInvokeExpr) {
            let propertyStr = this.getPropertyName(cs.args![0]);
            if (propertyStr) {
                propertyName = propertyStr;
            }
        } else if (ivkExpr instanceof ArkInstanceInvokeExpr) {
            let baseNode = this.pag.getOrNewNode(cid, ivkExpr.getBase()) as PagLocalNode;
            if (baseNode.isStorageLinked()) {
                propertyName = baseNode.getStorage().PropertyName!;
            }
        }

        let propertyNode = this.getOrNewPropertyNode(storageType, propertyName, cs.callStmt);
        if (!propertyNode) {
            return false;
        }

        this.pag.addPagEdge(propertyNode, this.pag.getOrNewNode(cid, leftOp, cs.callStmt), PagEdgeKind.Copy, cs.callStmt);
        return true;
    }

    private getPropertyName(value: Value): string | undefined {
        if (value instanceof Local) {
            let type = value.getType();
            if (type instanceof StringType) {
                return type.getName();
            }
        } else if (value instanceof Constant) {
            return value.getValue();
        }

        return undefined;
    }
}