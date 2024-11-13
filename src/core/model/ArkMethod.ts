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
import { BodyBuilder } from '../common/BodyBuilder';
import { ArkExport, ExportType } from './ArkExport';
import { ANONYMOUS_METHOD_PREFIX, DEFAULT_ARK_METHOD_NAME } from '../common/Const';
import { getColNo, getLineNo, LineCol, setCol, setLine } from '../base/Position';
import { ArkBaseModel } from './ArkBaseModel';
import { ArkError } from '../common/ArkError';

export const arkMethodNodeKind = ['MethodDeclaration', 'Constructor', 'FunctionDeclaration', 'GetAccessor',
    'SetAccessor', 'ArrowFunction', 'FunctionExpression', 'MethodSignature', 'ConstructSignature', 'CallSignature'];

/**
 * @category core/model
 */
export class ArkMethod extends ArkBaseModel implements ArkExport {
    private code?: string;
    private declaringArkClass!: ArkClass;

    private genericTypes?: GenericType[];

    private methodDeclareSignatures?: MethodSignature[];
    private methodDeclareLineCols?: LineCol[];

    private methodSignature?: MethodSignature;
    private lineCol?: LineCol;

    private body?: ArkBody;
    private viewTree?: ViewTree;

    private bodyBuilder?: BodyBuilder;

    private isGeneratedFlag: boolean = false;
    private asteriskToken: boolean = false;

    constructor() {
        super();
    }

    getExportType(): ExportType {
        return ExportType.METHOD;
    }

    public getName() {
        return this.getSignature().getMethodSubSignature().getMethodName();
    }

    /**
     * Returns the codes of method as a **string.**
     * @returns the codes of method.
     */
    public getCode() {
        return this.code;
    }

    public setCode(code: string) {
        this.code = code;
    }

    public getDeclareLines(): number[] | null {
        if (this.methodDeclareLineCols === undefined) {
            return null;
        }
        let lines: number[] = [];
        this.methodDeclareLineCols.forEach(lineCol => {
            lines.push(getLineNo(lineCol));
        })
        return lines;
    }

    public getDeclareLine(methodSignature: MethodSignature): number | null {
        const lineCols = this.methodDeclareLineCols;
        const signatures = this.methodDeclareSignatures;
        if (lineCols === undefined || signatures === undefined) {
            return null;
        }
        const index = this.getDeclareSignatureIndex(methodSignature);
        if (index < 0) {
            return null;
        }
        return getLineNo(lineCols[index]);
    }

    public getDeclareColumns(): number[] | null {
        if (this.methodDeclareLineCols === undefined) {
            return null;
        }
        let columns: number[] = [];
        this.methodDeclareLineCols.forEach(lineCol => {
            columns.push(getColNo(lineCol));
        })
        return columns;
    }

    public getDeclareColumn(methodSignature: MethodSignature): number | null {
        const lineCols = this.methodDeclareLineCols;
        const signatures = this.methodDeclareSignatures;
        if (lineCols === undefined || signatures === undefined) {
            return null;
        }
        const index = this.getDeclareSignatureIndex(methodSignature);
        if (index < 0) {
            return null;
        }
        return getColNo(lineCols[index]);
    }

    public setDeclareLinesAndCols(lines: number[], columns: number[]): void {
        if (lines?.length !== columns?.length) {
            return;
        }
        this.methodDeclareLineCols = [];
        lines.forEach((line, index) => {
            let lineCol: LineCol = 0
            lineCol = setLine(lineCol, line);
            lineCol = setCol(lineCol, columns[index]);
            (this.methodDeclareLineCols as LineCol[]).push(lineCol);
        });
    }

    public setDeclareLineCols(lineCols: LineCol[]): void {
        this.methodDeclareLineCols = lineCols;
    }

    public getDeclareLineCols(): LineCol[] | null {
        if (this.methodDeclareLineCols === undefined) {
            return null;
        } else {
            return this.methodDeclareLineCols;
        }
    }

    public addDeclareLineCol(line: number, column: number): void {
        if (this.methodDeclareLineCols === undefined) {
            this.methodDeclareLineCols = [];
        }
        let lineCol: LineCol = 0
        lineCol = setLine(lineCol, line);
        lineCol = setCol(lineCol, column);
        this.methodDeclareLineCols.push(lineCol);
    }

    public updateDeclareLine(line: number, methodSignature: MethodSignature): void {
        const lineCols = this.methodDeclareLineCols;
        const signatures = this.methodDeclareSignatures;
        if (lineCols === undefined || signatures === undefined) {
            return;
        }
        if (lineCols.length !== signatures.length) {
            return;
        }
        const index = this.getDeclareSignatureIndex(methodSignature);
        if (index >= 0) {
            let lineCol: LineCol = lineCols[index];
            lineCol = setLine(lineCol, line);
            (this.methodDeclareLineCols as LineCol[])[index] = lineCol;
        }
    }

    public updateDeclareColumn(column: number, methodSignature: MethodSignature): void {
        const lineCols = this.methodDeclareLineCols;
        const signatures = this.methodDeclareSignatures;
        if (lineCols === undefined || signatures === undefined) {
            return;
        }
        if (lineCols.length !== signatures.length) {
            return;
        }
        const index = this.getDeclareSignatureIndex(methodSignature);
        if (index >= 0) {
            let lineCol: LineCol = lineCols[index];
            lineCol = setCol(lineCol, column);
            (this.methodDeclareLineCols as LineCol[])[index] = lineCol;
        }
    }

    public updateDeclareLineAndCol(line: number, column: number, methodSignature: MethodSignature): void {
        const lineCols = this.methodDeclareLineCols;
        const signatures = this.methodDeclareSignatures;
        if (lineCols === undefined || signatures === undefined) {
            return;
        }
        if (lineCols.length !== signatures.length) {
            return;
        }
        const index = this.getDeclareSignatureIndex(methodSignature);
        if (index >= 0) {
            let lineCol: LineCol = lineCols[index];
            lineCol = setLine(lineCol, line);
            lineCol = setCol(lineCol, column);
            (this.methodDeclareLineCols as LineCol[])[index] = lineCol;
        }
    }

    public getLine(): number | null {
        if (this.lineCol === undefined) {
            return null;
        }
        return getLineNo(this.lineCol);
    }

    public setLine(line: number): void {
        if (this.lineCol === undefined) {
            this.lineCol = 0;
        }
        this.lineCol = setLine(this.lineCol, line);
    }

    public getColumn(): number | null {
        if (this.lineCol === undefined) {
            return null;
        }
        return getColNo(this.lineCol);
    }

    public setColumn(column: number): void {
        if (this.lineCol === undefined) {
            this.lineCol = 0;
        }
        this.lineCol = setCol(this.lineCol, column);
    }

    public getLineCol(): LineCol | null {
        if (this.lineCol === undefined) {
            return null;
        } else {
            return this.lineCol;
        }
    }

    public setLineCol(lineCol: LineCol): void {
        this.lineCol = lineCol;
    }

    /**
     * Returns the declaring class of the method.
     * @returns The declaring class of the method.
     */
    public getDeclaringArkClass() {
        return this.declaringArkClass;
    }

    public setDeclaringArkClass(declaringArkClass: ArkClass) {
        this.declaringArkClass = declaringArkClass;
    }

    public getDeclaringArkFile() {
        return this.declaringArkClass.getDeclaringArkFile();
    }

    public isDefaultArkMethod(): boolean {
        return this.getName() === DEFAULT_ARK_METHOD_NAME;
    }

    public isAnonymousMethod(): boolean {
        return this.getName().startsWith(ANONYMOUS_METHOD_PREFIX);
    }

    public getParameters() {
        return this.getSignature().getMethodSubSignature().getParameters();
    }

    public getReturnType() {
        return this.getSignature().getType();
    }

    public getDeclareSignatures(): MethodSignature[] | null {
        if (this.methodDeclareSignatures === undefined) {
            return null;
        }
        return this.methodDeclareSignatures;
    }

    public getDeclareSignatureIndex(targetSignature: MethodSignature): number {
        let declareSignatures = this.methodDeclareSignatures;
        if (declareSignatures === undefined) {
            return -1;
        }
        for (let i = 0; i < declareSignatures.length; i++) {
            if (declareSignatures[i].isMatch(targetSignature)) {
                return i;
            }
        }
        return -1;
    }

    public getImplementationSignature(): MethodSignature | null {
        if (this.methodSignature == undefined) {
            return null;
        }
        return this.methodSignature;
    }

    /**
     * <font color="red">?建议明确返回类型？</font>
     * Get the method signature of the implementation or first declaration if there is no implementation.
     * It includes two fields. one is ClassSignature, the other is MethodSubSignature.
     * The former indicates which class this method belong to,
     * the latter indicates the detail info of this method, 
     * such as method name, parameters, returnType, etc.
     * @returns The method signature.
     * @example
     * 1. New a body.

    ```typescript
    let mtd = new ArkMethod();
    // ... ...
    let signature = mtd.getSignature();
    // ... ...
    ```
     */
    public getSignature(): MethodSignature {
        if (this.methodSignature !== undefined) {
            return this.methodSignature;
        }
        return (this.methodDeclareSignatures as MethodSignature[])[0];
    }

    public setDeclarationSignatures(signatures: MethodSignature | MethodSignature[]): void {
        if (Array.isArray(signatures)) {
            this.methodDeclareSignatures = signatures;
        } else {
            this.methodDeclareSignatures = [signatures];
        }
    }

    public addDeclarationSignature(signature: MethodSignature): void {
        if (this.methodDeclareSignatures === undefined) {
            this.methodDeclareSignatures = [signature];
        } else if (this.getDeclareSignatureIndex(signature) < 0) {
            (this.methodDeclareSignatures as MethodSignature[]).push(signature);
        }
    }

    public updateDeclarationSignature(oldSignature: MethodSignature, newSignature: MethodSignature): void {
        let declareSignatures = this.methodDeclareSignatures;
        if (declareSignatures === undefined) {
            return;
        }
        declareSignatures.forEach((signature, index) => {
            if (signature.isMatch(oldSignature)) {
                (this.methodDeclareSignatures as MethodSignature[])[index] = newSignature;
                return;
            }
        });
    }

    public setImplementationSignature(methodSignature: MethodSignature): void {
        this.methodSignature = methodSignature;
    }

    public getSubSignature() {
        return this.getSignature().getMethodSubSignature();
    }

    public getGenericTypes(): GenericType[] | undefined {
        return this.genericTypes;
    }

    public isGenericsMethod(): boolean {
        return this.genericTypes !== undefined;
    }

    public setGenericTypes(genericTypes: GenericType[]): void {
        this.genericTypes = genericTypes;
    }

    public getBodyBuilder(): BodyBuilder | undefined {
        return this.bodyBuilder;
    }

    /**
     * Get {@link ArkBody} of a Method.
     * A {@link ArkBody} contains the CFG and actual instructions or operations to be executed for a method. 
     * It is analogous to the body of a function or method in high-level programming languages, 
     * which contains the statements and expressions that define what the function does.
     * @returns The {@link ArkBody} of a method.
     * @example
     * 1. Get cfg or stmt through ArkBody.

    ```typescript
    let cfg = this.scene.getMethod()?.getBody().getCfg();
    const body = arkMethod.getBody()
    ```

    2. Get local variable through ArkBody.

    ```typescript
    arkClass.getDefaultArkMethod()?.getBody().getLocals.forEach(local=>{...})
    let locals = arkFile().getDefaultClass().getDefaultArkMethod()?.getBody()?.getLocals();
    ```
     */
    public getBody(): ArkBody | undefined {
        return this.body;
    }

    public setBody(body: ArkBody) {
        this.body = body;
    }

    /**
     * Get the CFG (i.e., control flow graph) of a method. 
     * The CFG is a graphical representation of all possible control flow paths within a method's body.
     * A CFG consists of blocks, statements and goto control jumps.
     * @returns The CFG (i.e., control flow graph) of a method. 
     * @example
     * 1. get stmt through ArkBody cfg.

    ```typescript
    body = arkMethod.getBody();
    const cfg = body.getCfg();
    for (const threeAddressStmt of cfg.getStmts()) {
    ... ...
    }
    ```

    2. get blocks through ArkBody cfg.

    ```typescript
    const body = arkMethod.getBody();
    const blocks = [...body.getCfg().getBlocks()];
    for (let i=0; i<blocks.length; i++) {
    const block = blocks[i];
    ... ...
    for (const stmt of block.getStmts()) {
        ... ...
    }
    let text = "next;"
    for (const next of block.getSuccessors()) {
        text += blocks.indexOf(next) + ' ';
    }
    // ... ...
    }
    ```
     */
    public getCfg(): Cfg | undefined {
        return this.body?.getCfg();
    }

    public getOriginalCfg(): Cfg | undefined {
        return undefined;
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
            if (results.length === this.getParameters().length) {
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

    public setViewTree(viewTree: ViewTree) {
        this.viewTree = viewTree;
    }

    public getViewTree(): ViewTree | undefined {
        return this.viewTree;
    }

    public hasViewTree(): boolean {
        return this.viewTree !== undefined;
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

    public validate(): ArkError {
        return this.validateFields(['declaringArkClass', 'methodSignature']);
    }
}