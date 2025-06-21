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

import { ArkInstanceInvokeExpr } from "../../../core/base/Expr";
import { NodeID } from "../../../core/graph/GraphTraits";
import { ArkMethod } from "../../../core/model/ArkMethod";
import { CallGraph, CallGraphNode, FuncID, ICallSite } from "../../model/CallGraph";
import { ContextID } from "../context/Context";
import { Pag, PagEdgeKind, PagNewContainerExprNode, PagNode } from "../Pag";
import { PagBuilder } from "../PagBuilder";
import { BuiltApiType, getBuiltInApiType } from "../PTAUtils";
import { IPagPlugin } from "./IPagPlugin";
import { Value } from '../../../core/base/Value';
import { ArkAssignStmt, Stmt } from '../../../core/base/Stmt';
import { Local } from '../../../core/base/Local';
import { UnclearReferenceType } from '../../../core/base/Type';
import { FieldSignature, ClassSignature, FileSignature } from '../../../core/model/ArkSignature';

// built-in container APIs
const containerApiList = [
    BuiltApiType.ArrayPush,
    BuiltApiType.MapSet,
    BuiltApiType.MapGet,
    BuiltApiType.SetAdd,
];

/**
 * ContainerPlugin processes built-in container APIs like Array, Set, and Map.
 */
export class ContainerPlugin implements IPagPlugin {
    pag: Pag;
    pagBuilder: PagBuilder;
    cg: CallGraph;

    constructor(pag: Pag, pagBuilder: PagBuilder, cg: CallGraph) {
        this.pag = pag;
        this.pagBuilder = pagBuilder;
        this.cg = cg;
    }

    getName(): string {
        return "ContainerPlugin";
    }

    canHandle(cs: ICallSite, cgNode: CallGraphNode): boolean {
        let calleeFuncID = cs.getCalleeFuncID()!;
        let calleeMethod = this.cg.getArkMethodByFuncID(calleeFuncID);
        if (!calleeMethod) {
            return false;
        }

        let methodType = getBuiltInApiType(calleeMethod.getSignature());
        return containerApiList.includes(methodType);
    }

    processCallSite(cs: ICallSite, cid: ContextID, basePTNode: NodeID): NodeID[] {
        const baseValue = (cs.callStmt.getInvokeExpr() as ArkInstanceInvokeExpr).getBase();
        const baseNode = this.pag.getNode(basePTNode) as PagNode;
        const calleeFuncID: FuncID = cs.getCalleeFuncID()!;
        const calleeMethod: ArkMethod = this.cg.getArkMethodByFuncID(calleeFuncID)!;
        const methodType = getBuiltInApiType(calleeMethod.getSignature());
        let srcNodes: NodeID[] = [];

        if (!(baseNode instanceof PagNewContainerExprNode)) {
            return srcNodes;
        }

        switch (methodType) {
            case BuiltApiType.ArrayPush:
                // TODO: process push(...[])
                srcNodes.push(...this.processArrayPush(cs, cid, basePTNode, baseValue));
                break;
            case BuiltApiType.SetAdd:
                srcNodes.push(...this.processSetAdd(cs, cid, basePTNode, baseValue));
                break;
            case BuiltApiType.MapSet:
                srcNodes.push(...this.processMapSet(cs, cid, basePTNode, baseValue));
                break;
            case BuiltApiType.MapGet:
                srcNodes.push(...this.processMapGet(cs, cid, basePTNode, baseValue));
            default:
        }
        return srcNodes;
    }

    private processArrayPush(cs: ICallSite, cid: ContextID, basePt: NodeID, baseValue: Local): NodeID[] {
        const argIndex = 0;
        let argValue = cs.args![argIndex];
        if (!argValue) {
            return [];
        }

        const argNode = this.pag.getOrNewNode(cid, argValue, cs.callStmt) as PagNode;
        const containerFieldNode = this.pag.getOrClonePagContainerFieldNode(basePt, baseValue, 'Array');

        if (!containerFieldNode) {
            return [];
        }

        this.pag.addPagEdge(argNode, containerFieldNode, PagEdgeKind.Copy, cs.callStmt);
        return [argNode.getID()];
    }

    private processSetAdd(cs: ICallSite, cid: ContextID, basePt: NodeID, baseValue: Local): NodeID[] {
        const argIndex = 0;
        let argValue = cs.args![argIndex];
        if (!argValue) {
            return [];
        }

        const argNode = this.pag.getOrNewNode(cid, argValue, cs.callStmt) as PagNode;
        const containerFieldNode = this.pag.getOrClonePagContainerFieldNode(basePt, baseValue, 'Set');

        if (!containerFieldNode) {
            return [];
        }

        this.pag.addPagEdge(argNode, containerFieldNode, PagEdgeKind.Copy, cs.callStmt);
        return [argNode.getID()];
    }

    private processMapSet(cs: ICallSite, cid: ContextID, basePt: NodeID, baseValue: Local): NodeID[] {
        const argIndex = 1;
        let argValue = cs.args![argIndex];
        if (!argValue) {
            return [];
        }

        const argNode = this.pag.getOrNewNode(cid, argValue, cs.callStmt) as PagNode;
        const containerFieldNode = this.pag.getOrClonePagContainerFieldNode(basePt, baseValue, 'Map');

        if (!containerFieldNode) {
            return [];
        }

        this.pag.addPagEdge(argNode, containerFieldNode, PagEdgeKind.Copy, cs.callStmt);
        return [argNode.getID()];
    }

    private processMapGet(cs: ICallSite, cid: ContextID, basePt: NodeID, baseValue: Local): NodeID[] {
        const ivkExpr = cs.callStmt.getInvokeExpr();
        if (!ivkExpr || !(cs.callStmt instanceof ArkAssignStmt)) {
            return [];
        }
        const leftValue = cs.callStmt.getLeftOp();

        const leftValueNode = this.pag.getOrNewNode(cid, leftValue, cs.callStmt) as PagNode;
        const containerFieldNode = this.pag.getOrClonePagContainerFieldNode(basePt, baseValue, 'Map');

        if (!containerFieldNode) {
            return [];
        }

        this.pag.addPagEdge(containerFieldNode, leftValueNode, PagEdgeKind.Copy, cs.callStmt);
        return [containerFieldNode.getID()];
    }
}