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

import { Constant } from "../../core/base/Constant";
import { ArkBinopExpr, ArkCastExpr, ArkInstanceInvokeExpr, ArkLengthExpr, ArkNewArrayExpr, ArkNewExpr, ArkStaticInvokeExpr } from "../../core/base/Expr";
import { Local } from "../../core/base/Local";
import { ArkInstanceFieldRef, ArkParameterRef, ArkThisRef } from "../../core/base/Ref";
import { ArkAssignStmt, ArkGotoStmt, ArkIfStmt, ArkInvokeStmt, ArkReturnStmt, ArkReturnVoidStmt, ArkSwitchStmt, Stmt } from '../../core/base/Stmt';
import { Value } from "../../core/base/Value";
import { ArkMethod } from "../../core/model/ArkMethod";
import Logger from "../../utils/logger";
import { StmtReader } from './SourceBody';
import { SourceMethod } from "./SourceMethod";
import { SourceUtils } from "./SourceUtils";

const logger = Logger.getLogger();

abstract class SourceStmt extends Stmt {
    original: Stmt;
    method: ArkMethod;

    constructor(original: Stmt, stmtReader: StmtReader, method: ArkMethod) {
        super();
        this.original = original;
        this.method = method;
        this.setPositionInfo(original.getPositionInfo());
        this.transfer2ts(stmtReader);
    }

    protected abstract transfer2ts(stmtReader: StmtReader): void;

    protected instanceInvokeExprToString(invokeExpr: ArkInstanceInvokeExpr) {
        let methodName = invokeExpr.getMethodSignature().getMethodSubSignature().getMethodName();
        let args: string[] = [];
        invokeExpr.getArgs().forEach((v)=>{args.push(this.transferValueToString(v))});
        if (invokeExpr.getBase() instanceof Local) {
            return `${invokeExpr.getBase().getName()}.${methodName}(${args.join(',')})`;
        } else if (invokeExpr.getBase() instanceof Constant) {
            let base: Constant = invokeExpr.getBase() as unknown as Constant;
            return `${base.getValue()}.${methodName}(${args.join(',')})`;
        } else {
            logger.info('= SourceStmt.instanceInvokeExprToString: error.', invokeExpr.getBase(), methodName);
        }
    }

    protected staticInvokeExprToString(invokeExpr: ArkStaticInvokeExpr) {
        let className = invokeExpr.getMethodSignature().getDeclaringClassSignature().getClassName();
        let methodName = invokeExpr.getMethodSignature().getMethodSubSignature().getMethodName();
        let args: string[] = [];
        invokeExpr.getArgs().forEach((v)=>{args.push(v.toString())});
        if (className && className.length > 0 && className != '_DEFAULT_ARK_CLASS') {
            return `${className}.${methodName}(${args.join(',')})`;
        }
        return `${methodName}(${args.join(',')})`;
    }

    protected transferValueToString(value: Value): string {
        if (value instanceof Constant) {
            if (value.getType() == 'string' && !value.getValue().startsWith('\'')) {
                return `'${value.getValue()}'`;
            } else {
                return value.getValue();
            }
        }

        if (value instanceof ArkInstanceFieldRef) {
            let base = value.getBase() as any;
            if (base instanceof Constant) {
                return `${base.getValue()}.${value.getFieldName()}`;
            } else if (base instanceof Local) {
                return `${base.getName()}.${value.getFieldName()}`
            } else if (base instanceof ArkCastExpr) {
                let baseOp = base.getOp();
                if (baseOp instanceof Local) {
                    return `${baseOp.getName()}.${value.getFieldName()} as ${SourceUtils.typeToString(base.getType())}`
                }
                return value.toString();
            }
            return `${value.getBase().getName()}.${value.getFieldName()}`;
        }

        if (value instanceof ArkBinopExpr) {
            let op1: Value = value.getOp1();
            let op2: Value = value.getOp2();
            let operator: string = value.getOperator();

            return `${this.transferValueToString(op1)} ${operator} ${this.transferValueToString(op2)}`;
        }

        if (value instanceof ArkNewArrayExpr) {
            return `new Array<${SourceUtils.typeToString(value.getBaseType())}>(${value.getSize()})`;
        }

        if (value instanceof ArkInstanceInvokeExpr) {
            return `${this.instanceInvokeExprToString(value)}`;
        }

        if (value instanceof ArkStaticInvokeExpr) {
            return `${this.staticInvokeExprToString(value)}`;
        }

        if (value instanceof ArkLengthExpr) {
            return `${value.getOp()}.length`;
        }

        if (value instanceof Local) {
            if (value.getName().startsWith('AnonymousFunc$_')) {
                for (const anonymousMethod of this.method.getDeclaringArkClass().getMethods()) {
                    if (anonymousMethod.getName() == value.getName()) {
                       let _anonymous = new SourceMethod('', this.method.getDeclaringArkFile(), anonymousMethod);
                       return _anonymous.dump();
                    }
                }
            }
        }

        return `${value}`;
    }
}

export class SourceAssignStmt extends SourceStmt {
    constructor(original: ArkAssignStmt, stmtReader: StmtReader, method: ArkMethod) {
        super(original, stmtReader, method);
    }

    protected transfer2ts(stmtReader: StmtReader): void {
        let leftOp = (this.original as ArkAssignStmt).getLeftOp();
        let rightOp = (this.original as ArkAssignStmt).getRightOp();
        logger.info('SourceAssignStmt->transfer2ts', leftOp, rightOp);
        
        // omit this = this: <tests\sample\sample.ts>.<_DEFAULT_ARK_CLASS>
        if (leftOp instanceof Local && leftOp.getName() == 'this') {
            this.setText('');
            return;
        }

        // name = parameter0: StringKeyword
        if (rightOp instanceof ArkParameterRef) {
            this.setText('');
            return;
        }

        // temp1 = new Person
        // temp1.constructor(10)
        if (leftOp instanceof Local && rightOp instanceof ArkNewExpr) {
            if (stmtReader.hasNext()) {
                let stmt = stmtReader.next();
                let rollback = true;
                if (stmt instanceof ArkInvokeStmt && stmt.getInvokeExpr() as ArkInstanceInvokeExpr) {
                    let instanceInvokeExpr = stmt.getInvokeExpr() as ArkInstanceInvokeExpr;
                    if ('constructor' == instanceInvokeExpr.getMethodSignature().getMethodSubSignature().getMethodName() && instanceInvokeExpr.getBase().getName() == leftOp.getName()) {
                        let args: string[] = [];
                        instanceInvokeExpr.getArgs().forEach((v)=>{args.push(v.toString())});
                        this.setText(`${this.transferValueToString(leftOp)} = new ${SourceUtils.typeToString(rightOp.getType())}(${args.join(',')});`);
                        rollback = false;
                    }
                }
                if (rollback) {
                    stmtReader.rollback();
                    this.setText(`${this.transferValueToString(leftOp)} = new ${SourceUtils.typeToString(rightOp.getType())}();`);
                }
            } else {
                this.setText(`${this.transferValueToString(leftOp)} = new ${SourceUtils.typeToString(rightOp.getType())}();`);
            }
            return;
        }

        if (rightOp instanceof ArkThisRef) {
            this.setText(`${this.transferValueToString(leftOp)} = this;`);
            return;    
        }
        
        this.setText(`${this.transferValueToString(leftOp)} = ${this.transferValueToString(rightOp)};`);
    }  
}

export class SourceInvokeStmt extends SourceStmt {
    constructor(original: ArkInvokeStmt, stmtReader: StmtReader, method: ArkMethod) {
        super(original, stmtReader, method);
    }

    protected transfer2ts(stmtReader: StmtReader): void {
        let invokeExpr = this.original.getInvokeExpr();
        if (invokeExpr instanceof ArkStaticInvokeExpr) {
            this.setText(`${this.staticInvokeExprToString(invokeExpr)};`);
            return;
        } else if (invokeExpr instanceof ArkInstanceInvokeExpr) {
            this.setText(`${this.instanceInvokeExprToString(invokeExpr)};`);
            return;
        } else {
            this.setText(this.original + ';');
        }
    }
}

export class SourceIfStmt extends SourceStmt {
    constructor(original: ArkIfStmt, stmtReader: StmtReader, method: ArkMethod) {
        super(original, stmtReader, method);
    }

    protected transfer2ts(stmtReader: StmtReader): void {
        let code: string;
        code = `if (${(this.original as ArkIfStmt).getConditionExprExpr().getOp1()}`;
        code += ` ${(this.original as ArkIfStmt).getConditionExprExpr().getOperator()} `;
        code += `${(this.original as ArkIfStmt).getConditionExprExpr().getOp2()}) {`;
        this.setText(code);
    }
}

export class SourceWhileStmt extends SourceStmt {
    constructor(original: ArkIfStmt, stmtReader: StmtReader, method: ArkMethod) {
        super(original, stmtReader, method);
    }

    protected transfer2ts(stmtReader: StmtReader): void {
        let code: string;
        code = `while (${(this.original as ArkIfStmt).getConditionExprExpr().getOp1()}`;
        code += ` ${this.transferOperator()} `;
        code += `${(this.original as ArkIfStmt).getConditionExprExpr().getOp2()}) {`;
        this.setText(code);
    }
    
    protected transferOperator(): string {
        let operator = (this.original as ArkIfStmt).getConditionExprExpr().getOperator().trim();
        if (this.isRelationalOperator(operator)) {
            return this.flipOperator(operator);
        }
        return operator;
    }

    protected isRelationalOperator(operator: string): boolean {
        return operator == '<' || operator == '<=' || operator == '>' || operator == '>=' ||
            operator == '==' || operator == '===' || operator == '!=' || operator == '!==';
    }

    protected flipOperator(operator: string): string {
        let newOperater = '';
        switch (operator) {
            case '<':
                newOperater = '>='
                break;
            case '<=':
                newOperater = '>'
                break;
            case '>':
                newOperater = '<='
                break;
            case '>=':
                newOperater = '<'
                break;
            case '==':
                newOperater = '!='
                break;
            case '===':
                newOperater = '!=='
                break;
            case '!=':
                newOperater = '=='
                break;
            case '!==':
                newOperater = '==='
                break;
            default:
                break;
        }
        return newOperater;
    }
}

export class SourceForStmt extends SourceWhileStmt {
    constructor(original: ArkIfStmt, stmtReader: StmtReader, method: ArkMethod) {
        super(original, stmtReader, method);
    }

    protected transfer2ts(stmtReader: StmtReader): void {
        let code: string;
        code = `for (; ${(this.original as ArkIfStmt).getConditionExprExpr().getOp1()}`;
        code += ` ${this.transferOperator()} `;
        code += `${(this.original as ArkIfStmt).getConditionExprExpr().getOp2()}; `;
        while (stmtReader.hasNext()) {
            code += `${stmtReader.next()}`;
            if (stmtReader.hasNext()) {
                code += ', ';
            }
        }
        code += `) {`;
        this.setText(code);
        logger.info('SourceForStmt->transfer2ts:', (this.original as ArkIfStmt).getConditionExprExpr());
    }
}

export class SourceElseStmt extends SourceStmt {
    constructor(original: ArkIfStmt, stmtReader: StmtReader, method: ArkMethod) {
        super(original, stmtReader, method);
    }

    protected transfer2ts(stmtReader: StmtReader): void {
        this.setText('} else {');
    }
}

export class SourceContinueStmt extends SourceStmt {
    constructor(original: ArkGotoStmt, stmtReader: StmtReader, method: ArkMethod) {
        super(original, stmtReader, method);
    }
    // trans 2 break or continue
    protected transfer2ts(stmtReader: StmtReader): void {
        this.setText('continue;');
    }
}

export class SourceBreakStmt extends SourceStmt {
    constructor(original: ArkGotoStmt, stmtReader: StmtReader, method: ArkMethod) {
        super(original, stmtReader, method);
    }
    // trans 2 break or continue
    protected transfer2ts(stmtReader: StmtReader): void {
        this.setText('break;');
    }
}

export class SourceReturnStmt extends SourceStmt {
    constructor(original: ArkReturnStmt, stmtReader: StmtReader, method: ArkMethod) {
        super(original, stmtReader, method);
    }

    protected transfer2ts(stmtReader: StmtReader): void {
        this.setText(`return ${(this.original as ArkReturnStmt).getOp()};`);
    }
}

export class SourceReturnVoidStmt extends SourceStmt {
    constructor(original: ArkReturnVoidStmt, stmtReader: StmtReader, method: ArkMethod) {
        super(original, stmtReader, method);
    }

    protected transfer2ts(stmtReader: StmtReader): void {
        if (this.original.getOriginPositionInfo() == 0) {
            this.setText('');
        } else {
            this.setText('return;');
        }
    }
}

export class SourceSwitchStmt extends SourceStmt {
    constructor(original: ArkSwitchStmt, stmtReader: StmtReader, method: ArkMethod) {
        super(original, stmtReader, method);
    }

    protected transfer2ts(stmtReader: StmtReader): void {
        this.setText(`switch (${(this.original as ArkSwitchStmt).getKey()}) {`);
    }
}

export class SourceCaseStmt extends SourceStmt {
    caseIndex: number;
    constructor(original: ArkSwitchStmt, stmtReader: StmtReader, method: ArkMethod, index:number) {
        super(original, stmtReader, method);
        this.caseIndex = index;
        this.transfer2ts(stmtReader);
    }

    public isDefault(): boolean {
        let cases = (this.original as ArkSwitchStmt).getCases();
        return this.caseIndex >= cases.length;
    }

    protected transfer2ts(stmtReader: StmtReader): void {
        let cases = (this.original as ArkSwitchStmt).getCases();
        if (this.caseIndex < cases.length) {
            this.setText(`case ${(this.original as ArkSwitchStmt).getCases()[this.caseIndex]}:`);
        } else {
            this.setText('default: ');
        }
    }
}

export class SourceCompoundEndStmt extends Stmt {
    constructor(text: string) {
        super();
        this.setText(text);
    }
}
