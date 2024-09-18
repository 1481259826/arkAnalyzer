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

import { StmtUseReplacer } from '../common/StmtUseReplacer';
import { Cfg } from '../graph/Cfg';
import { AbstractExpr, AbstractInvokeExpr, ArkConditionExpr } from './Expr';
import { AbstractFieldRef, ArkArrayRef } from './Ref';
import { Value } from './Value';
import { FullPosition, LineColPosition } from './Position';

/**
 * @category core/base/stmt
 */
export abstract class Stmt {
    protected text: string = '';
    protected position: LineColPosition = LineColPosition.DEFAULT;
    protected cfg: Cfg | null = null;
    protected operandOriginalPositions: FullPosition[] | null = null; // operandOriginalPositions correspond with
    // def and uses one by one
    /** Return a list of values which are uesd in this statement */
    public getUses(): Value[] {
        return [];
    }

    public replaceUse(oldUse: Value, newUse: Value): void {
        let stmtUseReplacer = new StmtUseReplacer(oldUse, newUse);
        stmtUseReplacer.caseStmt(this);
    }

    /** Return the def which is uesd in this statement */
    public getDef(): Value | null {
        return null;
    }

    public getDefAndUses(): Value[] {
        const defAndUses: Value[] = [];
        const def = this.getDef();
        if (def) {
            defAndUses.push(def);
        }
        defAndUses.push(...this.getUses());
        return defAndUses;
    }


    public getCfg(): Cfg | null {
        return this.cfg;
    }

    public setCfg(cfg: Cfg): void {
        this.cfg = cfg;
    }

    /**
     * Return true if the following statement may not execute after this statement.
     * The ArkIfStmt and ArkGotoStmt will return true.
     */
    public isBranch(): boolean {
        return false;
    }

    /** Return the number of statements which this statement may go to */
    public getExpectedSuccessorCount(): number {
        return 1;
    }

    public containsInvokeExpr(): boolean {
        for (const use of this.getUses()) {
            if (use instanceof AbstractInvokeExpr) {
                return true;
            }
        }
        return false;
    }

    public getInvokeExpr(): AbstractInvokeExpr | undefined {
        for (const use of this.getUses()) {
            if (use instanceof AbstractInvokeExpr) {
                return use as AbstractInvokeExpr;
            }
        }
        return undefined;
    }

    public getExprs(): AbstractExpr[] {
        let exprs: AbstractExpr[] = [];
        for (const use of this.getUses()) {
            if (use instanceof AbstractExpr) {
                exprs.push(use);
            }
        }
        return exprs;
    }

    public containsArrayRef(): boolean {
        for (const use of this.getUses()) {
            if (use instanceof ArkArrayRef) {
                return true;
            }
        }
        if (this.getDef() instanceof ArkArrayRef) {
            return true;
        }
        return false;
    }

    public getArrayRef(): ArkArrayRef | undefined {
        for (const use of this.getUses()) {
            if (use instanceof ArkArrayRef) {
                return use as ArkArrayRef;
            }
        }

        if (this.getDef() instanceof ArkArrayRef) {
            return undefined;
        }

        return undefined;
    }

    public containsFieldRef(): boolean {
        for (const use of this.getUses()) {
            if (use instanceof AbstractFieldRef) {
                return true;
            }
        }

        if (this.getDef() instanceof AbstractFieldRef) {
            return true;
        }
        return false;
    }

    public getFieldRef(): AbstractFieldRef | undefined {
        for (const use of this.getUses()) {
            if (use instanceof AbstractFieldRef) {
                return use as AbstractFieldRef;
            }
        }
        if (this.getDef() instanceof AbstractFieldRef) {
            return undefined;
        }
        return undefined;
    }

    public setPositionInfo(position: LineColPosition) {
        this.position = position;
    }

    public getPositionInfo(): LineColPosition {
        return this.position;
    }

    public getOriginPositionInfo(): LineColPosition {
        const originPositionInfo = this.cfg?.getDeclaringMethod()?.getBody()?.getStmtToOriginalStmt()
            ?.get(this)?.position;
        if (!originPositionInfo) {
            return LineColPosition.DEFAULT;
        }
        return originPositionInfo;
    }

    abstract toString(): string ;

    public setText(text: string): void {
        this.text = text;
    }

    public setOperandOriginalPositions(operandOriginalPositions: FullPosition[]): void {
        this.operandOriginalPositions = operandOriginalPositions;
    };

    public getOperandOriginalPosition(indexOrOperand: number | Value): FullPosition | null {
        let index:number = -1;
        if (typeof indexOrOperand !== 'number') {
            let operands = this.getDefAndUses();
            for (let i = 0; i < operands.length; i++) {
                if (operands[i] === indexOrOperand) {
                    index = i;
                    break;
                }
            }
        } else {
            index = indexOrOperand;
        }

        if (!this.operandOriginalPositions || index < 0 || index > this.operandOriginalPositions.length) {
            return null;
        }
        return this.operandOriginalPositions[index];
    };
}

export class OriginalStmt extends Stmt {
    constructor(text: string, position: LineColPosition) {
        super();
        this.text = text;
        this.position = position;
    }

    public toString(): string {
        return this.text;
    }
}

export class ArkAssignStmt extends Stmt {
    private leftOp: Value;
    private rightOp: Value;

    constructor(leftOp: Value, rightOp: Value) {
        super();
        this.leftOp = leftOp;
        this.rightOp = rightOp;
    }

    public getLeftOp(): Value {
        return this.leftOp;
    }

    public setLeftOp(newLeftOp: Value): void {
        this.leftOp = newLeftOp;
    }

    public getRightOp(): Value {
        return this.rightOp;
    }

    public setRightOp(rightOp: Value): void {
        this.rightOp = rightOp;
    }

    public toString(): string {
        const str = this.getLeftOp() + ' = ' + this.getRightOp();
        return str;
    }

    public getDef(): Value | null {
        return this.leftOp;
    }

    public getUses(): Value[] {
        let uses: Value[] = [];
        uses.push(...this.leftOp.getUses());
        uses.push(this.rightOp);
        uses.push(...this.rightOp.getUses());
        return uses;
    }
}

export class ArkInvokeStmt extends Stmt {
    private invokeExpr: AbstractInvokeExpr;

    constructor(invokeExpr: AbstractInvokeExpr) {
        super();
        this.invokeExpr = invokeExpr;
    }

    public replaceInvokeExpr(newExpr: AbstractInvokeExpr) {
        this.invokeExpr = newExpr;
    }

    public getInvokeExpr() {
        return this.invokeExpr;
    }

    public toString(): string {
        const str = this.invokeExpr.toString();
        return str;
    }

    public getUses(): Value[] {
        let uses: Value[] = [];
        uses.push(this.invokeExpr);
        uses.push(...this.invokeExpr.getUses());
        return uses;
    }
}

export class ArkIfStmt extends Stmt {
    private conditionExpr: ArkConditionExpr;

    constructor(conditionExpr: ArkConditionExpr) {
        super();
        this.conditionExpr = conditionExpr;
    }

    public getConditionExprExpr() {
        return this.conditionExpr;
    }

    public isBranch(): boolean {
        return true;
    }

    public getExpectedSuccessorCount(): number {
        return 2;
    }

    public toString(): string {
        const str = 'if ' + this.conditionExpr;
        return str;
    }

    public getUses(): Value[] {
        let uses: Value[] = [];
        uses.push(this.conditionExpr);
        uses.push(...this.conditionExpr.getUses());
        return uses;
    }
}

export class ArkReturnStmt extends Stmt {
    private op: Value;

    constructor(op: Value) {
        super();
        this.op = op;
    }

    public getExpectedSuccessorCount(): number {
        return 0;
    }

    public getOp(): Value {
        return this.op;
    }

    public setReturnValue(returnValue: Value): void {
        this.op = returnValue;
    }

    public toString(): string {
        const str = 'return ' + this.op;
        return str;
    }

    public getUses(): Value[] {
        let uses: Value[] = [];
        uses.push(this.op);
        uses.push(...this.op.getUses());
        return uses;
    }
}

export class ArkReturnVoidStmt extends Stmt {
    constructor() {
        super();
    }

    public getExpectedSuccessorCount(): number {
        return 0;
    }

    public toString(): string {
        const str = 'return';
        return str;
    }
}

export class ArkSwitchStmt extends Stmt {
    private key: Value;
    private cases: Value[];  // default as an extra block

    constructor(key: Value, cases: Value[]) {
        super();
        this.key = key;
        this.cases = cases;
    }

    public getKey(): Value {
        return this.key;
    }

    public getCases(): Value[] {
        return this.cases;
    }

    public isBranch(): boolean {
        return true;
    }

    public getExpectedSuccessorCount(): number {
        return this.cases.length + 1;
    }

    public toString(): string {
        let strs: string[] = [];
        strs.push('switch(' + this.key + ') {');
        for (const c of this.cases) {
            strs.push('case ');
            strs.push(c.toString());
            strs.push(': ');
            strs.push(', ');
        }

        strs.push('default : }');
        const str = strs.join('');
        return str;
    }

    public getUses(): Value[] {
        let uses: Value[] = [];
        uses.push(this.key);
        uses.push(...this.key.getUses());
        return uses;
    }
}

export class ArkThrowStmt extends Stmt {
    private op: Value;

    constructor(op: Value) {
        super();
        this.op = op;
    }

    public getOp(): Value {
        return this.op;
    }

    public toString(): string {
        const str = 'throw ' + this.op;
        return str;
    }

    public getUses(): Value[] {
        let uses: Value[] = [];
        uses.push(this.op);
        uses.push(...this.op.getUses());
        return uses;
    }
}