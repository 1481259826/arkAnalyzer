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

import { Constant } from '../../core/base/Constant';
import { ArkInstanceInvokeExpr, ArkNewArrayExpr, ArkNewExpr, ArkStaticInvokeExpr } from '../../core/base/Expr';
import { Local } from '../../core/base/Local';
import { ArkArrayRef, ArkInstanceFieldRef, ArkParameterRef, ArkStaticFieldRef } from '../../core/base/Ref';
import {
    ArkAssignStmt,
    ArkGotoStmt,
    ArkIfStmt,
    ArkInvokeStmt,
    ArkReturnStmt,
    ArkReturnVoidStmt,
    ArkSwitchStmt,
    ArkThrowStmt,
    Stmt,
} from '../../core/base/Stmt';
import { ClassType, Type } from '../../core/base/Type';
import { Value } from '../../core/base/Value';
import Logger from '../../utils/logger';
import { ArkCodeBuffer } from '../ArkStream';
import { Dump } from './SourceBase';
import { StmtReader } from './SourceBody';
import { SourceTransformer, TransformerContext } from './SourceTransformer';
import { Origin_Component, Origin_Object, Origin_TypeLiteral, SourceUtils } from './SourceUtils';

const logger = Logger.getLogger();

export interface StmtPrinterContext extends TransformerContext {
    getStmtReader(): StmtReader;
    setTempCode(temp: string, code: string): void;
    hasTempVisit(temp: string): boolean;
    setTempVisit(temp: string): void;

    getLocals(): Map<string, Local>;
    defineLocal(local: Local): void;
    isLocalDefined(local: Local): boolean;
    isInDefaultMethod(): boolean;
}

export abstract class SourceStmt implements Dump {
    original: Stmt;
    context: StmtPrinterContext;
    line: number;
    text: string;
    transformer: SourceTransformer;

    constructor(context: StmtPrinterContext, original: Stmt) {
        this.original = original;
        this.context = context;
        this.line = original.getOriginPositionInfo().getLineNo();
        this.transformer = new SourceTransformer(context);
    }

    public getLine(): number {
        return this.line;
    }

    public setLine(line: number) {
        this.line = line;
    }

    public dump(): string {
        this.beforeDump();
        let code = this.dumpTs();
        this.afterDump();
        return code;
    }

    protected beforeDump(): void {}

    protected afterDump(): void {}

    protected dumpTs(): string {
        if (this.text.length > 0) {
            return `${this.printer.getIndent()}${this.text}\n`;
        }
        return ``;
    }

    protected get printer(): ArkCodeBuffer {
        return this.context.getPrinter();
    }

    public toString(): string {
        return this.text;
    }

    protected setText(text: string): void {
        this.text = text;
    }

    protected getIntent(): string {
        return this.context.getPrinter().getIndent();
    }

    public abstract transfer2ts(): void;

    protected isLocalTempValue(value: Value): boolean {
        if (!(value instanceof Local)) {
            return false;
        }

        return SourceUtils.isTemp(value.getName());
    }
}

enum AssignStmtDumpType {
    NORMAL,
    TEMP_REPLACE,
    COMPONENT_CREATE,
}

export class SourceAssignStmt extends SourceStmt {
    private leftOp: Value;
    private rightOp: Value;
    private leftCode: string;
    private rightCode: string;
    private dumpType: AssignStmtDumpType;

    constructor(context: StmtPrinterContext, original: ArkAssignStmt) {
        super(context, original);
    }

    public transfer2ts(): void {
        this.leftOp = (this.original as ArkAssignStmt).getLeftOp();
        this.rightOp = (this.original as ArkAssignStmt).getRightOp();
        logger.debug('SourceAssignStmt->transfer2ts', this.leftOp, this.rightOp);

        if (
            (this.leftOp instanceof Local && this.leftOp.getName() == 'this') ||
            (this.rightOp instanceof Constant && this.rightOp.getValue() == 'undefined') ||
            this.rightOp instanceof ArkParameterRef
        ) {
            this.setText('');
            this.dumpType = AssignStmtDumpType.NORMAL;
            return;
        }

        this.leftCode = this.transformer.valueToString(this.leftOp);

        if (this.leftOp instanceof Local && this.rightOp instanceof ArkNewExpr) {
            this.transferRightNewExpr();
        } else if (this.leftOp instanceof Local && this.rightOp instanceof ArkNewArrayExpr) {
            this.transferRightNewArrayExpr();
        } else if (this.rightOp instanceof ArkStaticInvokeExpr && SourceUtils.isComponentCreate(this.rightOp)) {
            this.transferRightComponentCreate();
        } else if (
            this.rightOp instanceof ArkInstanceInvokeExpr &&
            SourceUtils.isComponentAttributeInvoke(this.rightOp)
        ) {
            this.transferRightComponentAttribute();
        } else {
            this.rightCode = this.transformer.valueToString(this.rightOp);
        }

        if (this.isLocalTempValue(this.leftOp)) {
            this.context.setTempCode((this.leftOp as Local).getName(), this.rightCode);
        }

        if (
            (this.leftOp instanceof ArkInstanceFieldRef && this.leftOp.getBase().getName() == 'this') ||
            this.leftOp instanceof ArkStaticFieldRef
        ) {
            this.context.setTempCode(this.leftOp.getFieldName(), this.rightCode);
        }

        if (this.dumpType == undefined) {
            this.setText(`${this.leftCode} = ${this.rightCode}`);
            this.dumpType = AssignStmtDumpType.TEMP_REPLACE;
        }
    }

    protected beforeDump(): void {
        if (this.dumpType != AssignStmtDumpType.TEMP_REPLACE) {
            return;
        }

        if (this.context.hasTempVisit(this.leftCode)) {
            this.setText('');
        } else if (SourceUtils.isTemp(this.leftCode)) {
            this.setText(`${this.rightCode};`);
        } else {
            if (
                this.leftOp instanceof Local &&
                this.context.getLocals().has(this.leftOp.getName()) &&
                !this.isLocalTempValue(this.leftOp)
            ) {
                if (this.context.isLocalDefined(this.leftOp)) {
                    this.setText(`${this.leftCode} = ${this.rightCode};`);
                } else {
                    if (this.context.getArkFile().getExportInfoBy(this.leftCode) && this.context.isInDefaultMethod()) {
                        this.setText(`export let ${this.leftCode} = ${this.rightCode};`);
                    } else {
                        this.setText(`let ${this.leftCode} = ${this.rightCode};`);
                    }

                    this.context.defineLocal(this.leftOp);
                }
            } else {
                this.setText(`${this.leftCode} = ${this.rightCode};`);
            }
        }
    }

    protected afterDump(): void {
        if (this.dumpType == AssignStmtDumpType.COMPONENT_CREATE) {
            this.printer.incIndent();
        }
    }

    private getClassOriginType(type: Type): string | undefined {
        if (!(type instanceof ClassType)) {
            return undefined;
        }

        let signature = type.getClassSignature();
        let cls = this.context.getClass(signature);
        if (!cls) {
            return undefined;
        }
        return SourceUtils.getOriginType(cls);
    }

    /**
     * temp1 = new Person
     * temp1.constructor(10)
     */
    private transferRightNewExpr(): void {
        let originType = this.getClassOriginType(this.rightOp.getType());
        if (this.context.getStmtReader().hasNext()) {
            let stmt = this.context.getStmtReader().next();
            let rollback = true;
            if (stmt instanceof ArkInvokeStmt && (stmt.getInvokeExpr() as ArkInstanceInvokeExpr)) {
                let instanceInvokeExpr = stmt.getInvokeExpr() as ArkInstanceInvokeExpr;
                if (
                    'constructor' == instanceInvokeExpr.getMethodSignature().getMethodSubSignature().getMethodName() &&
                    instanceInvokeExpr.getBase().getName() == (this.leftOp as Local).getName()
                ) {
                    let args: string[] = [];
                    instanceInvokeExpr.getArgs().forEach((v) => {
                        args.push(this.transformer.valueToString(v));
                    });

                    if (originType == Origin_Component) {
                        this.rightCode = `${this.transformer.typeToString(this.rightOp.getType())}(${args.join(',')})`;
                    } else if (originType == Origin_TypeLiteral || originType == Origin_Object) {
                        this.rightCode = `${this.transformer.typeToString(this.rightOp.getType())}`;
                    } else {
                        this.rightCode = `new ${this.transformer.typeToString(this.rightOp.getType())}(${args.join(
                            ','
                        )})`;
                    }
                    return;
                }
            }
            if (rollback) {
                this.context.getStmtReader().rollback();
            }
        }

        if (originType == Origin_Component) {
            this.rightCode = `${this.transformer.typeToString(this.rightOp.getType())}()`;
        } else if (originType == Origin_TypeLiteral || originType == Origin_Object) {
            this.rightCode = `${this.transformer.typeToString(this.rightOp.getType())}`;
        } else {
            this.rightCode = `new ${this.transformer.typeToString(this.rightOp.getType())}()`;
        }
    }

    /**
     * $temp0 = newarray[4]
     * $temp0[0] = 1
     * $temp0[1] = 2
     * $temp0[2] = 3
     */
    private transferRightNewArrayExpr(): void {
        let arrayExpr = new SourceNewArrayExpr(this.rightOp as ArkNewArrayExpr);
        let localName = (this.leftOp as Local).getName();
        while (this.context.getStmtReader().hasNext()) {
            let stmt = this.context.getStmtReader().next();
            if (stmt instanceof ArkAssignStmt) {
                let left = stmt.getLeftOp();
                if (left instanceof ArkArrayRef && left.getBase().getName() == localName) {
                    arrayExpr.addInitValue(this.transformer.valueToString(stmt.getRightOp()));
                } else {
                    this.context.getStmtReader().rollback();
                    break;
                }
            } else {
                this.context.getStmtReader().rollback();
                break;
            }
        }
        this.rightCode = arrayExpr.toString();
    }

    private transferRightComponentCreate(): void {
        this.rightCode = this.transformer.valueToString(this.rightOp);
        if (this.context.getStmtReader().hasNext()) {
            let stmt = this.context.getStmtReader().next();
            if (stmt instanceof ArkInvokeStmt) {
                let expr = stmt.getInvokeExpr();
                if (expr instanceof ArkStaticInvokeExpr && SourceUtils.isComponentPop(expr)) {
                    this.setText(`${this.rightCode}`);
                    this.dumpType = AssignStmtDumpType.NORMAL;
                    return;
                }
            }

            this.context.getStmtReader().rollback();
        }
        this.setText(`${this.rightCode} {`);
        this.dumpType = AssignStmtDumpType.COMPONENT_CREATE;
    }

    private transferRightComponentAttribute(): void {
        this.rightCode = this.transformer.valueToString(this.rightOp);
        this.setText(`${this.rightCode}`);
        this.dumpType = AssignStmtDumpType.NORMAL;
    }
}

export class SourceInvokeStmt extends SourceStmt {
    constructor(context: StmtPrinterContext, original: ArkInvokeStmt) {
        super(context, original);
    }

    public transfer2ts(): void {
        let invokeExpr = this.original.getInvokeExpr();
        let code = '';
        let isAttr = false;
        if (invokeExpr instanceof ArkStaticInvokeExpr) {
            if (SourceUtils.isComponentPop(invokeExpr)) {
                code = '}';
                isAttr = true;
            } else {
                code = this.transformer.staticInvokeExprToString(invokeExpr);
                isAttr = SourceUtils.isComponentIfElseInvoke(invokeExpr);
            }
        } else if (invokeExpr instanceof ArkInstanceInvokeExpr) {
            code = this.transformer.instanceInvokeExprToString(invokeExpr);
            isAttr = SourceUtils.isComponentAttributeInvoke(invokeExpr);
        }

        if (code.length > 0 && !isAttr) {
            this.setText(`${code};`);
        } else {
            this.setText(`${code}`);
        }
    }

    protected beforeDump(): void {
        let invokeExpr = this.original.getInvokeExpr();
        if (
            (invokeExpr instanceof ArkStaticInvokeExpr && SourceUtils.isComponentPop(invokeExpr)) ||
            (invokeExpr instanceof ArkStaticInvokeExpr && SourceUtils.isComponentIfElseInvoke(invokeExpr))
        ) {
            this.printer.decIndent();
            return;
        }
    }

    protected afterDump(): void {
        let invokeExpr = this.original.getInvokeExpr();
        if (invokeExpr instanceof ArkStaticInvokeExpr && SourceUtils.isComponentIfElseInvoke(invokeExpr)) {
            this.printer.incIndent();
            return;
        }
    }
}

export class SourceIfStmt extends SourceStmt {
    constructor(context: StmtPrinterContext, original: ArkIfStmt) {
        super(context, original);
    }

    public transfer2ts(): void {
        let code: string;
        let expr = (this.original as ArkIfStmt).getConditionExprExpr();
        code = `if (${this.transformer.valueToString(expr.getOp1())}`;
        code += ` ${SourceUtils.flipOperator(expr.getOperator())} `;
        code += `${this.transformer.valueToString(expr.getOp2())}) {`;
        this.setText(code);
    }

    protected afterDump(): void {
        this.printer.incIndent();
    }
}

export class SourceWhileStmt extends SourceStmt {
    constructor(context: StmtPrinterContext, original: ArkIfStmt) {
        super(context, original);
    }

    protected afterDump(): void {
        this.printer.incIndent();
    }

    public transfer2ts(): void {
        let code: string;
        let expr = (this.original as ArkIfStmt).getConditionExprExpr();
        code = `while (${this.transformer.valueToString(expr.getOp1())}`;
        code += ` ${this.transferOperator()} `;
        code += `${this.transformer.valueToString(expr.getOp2())}) {`;
        this.setText(code);
    }

    protected transferOperator(): string {
        let operator = (this.original as ArkIfStmt).getConditionExprExpr().getOperator().trim();
        return SourceUtils.flipOperator(operator);
    }
}

export class SourceForStmt extends SourceWhileStmt {
    constructor(context: StmtPrinterContext, original: ArkIfStmt) {
        super(context, original);
    }

    /**
     * source: for (let entry of someArray)
     * IR:
     *   entry = undefined
     *   $temp2 = lengthof someArray
     *   $temp1 = 0
     *   if $temp1 >= $temp2
     *   entry = someArray[$temp1]
     *   $temp1 = $temp1 + 1
     */
    private forOf2ts(): boolean {
        let expr = (this.original as ArkIfStmt).getConditionExprExpr();
        let op1 = expr.getOp1();
        let op2 = expr.getOp2();
        let firstStmt = this.context.getStmtReader().first();
        if (!(firstStmt instanceof ArkAssignStmt)) {
            return false;
        }

        if (!(this.isLocalTempValue(op1) && this.isLocalTempValue(op2))) {
            return false;
        }

        let op1Code = this.transformer.valueToString(op1);
        let op2Code = this.transformer.valueToString(op2);

        if (!op1Code || !op2Code) {
            return false;
        }

        if (op1Code != '0' || !op2Code.endsWith('.length')) {
            return false;
        }

        while (this.context.getStmtReader().hasNext()) {
            this.context.getStmtReader().next();
        }

        let v = firstStmt.getLeftOp();
        this.setText(`for (let ${(v as Local).getName()} of ${op2Code.replace('.length', '')}) {`);

        return true;
    }

    public transfer2ts(): void {
        if (this.forOf2ts()) {
            return;
        }
        let code: string;
        let expr = (this.original as ArkIfStmt).getConditionExprExpr();
        code = `for (; ${this.transformer.valueToString(expr.getOp1())}`;
        code += ` ${this.transferOperator()} `;
        code += `${this.transformer.valueToString(expr.getOp2())}; `;
        while (this.context.getStmtReader().hasNext()) {
            let sourceStmt = stmt2SourceStmt(this.context, this.context.getStmtReader().next());
            sourceStmt.transfer2ts();
            code += sourceStmt.toString();
            if (this.context.getStmtReader().hasNext()) {
                code += ', ';
            }
        }
        code += `) {`;
        this.setText(code);
        logger.debug('SourceForStmt->transfer2ts:', expr);
    }
}

export class SourceElseStmt extends SourceStmt {
    constructor(context: StmtPrinterContext, original: ArkIfStmt) {
        super(context, original);
    }

    public transfer2ts(): void {
        this.setText('} else {');
    }

    protected beforeDump(): void {
        this.printer.decIndent();
    }

    protected afterDump(): void {
        this.printer.incIndent();
    }
}

export class SourceContinueStmt extends SourceStmt {
    constructor(context: StmtPrinterContext, original: ArkGotoStmt) {
        super(context, original);
    }
    // trans 2 break or continue
    public transfer2ts(): void {
        this.setText('continue;');
    }
}

export class SourceBreakStmt extends SourceStmt {
    constructor(context: StmtPrinterContext, original: ArkGotoStmt) {
        super(context, original);
    }
    // trans 2 break or continue
    public transfer2ts(): void {
        this.setText('break;');
    }
}

export class SourceReturnStmt extends SourceStmt {
    constructor(context: StmtPrinterContext, original: ArkReturnStmt) {
        super(context, original);
    }

    public transfer2ts(): void {
        this.setText(`return ${this.transformer.valueToString((this.original as ArkReturnStmt).getOp())};`);
    }
}

export class SourceReturnVoidStmt extends SourceStmt {
    constructor(context: StmtPrinterContext, original: ArkReturnVoidStmt) {
        super(context, original);
    }

    public transfer2ts(): void {
        if (this.original.getOriginPositionInfo().getLineNo() <= 0) {
            this.setText('');
        } else {
            this.setText('return;');
        }
    }
}

export class SourceSwitchStmt extends SourceStmt {
    constructor(context: StmtPrinterContext, original: ArkSwitchStmt) {
        super(context, original);
    }

    public transfer2ts(): void {
        this.setText(`switch (${this.transformer.valueToString((this.original as ArkSwitchStmt).getKey())}) {`);
    }

    protected afterDump(): void {
        this.printer.incIndent();
    }
}

export class SourceCaseStmt extends SourceStmt {
    caseIndex: number;
    constructor(context: StmtPrinterContext, original: ArkSwitchStmt, index: number) {
        super(context, original);
        this.caseIndex = index;
    }

    public isDefault(): boolean {
        let cases = (this.original as ArkSwitchStmt).getCases();
        return this.caseIndex >= cases.length;
    }

    public transfer2ts(): void {
        let cases = (this.original as ArkSwitchStmt).getCases();
        if (this.caseIndex < cases.length) {
            let value = (this.original as ArkSwitchStmt).getCases()[this.caseIndex];
            this.setText(`case ${this.transformer.valueToString(value)}:`);
        } else {
            this.setText('default: ');
        }
    }

    protected afterDump(): void {
        this.printer.incIndent();
    }
}

export class SourceCompoundEndStmt extends SourceStmt {
    constructor(context: StmtPrinterContext, stmt: Stmt, text: string) {
        super(context, stmt);
        this.setText(text);
    }

    public transfer2ts(): void {}

    protected beforeDump(): void {
        this.printer.decIndent();
    }
}

export class SourceCommonStmt extends SourceStmt {
    constructor(context: StmtPrinterContext, stmt: Stmt) {
        super(context, stmt);
    }

    public transfer2ts(): void {
        this.setText(this.original.toString());
        logger.debug('SourceCommonStmt->transfer2ts:', this.original.toString());
    }
}

export class SourceThrowStmt extends SourceStmt {
    constructor(context: StmtPrinterContext, original: ArkThrowStmt) {
        super(context, original);
    }

    public transfer2ts(): void {
        this.setText(`throw ${this.transformer.valueToString((this.original as ArkThrowStmt).getOp())};`);
    }
}

export class SourceNewArrayExpr {
    expr: ArkNewArrayExpr;
    values: string[];

    constructor(expr: ArkNewArrayExpr) {
        this.expr = expr;
        this.values = [];
    }

    public addInitValue(value: string) {
        this.values.push(value);
    }

    public toString(): string {
        return `[${this.values.join(', ')}]`;
    }
}

export function stmt2SourceStmt(context: StmtPrinterContext, stmt: Stmt): SourceStmt {
    if (stmt instanceof ArkAssignStmt) {
        return new SourceAssignStmt(context, stmt);
    }
    if (stmt instanceof ArkInvokeStmt) {
        return new SourceInvokeStmt(context, stmt);
    }
    if (stmt instanceof ArkReturnVoidStmt) {
        return new SourceReturnVoidStmt(context, stmt);
    }
    if (stmt instanceof ArkReturnStmt) {
        return new SourceReturnStmt(context, stmt);
    }
    if (stmt instanceof ArkThrowStmt) {
        return new SourceThrowStmt(context, stmt);
    }
    logger.info(`stmt2SourceStmt ${stmt} not support.`);
    return new SourceCommonStmt(context, stmt);
}
