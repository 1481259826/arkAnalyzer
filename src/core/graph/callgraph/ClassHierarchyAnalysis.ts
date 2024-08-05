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

import { ArkStaticInvokeExpr } from "../../base/Expr";
import { Stmt } from "../../base/Stmt";
import { ArkClass } from "../../model/ArkClass";
import { MethodSignature } from "../../model/ArkSignature";
import { NodeID } from "../BaseGraph";
import { CallSite, FuncID } from "../CallGraph";
import { AbstractAnalysis } from "./AbstractAnalysis";
type Method = MethodSignature

export class ClassHierarchyAnalysis extends AbstractAnalysis {
    public resolveCall(callerMethod: NodeID, invokeStmt: Stmt): CallSite[] {
        let invokeExpr = invokeStmt.getInvokeExpr()
        let resolveResult: CallSite[] = []

        if (!invokeExpr) {
            return []
        }
        let calleeMethod = this.resolveInvokeExpr(invokeExpr)
        if (!calleeMethod) {
            return resolveResult
        }
        if (invokeExpr instanceof ArkStaticInvokeExpr) {
            // get specific method
            // resolveResult.push(calleeMethod.getSignature())
            resolveResult.push(new CallSite(invokeStmt, undefined, 
                this.cg.getCallGraphNodeByMethod(calleeMethod.getSignature()).getID(), 
                callerMethod))
        } else {
            let declareClass = calleeMethod.getDeclaringArkClass()
            this.getClassHierarchy(declareClass).forEach((arkClass: ArkClass) => {
                resolveResult.push(
                    ...arkClass.getMethods()
                        .filter(arkMethod => 
                            arkMethod.getSignature().getMethodSubSignature().toString() === 
                            calleeMethod.getSubSignature().toString()
                        )
                        .map(arkMethod => new CallSite(
                            invokeStmt, undefined, 
                            this.cg.getCallGraphNodeByMethod(arkMethod.getSignature()).getID(), callerMethod))
                );
            })
        }

        return resolveResult
    }
    
}