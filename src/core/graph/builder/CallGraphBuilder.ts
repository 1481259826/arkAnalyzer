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

import { CallGraph, CallGraphNode, CallGraphNodeKind, Method } from '../CallGraph'
import { Scene } from '../../../Scene'
import { AbstractInvokeExpr, ArkInstanceInvokeExpr, ArkNewExpr, ArkStaticInvokeExpr } from "../../../core/base/Expr";
import { ClassType } from "../../../core/base/Type"
import { NodeID } from '../BaseGraph';
import { ClassHierarchyAnalysis } from '../callgraph/ClassHierarchyAnalysis';

export class CallGraphBuilder {
    private cg: CallGraph;
    private scene: Scene;

    constructor(c: CallGraph, s: Scene) {
        this.cg = c;
        this.scene = s;
    }

    public buildDirectCallGraph(): void {
        const methods = this.scene.getMethods();
        for (const method of methods) {
            let m = method.getSignature();
            let kind  = CallGraphNodeKind.real;
            if (method.isGenerated()) {// || method.getName() === '_DEFAULT_ARK_METHOD') {
                kind = CallGraphNodeKind.intrinsic;
            }
            if (method.getName() === 'constructor') {
                kind = CallGraphNodeKind.constructor;
            }

            this.cg.addCallGraphNode(m, kind);
        }

        for (const method of methods) {
            let cfg = method.getCfg();
            if (cfg === undefined) {
                // abstract method cfg is undefined
                continue;
            }
            let stmts = cfg.getStmts()
            for (const stmt of stmts) {
                let invokeExpr = stmt.getInvokeExpr();
                if (invokeExpr == undefined) {
                    continue;
                }

                let callee: Method | undefined = this.getDCCallee(invokeExpr);
                // abstract method will also be added into direct cg
                if (callee && invokeExpr instanceof ArkStaticInvokeExpr) {
                    this.cg.addDirectOrSpecialCallEdge(method.getSignature(), callee, stmt);
                } else if (callee && (invokeExpr instanceof ArkInstanceInvokeExpr && (
                    this.isConstructor(callee) || this.scene.getMethod(callee)?.isGenerated()))) {
                        this.cg.addDirectOrSpecialCallEdge(method.getSignature(), callee, stmt, false);
                } else {
                    this.cg.addDynamicCallInfo(stmt, method.getSignature(), callee);
                }
            }
        }

        // set entries at end
        this.setEntries();
    }

    public buildClassHierarchyCallGraph(entries: Method[]): void {
        let cgEntries: NodeID[] = []
        entries.forEach((entry: Method) => {
            cgEntries.push(this.cg.getCallGraphNodeByMethod(entry).getID())
        })
        this.cg.setEntries(cgEntries)

        let classHierarchyAnalysis: ClassHierarchyAnalysis = new ClassHierarchyAnalysis(this.scene)
        classHierarchyAnalysis.start
    }

    /// Get direct call callee
    private getDCCallee(invokeExpr: AbstractInvokeExpr): Method | undefined {
        return invokeExpr.getMethodSignature();
        // if (invokeExpr instanceof ArkInstanceInvokeExpr) {
        //     let baseType = invokeExpr.getBase().getType();
        //     if (baseType instanceof ClassType) {
        //         return invokeExpr.getMethodSignature();
        //     }
        // } else if (invokeExpr instanceof ArkStaticInvokeExpr) {
        //     return invokeExpr.getMethodSignature();
        // }

        // return undefined;
    }

    private isConstructor(m: Method): boolean {
        return m.getMethodSubSignature().getMethodName() === 'constructor';
    }
    
    public setEntries(): void {
        let nodesIter = this.cg.getNodesIter();
        let entries = Array.from(nodesIter)
            .filter(node => !node.hasIncomingEdges() && node.getKind() == CallGraphNodeKind.real
                && !(node as CallGraphNode).isBlankMethod)
            .map(node => node.getID());
        this.cg.setEntries(entries);
    }
}
