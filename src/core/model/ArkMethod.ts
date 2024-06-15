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

import { ArkParameterRef, ArkThisRef } from "../base/Ref";
import { ArkAssignStmt, ArkReturnStmt } from "../base/Stmt";
import { Type, UnknownType } from "../base/Type";
import { Value } from "../base/Value";
import { Cfg } from "../graph/Cfg";
import { ViewTree } from "../graph/ViewTree";
import { ArkBody } from "./ArkBody";
import { ArkClass } from "./ArkClass";
import { ArkFile } from "./ArkFile";
import { MethodSignature, MethodSubSignature } from "./ArkSignature";
import { Decorator } from "../base/Decorator";
import { MethodParameter } from "./builder/ArkMethodBuilder";
import { BodyBuilder } from "../common/BodyBuilder";
import {ArkExport, ExportType} from "./ArkExport";

export const arkMethodNodeKind = ['MethodDeclaration', 'Constructor', 'FunctionDeclaration', 'GetAccessor',
    'SetAccessor', 'ArrowFunction', 'FunctionExpression', 'MethodSignature', 'ConstructSignature', 'CallSignature'];

export class ArkMethod implements ArkExport {
    private name: string;
    private code: string;
    private line: number = -1;
    private column: number = -1;

    private declaringArkFile: ArkFile;
    private declaringArkClass: ArkClass;

    private returnType: Type = UnknownType.getInstance();
    private parameters: MethodParameter[] = [];
    private modifiers: Set<string | Decorator> = new Set<string | Decorator>();
    private typeParameters: Type[] = [];

    private methodSignature: MethodSignature;
    private methodSubSignature: MethodSubSignature;

    private body: ArkBody;
    private viewTree: ViewTree;

    private bodyBuilder?: BodyBuilder;

    constructor() {
    }

    getType(): ExportType {
        return ExportType.METHOD;
    }

    public getName() {
        return this.name;
    }

    public setName(name: string) {
        this.name = name;
    }

    public getCode() {
        return this.code;
    }

    public setCode(code: string) {
        this.code = code;
    }

    public getLine() {
        return this.line;
    }

    public setLine(line: number) {
        this.line = line;
    }

    public getColumn() {
        return this.column;
    }

    public setColumn(column: number) {
        this.column = column;
    }

    public getDeclaringArkClass() {
        return this.declaringArkClass;
    }

    public setDeclaringArkClass(declaringArkClass: ArkClass) {
        this.declaringArkClass = declaringArkClass;
    }

    public getDeclaringArkFile() {
        return this.declaringArkFile;
    }

    public setDeclaringArkFile() {
        this.declaringArkFile = this.getDeclaringArkClass().getDeclaringArkFile();
    }

    public isExported(): boolean {
        return this.modifiers.has('ExportKeyword');
    }

    public isStatic(): boolean {
        if (this.modifiers.has("StaticKeyword")) {
            return true;
        }
        return false;
    }

    public isDefaultArkMethod(): boolean {
        return this.getName() === "_DEFAULT_ARK_METHOD";
    }

    public getParameters() {
        return this.parameters;
    }

    public addParameter(methodParameter: MethodParameter) {
        this.parameters.push(methodParameter);
    }

    public getReturnType() {
        return this.returnType;
    }

    public setReturnType(type: Type) {
        this.returnType = type;
        if (this.methodSubSignature) {
            this.methodSubSignature.setReturnType(type);
        }
    }

    public getSignature() {
        return this.methodSignature;
    }

    public setSignature(methodSignature: MethodSignature) {
        this.methodSignature = methodSignature;
    }

    public getSubSignature() {
        return this.methodSubSignature;
    }

    public setSubSignature(methodSubSignature: MethodSubSignature) {
        this.methodSubSignature = methodSubSignature;
    }

    public genSignature() {
        let mtdSubSig = new MethodSubSignature();
        mtdSubSig.setMethodName(this.name);
        mtdSubSig.setParameters(this.parameters);
        mtdSubSig.setReturnType(this.returnType);
        if (this.isStatic()) {
            mtdSubSig.setStatic();
        }
        this.setSubSignature(mtdSubSig);

        let mtdSig = new MethodSignature();
        mtdSig.setDeclaringClassSignature(this.declaringArkClass.getSignature());
        mtdSig.setMethodSubSignature(mtdSubSig);
        this.setSignature(mtdSig);
    }

    public getModifiers() {
        return this.modifiers;
    }

    public addModifier(name: string | Decorator) {
        this.modifiers.add(name);
    }

    public getTypeParameter() {
        return this.typeParameters;
    }

    public addTypeParameter(typeParameter: Type) {
        this.typeParameters.push(typeParameter);
    }

    public containsModifier(name: string) {
        return this.modifiers.has(name);
    }

    public getBody() {
        return this.body;
    }

    public setBody(body: ArkBody) {
        this.body = body;
    }

    public getCfg(): Cfg {
        return this.body.getCfg();
    }

    public getOriginalCfg() {
        return this.body.getOriginalCfg();
    }

    public getParameterInstances(): Value[] {
        // 获取方法体中参数Local实例
        let stmts = this.getCfg().getStmts()
        let results: Value[] = []
        for (let stmt of stmts) {
            if (stmt instanceof ArkAssignStmt) {
                if (stmt.getRightOp() instanceof ArkParameterRef) {
                    results.push((stmt as ArkAssignStmt).getLeftOp())
                }
            }
            if (results.length == this.getParameters().length) {
                return results
            }
        }
        return results
    }

    public getThisInstance(): Value | null {
        // 获取方法体中This实例
        let stmts = this.getCfg().getStmts()
        let results: Value[] = []
        for (let stmt of stmts) {
            if (stmt instanceof ArkAssignStmt) {
                if (stmt.getRightOp() instanceof ArkThisRef) {
                    return stmt.getLeftOp()
                }
            }
        }
        return null
    }

    public getReturnValues(): Value[] {
        // 获取方法体中return值实例
        let resultValues: Value[] = []
        let stmts = this.getCfg().getStmts()
        for (let stmt of stmts) {
            if (stmt instanceof ArkReturnStmt) {
                resultValues.push(stmt.getOp())
            }
        }
        return resultValues
    }

    public getDecorators(): Decorator[] {
        return Array.from(this.modifiers).filter((item) => {
            return item instanceof Decorator;
        }) as Decorator[];
    }

    public hasBuilderDecorator(): boolean {
        let decorators = this.getDecorators();
        return decorators.filter((value) => {
            return value.getKind() == 'Builder';
        }).length != 0;
    }

    public setViewTree(viewTree: ViewTree) {
        this.viewTree = viewTree;
    }

    public getViewTree(): ViewTree {
        if (this.hasViewTree() && !this.viewTree.isInitialized()) {
            this.viewTree.buildViewTree();
        }
        return this.viewTree;
    }

    public hasViewTree(): boolean {
        return this.viewTree != undefined;
    }

    public setBodyBuilder(bodyBuilder: BodyBuilder) {
        this.bodyBuilder = bodyBuilder;
        if (this.declaringArkFile.getScene().buildClassDone()) {
            this.buildBody();
        }
    }

    public buildBody() {
        if (this.bodyBuilder) {
            this.setBody(this.bodyBuilder.build());
            this.getCfg().setDeclaringMethod(this);
            if (this.getName() == 'constructor' && this.getDeclaringArkClass()) {
                this.getCfg().constructorAddInit(this);
            }
            this.bodyBuilder = undefined;
        }
    }
}