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

import { ArkBody } from '../model/ArkBody';
import { ArkMethod } from '../model/ArkMethod';
import { MethodSignature, MethodSubSignature } from '../model/ArkSignature';
import { CfgBuilder } from './CfgBuilder';
import * as ts from 'ohos-typescript';
import { Local } from '../base/Local';
import { MethodParameter } from '../model/builder/ArkMethodBuilder';
import { ArkClass } from '../model/ArkClass';
import { NAME_DELIMITER, NAME_PREFIX } from './Const';
import { ArkParameterRef, GlobalRef } from '../base/Ref';
import { ArkAssignStmt } from '../base/Stmt';

export class BodyBuilder {
    private cfgBuilder: CfgBuilder;
    private variableBuilder?: Map<string, GlobalRef>;

    constructor(methodSignature: MethodSignature, sourceAstNode: ts.Node, declaringMethod: ArkMethod, sourceFile: ts.SourceFile) {
        this.cfgBuilder = new CfgBuilder(sourceAstNode, methodSignature.getMethodSubSignature().getMethodName(), declaringMethod, sourceFile);
    }

    public build(): ArkBody | null {
        this.cfgBuilder.buildCfgBuilder();
        if (!this.cfgBuilder.isBodyEmpty()) {
            const { cfg, locals, globals, aliasTypeMap, traps } = this.cfgBuilder.buildCfgAndOriginalCfg();
            if (globals !== null) {
                this.setVariableBuilder(globals);
            }
            cfg.buildDefUseStmt();

            return new ArkBody(locals, cfg, aliasTypeMap, traps.length ? traps : undefined);
        }
        return null;
    }

    public getCfgBuilder(): CfgBuilder {
        return this.cfgBuilder;
    }

    public getVariableBuilder(): Map<string, GlobalRef> | undefined {
        return this.variableBuilder;
    }

    public setVariableBuilder(global: Map<string, GlobalRef>): void {
        this.variableBuilder = global;
    }

    private findNestedMethod(outerMethodName: string, arkClass: ArkClass): ArkMethod[] | null {
        let nestedMethods: ArkMethod[] = [];
        for (let method of arkClass.getMethods()) {
            if (!method.getName().startsWith(NAME_PREFIX) || !method.getName().endsWith(outerMethodName)) {
                continue;
            }
            const components = method.getName().split(NAME_DELIMITER);
            // TODO: 待支持多层嵌套，此处需按嵌套顺序返回多层级的method
            if (components.length === 2) {
                nestedMethods.push(method);
            }
        }
        if (nestedMethods.length > 0) {
            return nestedMethods;
        }
        return null;
    }

    private moveLocalToGlobal(locals: Map<string, Local>, globals: Map<string, GlobalRef>): void {
        globals.forEach((value, key) => {
            const local = locals.get(key);
            if (local !== undefined) {
                value.addUsedStmts(local.getUsedStmts());
                locals.delete(key);
            }
        });
    }

    private moveGlobalToClosure(nestedGlobals: Map<string, GlobalRef>, outerLocals: Map<string, Local>, closures: Local[]): void {
        nestedGlobals!.forEach((value, key) => {
            const local = outerLocals!.get(key);
            if (local !== undefined) {
                closures.push(local);
                nestedGlobals?.delete(key);
            }
        });
    }

    public distinguishGlobalAndClosure(): void {
        let outerMethod = this.getCfgBuilder().getDeclaringMethod();
        let outerGlobals = outerMethod.getBodyBuilder()?.getVariableBuilder();
        outerMethod.freeBodyBuilder();
        let outerLocals = outerMethod.getBody()?.getLocals();
        if (outerGlobals !== undefined && outerLocals !== undefined) {
            this.moveLocalToGlobal(outerLocals, outerGlobals);
            if (outerGlobals.size > 0) {
                outerMethod.getBody()?.setGlobal(outerGlobals);
            }
        }

        let nestedMethods = this.findNestedMethod(outerMethod.getName(), this.getCfgBuilder().declaringClass);
        if (nestedMethods === null) {
            return;
        }

        nestedMethods.forEach(nestedMethod => {
            let nestedGlobals = nestedMethod.getBodyBuilder()?.getVariableBuilder();
            nestedMethod.freeBodyBuilder();
            let nestedLocals = nestedMethod.getBody()?.getLocals();
            if (nestedGlobals !== undefined && nestedLocals !== undefined) {
                let closures: Local[] = [];
                if (outerLocals !== undefined) {
                    this.moveGlobalToClosure(nestedGlobals, outerLocals, closures);
                }
                this.moveLocalToGlobal(nestedLocals, nestedGlobals);
                if (nestedGlobals.size > 0) {
                    nestedMethod.getBody()?.setGlobal(nestedGlobals);
                }
                this.updateMethodSignaturesAndStmts(nestedMethod, closures);
            }
        });
    }

    private updateMethodSignaturesAndStmts(method: ArkMethod, closures: Local[]): void {
        let closureParameters: MethodParameter[] = [];
        closures.forEach((closure, key) => {
            let parameter = new MethodParameter();
            parameter.setName(closure.getName());
            parameter.setType(closure.getType());
            closureParameters.push(parameter);
        })

        const declareSignatures = method.getDeclareSignatures();
        declareSignatures?.forEach((signature, index) => {
            method.setDeclareSignatureWithIndex(this.createNewSignature(closureParameters, signature), index);
        });

        const implementSignature = method.getImplementationSignature();
        if (implementSignature !== null) {
            method.setImplementationSignature(this.createNewSignature(closureParameters, implementSignature));
        }

        this.addClosureParamsAssignStmts(closureParameters, method);
    }

    private addClosureParamsAssignStmts(closureParams: MethodParameter[], method: ArkMethod): void {
        let oldParamRefs = method.getParameterRefs();
        let body = method.getBody();
        if (body === undefined) {
            return;
        }
        let stmts = Array.from(body.getCfg().getBlocks())[0].getStmts();
        let index = 0;
        for (const methodParameter of closureParams) {
            const parameterRef = new ArkParameterRef(index, methodParameter.getType());
            let closureLocal = body.getLocals().get(methodParameter.getName());
            if (closureLocal === undefined) {
                closureLocal = new Local(methodParameter.getName(), parameterRef.getType());
                body.addLocal(methodParameter.getName(), closureLocal);
            } else {
                closureLocal.setType(parameterRef.getType());
            }
            let assignStmt = new ArkAssignStmt(closureLocal, parameterRef);
            stmts.splice(index, 0, assignStmt);
            closureLocal.setDeclaringStmt(assignStmt);
            index++;
        }
        oldParamRefs?.forEach((paramRef) => {
            paramRef.setIndex(index);
            index++;
        });
    }

    private createNewSignature(closureParameters: MethodParameter[], signature: MethodSignature): MethodSignature {
        let oldSubSignature = signature.getMethodSubSignature();
        let newSubSignature = new MethodSubSignature(
            oldSubSignature.getMethodName(),
            closureParameters.concat(oldSubSignature.getParameters()),
            oldSubSignature.getReturnType(),
            oldSubSignature.isStatic()
        );
        return new MethodSignature(signature.getDeclaringClassSignature(), newSubSignature);
    }
}