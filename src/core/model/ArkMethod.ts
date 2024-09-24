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

import { ArkParameterRef, ArkThisRef } from '../base/Ref';
import { ArkAssignStmt, ArkReturnStmt, Stmt } from '../base/Stmt';
import { GenericType } from '../base/Type';
import { Value } from '../base/Value';
import { Cfg } from '../graph/Cfg';
import { ViewTree } from '../graph/ViewTree';
import { ArkBody } from './ArkBody';
import { ArkClass } from './ArkClass';
import { MethodSignature } from './ArkSignature';
import { Decorator } from '../base/Decorator';
import { BodyBuilder } from '../common/BodyBuilder';
import { ArkExport, ExportType } from './ArkExport';
import { ANONYMOUS_METHOD_PREFIX, DEFAULT_ARK_METHOD_NAME } from '../common/Const';

export const arkMethodNodeKind = ['MethodDeclaration', 'Constructor', 'FunctionDeclaration', 'GetAccessor',
    'SetAccessor', 'ArrowFunction', 'FunctionExpression', 'MethodSignature', 'ConstructSignature', 'CallSignature'];

/**
 * @category core/model
 */
export class ArkMethod implements ArkExport {
    private code: string = '';
    private line: number = -1;
    private column: number = -1;

    private declaringArkClass!: ArkClass;

    private modifiers: Set<string | Decorator> = new Set<string | Decorator>();
    private genericTypes?: GenericType[];

    private methodSignature!: MethodSignature;

    private body?: ArkBody;
    private viewTree?: ViewTree;

    private bodyBuilder?: BodyBuilder;

    private isGeneratedFlag: boolean = false;
    private asteriskToken: boolean = false;

    constructor() {
    }

    getExportType(): ExportType {
        return ExportType.METHOD;
    }

    public getName() {
        return this.methodSignature.getMethodSubSignature().getMethodName();
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
        return this.declaringArkClass.getDeclaringArkFile();
    }

    public isExported(): boolean {
        return this.modifiers.has('ExportKeyword');
    }

    public isStatic(): boolean {
        if (this.modifiers.has('StaticKeyword')) {
            return true;
        }
        return false;
    }

    public isDefaultArkMethod(): boolean {
        return this.getName() === DEFAULT_ARK_METHOD_NAME;
    }

    public isAnonymousMethod(): boolean {
        return this.getName().startsWith(ANONYMOUS_METHOD_PREFIX);
    }

    public getParameters() {
        return this.methodSignature.getMethodSubSignature().getParameters();
    }

    public getReturnType() {
        return this.methodSignature.getType();
    }

    public getSignature() {
        return this.methodSignature;
    }

    public setSignature(methodSignature: MethodSignature) {
        this.methodSignature = methodSignature;
    }

    public getSubSignature() {
        return this.methodSignature.getMethodSubSignature();
    }

    public getModifiers() {
        return this.modifiers;
    }

    public addModifier(name: string | Decorator) {
        this.modifiers.add(name);
    }

    public getGenericTypes(): GenericType[] | undefined {
        return this.genericTypes;
    }

    public isGenericsMethod(): boolean {
        return this.genericTypes != undefined;
    }

    public setGenericTypes(genericTypes: GenericType[]): void {
        this.genericTypes = genericTypes;
    }

    public containsModifier(name: string) {
        return this.modifiers.has(name);
    }

    public getBody(): ArkBody | undefined {
        return this.body;
    }

    public setBody(body: ArkBody) {
        this.body = body;
    }

    public getCfg(): Cfg | undefined {
        return this.body?.getCfg();
    }

    public getOriginalCfg(): Cfg | undefined {
        return this.body?.getOriginalCfg();
    }

    public getParameterInstances(): Value[] {
        // 获取方法体中参数Local实例
        let stmts: Stmt[] = [];
        if (this.getCfg()) {
            const cfg = this.getCfg() as Cfg;
            stmts.push(...cfg.getStmts());
        }
        let results: Value[] = [];
        for (let stmt of stmts) {
            if (stmt instanceof ArkAssignStmt) {
                if (stmt.getRightOp() instanceof ArkParameterRef) {
                    results.push((stmt as ArkAssignStmt).getLeftOp());
                }
            }
            if (results.length == this.getParameters().length) {
                return results;
            }
        }
        return results;
    }

    public getThisInstance(): Value | null {
        // 获取方法体中This实例
        let stmts: Stmt[] = [];
        if (this.getCfg()) {
            const cfg = this.getCfg() as Cfg;
            stmts.push(...cfg.getStmts());
        }
        for (let stmt of stmts) {
            if (stmt instanceof ArkAssignStmt) {
                if (stmt.getRightOp() instanceof ArkThisRef) {
                    return stmt.getLeftOp();
                }
            }
        }
        return null;
    }

    public getReturnValues(): Value[] {
        // 获取方法体中return值实例
        let resultValues: Value[] = [];
        let stmts: Stmt[] = [];
        if (this.getCfg()) {
            const cfg = this.getCfg() as Cfg;
            stmts.push(...cfg.getStmts());
        }
        for (let stmt of stmts) {
            if (stmt instanceof ArkReturnStmt) {
                resultValues.push(stmt.getOp());
            }
        }
        return resultValues;
    }

    public getReturnStmt(): Stmt[] {
        return this.getCfg()!.getStmts().filter(stmt => stmt instanceof ArkReturnStmt);
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

    public getViewTree(): ViewTree | undefined {
        return this.viewTree;
    }

    public hasViewTree(): boolean {
        return this.viewTree != undefined;
    }

    public setBodyBuilder(bodyBuilder: BodyBuilder) {
        this.bodyBuilder = bodyBuilder;
        if (this.getDeclaringArkFile().getScene().buildClassDone()) {
            this.buildBody();
        }
    }

    public buildBody() {
        if (this.bodyBuilder) {
            const arkBody: ArkBody | null = this.bodyBuilder.build();
            if (arkBody) {
                this.setBody(arkBody);
                arkBody.getCfg().setDeclaringMethod(this);

            }
            this.bodyBuilder = undefined;
        }
    }

    public isGenerated(): boolean {
        return this.isGeneratedFlag;
    }

    public setIsGeneratedFlag(isGeneratedFlag: boolean) {
        this.isGeneratedFlag = isGeneratedFlag;
    }

    public getAsteriskToken(): boolean {
        return this.asteriskToken;
    }

    public setAsteriskToken(asteriskToken: boolean) {
        this.asteriskToken = asteriskToken;
    }
}