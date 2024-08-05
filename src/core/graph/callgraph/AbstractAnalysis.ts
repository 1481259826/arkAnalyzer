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

import { Scene } from "../../../Scene";
import { AbstractInvokeExpr } from "../../base/Expr";
import { Stmt } from "../../base/Stmt";
import { ModelUtils } from "../../common/ModelUtils";
import { ArkClass } from "../../model/ArkClass";
import { ArkMethod } from "../../model/ArkMethod";
import { NodeID } from "../BaseGraph";
import { CallGraphBuilder } from "../builder/CallGraphBuilder";
import { CallGraph, CallGraphNode, CallSite, FuncID, Method } from "../CallGraph";

export abstract class AbstractAnalysis {
    protected scene: Scene
    protected cg: CallGraph;
    protected cgBuilder: CallGraphBuilder;
    protected workList: FuncID[] = []
    
    constructor(s: Scene) {
        this.scene = s
    }

    public getScene(): Scene {
        return this.scene
    }

    protected abstract resolveCall(sourceMethod: NodeID, invokeStmt: Stmt): CallSite[]

    public resolveInvokeExpr(invokeExpr: AbstractInvokeExpr): ArkMethod | undefined {
        const method = this.scene.getMethod(invokeExpr.getMethodSignature())
        if (method != null) {
            return method
        }

        // const methodSignature = invokeExpr.getMethodSignature()
        // const sdkFiles = this.scene.getSdkArkFilesMap().values()
        // for (let sdkFile of sdkFiles) {
        //     if (methodSignature.getDeclaringClassSignature().getDeclaringFileSignature().toString() == 
        //     sdkFile.getFileSignature().toString()) {
        //         const methods = ModelUtils.getAllMethodsInFile(sdkFile);
        //         for (let methodUnderFile of methods) {
        //             if (methodSignature.toString() == methodUnderFile.getSignature().toString()) {
        //                 return methodUnderFile;
        //             }
        //         }
        //     }
        // }
    }

    public getClassHierarchy(arkClass: ArkClass): ArkClass[] {
        let classWorkList: ArkClass[] = [arkClass]
        // TODO: check class with no super Class
        let classHierarchy: ArkClass[] = [arkClass.getSuperClass()]

        while(classWorkList.length > 0) {
            // TODO: no dumplicated check, TS doesn't allow multi extend
            let tempClass = classWorkList.shift()!
            classWorkList.push(...tempClass.getExtendedClasses().values())
            classHierarchy.push(tempClass)
        }

        return classHierarchy
    }

    public start(): void {
        this.init()
        while (this.workList.length != 0) {
            const method = this.workList.shift() as FuncID
            this.processMethod(method).forEach((cs: CallSite) => {
                this.cg.addDynamicCallEdge(method, cs.calleeFuncID, cs.callStmt)
                this.workList.push(cs.calleeFuncID)
            })
        }
    }

    protected init(): void {
        this.cg.getEntries().forEach((entryFunc) => {
            this.workList.push(entryFunc)
        })
    }

    protected processMethod(methodID: FuncID): CallSite[] {
        let cgNode = this.cg.getNode(methodID) as CallGraphNode
        let arkMethod = this.scene.getMethod(cgNode.getMethod());
        let calleeMethods: CallSite[] = []

        if (!arkMethod) {
            throw new Error("can not find method");
        }

        const cfg = arkMethod.getCfg()
        if (!cfg) {
            return []
        }
        cfg.getStmts().forEach((stmt) => {
            if (stmt.containsInvokeExpr()) {
                calleeMethods.push(...this.resolveCall(cgNode.getID(), stmt))
            }
        })

        return calleeMethods
    }
}