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
import { CLOSURES_LOCAL_NAME, NAME_DELIMITER, NAME_PREFIX } from './Const';
import { ArkParameterRef, ClosureFieldRef, GlobalRef } from '../base/Ref';
import { ArkAssignStmt, ArkInvokeStmt } from '../base/Stmt';
import { LexicalEnvType, FunctionType } from '../base/Type';

export class BodyBuilder {
    private cfgBuilder: CfgBuilder;
    private globals?: Map<string, GlobalRef>;

    constructor(methodSignature: MethodSignature, sourceAstNode: ts.Node, declaringMethod: ArkMethod, sourceFile: ts.SourceFile) {
        this.cfgBuilder = new CfgBuilder(sourceAstNode, methodSignature.getMethodSubSignature().getMethodName(), declaringMethod, sourceFile);
    }

    public build(): ArkBody | null {
        this.cfgBuilder.buildCfgBuilder();
        if (!this.cfgBuilder.isBodyEmpty()) {
            const { cfg, locals, globals, aliasTypeMap, traps } = this.cfgBuilder.buildCfgAndOriginalCfg();
            if (globals !== null) {
                this.setGlobals(globals);
            }
            cfg.buildDefUseStmt(locals);

            return new ArkBody(locals, cfg, aliasTypeMap, traps.length ? traps : undefined);
        }
        return null;
    }

    public getCfgBuilder(): CfgBuilder {
        return this.cfgBuilder;
    }

    public getGlobals(): Map<string, GlobalRef> | undefined {
        return this.globals;
    }

    public setGlobals(globals: Map<string, GlobalRef>): void {
        this.globals = globals;
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

    private moveGlobalToClosure(nestedGlobals: Map<string, GlobalRef>, outerLocals: Map<string, Local>, closures: LexicalEnvType): void {
        nestedGlobals!.forEach((value, key) => {
            const local = outerLocals!.get(key);
            if (local !== undefined) {
                closures.addClosure(local);
                nestedGlobals?.delete(key);
            }
        });
    }

    public distinguishGlobalAndClosure(): void {
        let outerMethod = this.getCfgBuilder().getDeclaringMethod();
        let outerGlobals = outerMethod.getBodyBuilder()?.getGlobals();
        outerMethod.freeBodyBuilder();
        let outerLocals = outerMethod.getBody()?.getLocals();
        if (outerGlobals !== undefined && outerLocals !== undefined) {
            this.moveLocalToGlobal(outerLocals, outerGlobals);
            if (outerGlobals.size > 0) {
                outerMethod.getBody()?.setUsedGlobals(outerGlobals);
            }
        }

        let nestedMethods = this.findNestedMethod(outerMethod.getName(), this.getCfgBuilder().declaringClass);
        if (nestedMethods === null) {
            return;
        }

        let closuresNum = 0;
        for (let nestedMethod of nestedMethods) {
            let nestedGlobals = nestedMethod.getBodyBuilder()?.getGlobals();
            nestedMethod.freeBodyBuilder();
            let nestedLocals = nestedMethod.getBody()?.getLocals();
            if (nestedLocals === undefined || nestedGlobals === undefined) {
                continue;
            }
            const nestedSignature = nestedMethod.getImplementationSignature();
            if (nestedSignature === null) {
                continue;
            }
            let closures = new LexicalEnvType(nestedSignature);
            if (outerLocals !== undefined) {
                this.moveGlobalToClosure(nestedGlobals, outerLocals, closures);
                if (closures.getClosures().length > 0) {
                    const closuresLocal = new Local(`${CLOSURES_LOCAL_NAME}${closuresNum}`, closures);
                    outerLocals.set(closuresLocal.getName(), closuresLocal);
                    this.updateMethodSignaturesAndStmts(nestedMethod, closuresLocal);
                    closuresNum++;
                }
            }
            this.moveLocalToGlobal(nestedLocals, nestedGlobals);
            if (nestedGlobals.size > 0) {
                nestedMethod.getBody()?.setUsedGlobals(nestedGlobals);
            }
        }
    }

    private updateMethodSignaturesAndStmts(method: ArkMethod, closuresLocal: Local): void {
        if (!(closuresLocal.getType() instanceof LexicalEnvType)) {
            return;
        }

        const declareSignatures = method.getDeclareSignatures();
        declareSignatures?.forEach((signature, index) => {
            method.setDeclareSignatureWithIndex(this.createNewSignature(closuresLocal, signature), index);
        });

        const implementSignature = method.getImplementationSignature();
        if (implementSignature !== null) {
            method.setImplementationSignature(this.createNewSignature(closuresLocal, implementSignature));
        }

        const outerMethod = method.getOuterMethod();
        if (outerMethod !== undefined) {
            this.updateSignatureInUsedStmts(outerMethod, method.getName(), closuresLocal);
        }

        this.addClosureParamsAssignStmts(closuresLocal, method);
    }

    private createNewSignature(closuresLocal: Local, oldSignature: MethodSignature): MethodSignature {
        let oldSubSignature = oldSignature.getMethodSubSignature();
        const params = oldSubSignature.getParameters();
        const closuresParam = new MethodParameter();
        closuresParam.setName(closuresLocal.getName());
        closuresParam.setType(closuresLocal.getType());
        params.unshift(closuresParam);
        let newSubSignature = new MethodSubSignature(
            oldSubSignature.getMethodName(),
            params,
            oldSubSignature.getReturnType(),
            oldSubSignature.isStatic()
        );
        return new MethodSignature(oldSignature.getDeclaringClassSignature(), newSubSignature);
    }

    private updateSignatureInUsedStmts(outerMethod: ArkMethod, nestedMethodName: string, closuresLocal: Local): void {
        const local = outerMethod.getBody()?.getLocals().get(nestedMethodName);
        if (local === undefined || !(local.getType() instanceof FunctionType)) {
            return;
        }

        // 更新外层函数的stmt中调用内层函数处的AbstractInvokeExpr中的函数签名和实参args，加入闭包参数
        for (const usedStmt of local.getUsedStmts()) {
            if (usedStmt instanceof ArkInvokeStmt) {
                this.updateSignatureAndArgsInIArkInvokeStmt(usedStmt, nestedMethodName, closuresLocal);
            }
            const defValue = usedStmt.getDef();
            if (defValue === null) {
                continue;
            }
            if (!(defValue instanceof Local) || !(defValue.getType() instanceof FunctionType)) {
                return;
            }
            for (const stmt of defValue.getUsedStmts()) {
                if (stmt instanceof ArkInvokeStmt) {
                    this.updateSignatureAndArgsInIArkInvokeStmt(stmt, defValue.getName(), closuresLocal);
                }
            }
        }
    }

    private updateSignatureAndArgsInIArkInvokeStmt(stmt: ArkInvokeStmt, callMethodName: string, closuresLocal: Local): void {
        const expr = stmt.getInvokeExpr();
        if (expr.getMethodSignature().getMethodSubSignature().getMethodName() !== callMethodName) {
            return;
        }
        expr.setMethodSignature(this.createNewSignature(closuresLocal, expr.getMethodSignature()));
        expr.getArgs().unshift(closuresLocal);
    }

    private addClosureParamsAssignStmts(closuresParam: Local, method: ArkMethod): void {
        const lexicalEnvType = closuresParam.getType();
        if (!(lexicalEnvType instanceof LexicalEnvType)) {
            return;
        }
        const closures = lexicalEnvType.getClosures();
        if (closures.length === 0) {
            return;
        }
        let oldParamRefs = method.getParameterRefs();
        let body = method.getBody();
        if (body === undefined) {
            return;
        }
        let stmts = Array.from(body.getCfg().getBlocks())[0].getStmts();
        let index = 0;
        const parameterRef = new ArkParameterRef(index, closuresParam.getType());
        const closuresLocal = new Local(closuresParam.getName(), closuresParam.getType());
        body.addLocal(closuresLocal.getName(), closuresLocal);
        let assignStmt = new ArkAssignStmt(closuresLocal, parameterRef);
        stmts.splice(index, 0, assignStmt);
        closuresLocal.setDeclaringStmt(assignStmt);

        oldParamRefs?.forEach((paramRef) => {
            index++;
            paramRef.setIndex(index);
        });

        for (let closure of closures) {
            const local = method.getBody()?.getLocals().get(closure.getName());
            if (local === undefined) {
                continue;
            }
            index++;
            const closureFieldRef = new ClosureFieldRef(closuresParam, closure.getName(), closure.getType());
            let assignStmt = new ArkAssignStmt(local, closureFieldRef);
            stmts.splice(index, 0, assignStmt);
            local.setDeclaringStmt(assignStmt);
            closuresLocal.addUsedStmt(assignStmt);
        }
    }


}