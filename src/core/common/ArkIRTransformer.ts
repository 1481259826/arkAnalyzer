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

import {
    AbstractBinopExpr,
    AbstractExpr,
    AbstractInvokeExpr,
    ArkAwaitExpr,
    ArkCastExpr,
    ArkConditionExpr,
    ArkDeleteExpr,
    ArkInstanceInvokeExpr,
    ArkInstanceOfExpr,
    ArkNewArrayExpr,
    ArkNewExpr,
    ArkNormalBinopExpr,
    ArkStaticInvokeExpr,
    ArkTypeOfExpr,
    ArkUnopExpr,
    ArkYieldExpr,
    BinaryOperator,
    NormalBinaryOperator,
    RelationalBinaryOperator,
    UnaryOperator,
} from '../base/Expr';
import {
    AbstractFieldRef,
    ArkArrayRef,
    ArkCaughtExceptionRef,
    ArkInstanceFieldRef,
    ArkParameterRef,
    ArkStaticFieldRef,
    ArkThisRef,
} from '../base/Ref';
import { Value } from '../base/Value';
import * as ts from 'ohos-typescript';
import { Local } from '../base/Local';
import {
    ArkAssignStmt,
    ArkIfStmt,
    ArkInvokeStmt,
    ArkReturnStmt,
    ArkReturnVoidStmt,
    ArkThrowStmt,
    Stmt,
} from '../base/Stmt';
import {
    AliasType,
    AnyType,
    ArrayType,
    BooleanType,
    ClassType,
    FunctionType,
    LiteralType,
    NeverType,
    NullType,
    NumberType,
    StringType,
    TupleType,
    Type,
    UnclearReferenceType,
    UndefinedType,
    UnionType,
    UnknownType,
    VoidType,
} from '../base/Type';
import { Constant } from '../base/Constant';
import { ValueUtil } from './ValueUtil';
import {
    ClassSignature,
    FieldSignature,
    LocalSignature,
    MethodSignature,
    MethodSubSignature
} from '../model/ArkSignature';
import Logger from '../../utils/logger';
import { IRUtils } from './IRUtils';
import { ArkMethod } from '../model/ArkMethod';
import { buildArkMethodFromArkClass } from '../model/builder/ArkMethodBuilder';
import { buildNormalArkClassFromArkFile, buildNormalArkClassFromArkNamespace } from '../model/builder/ArkClassBuilder';
import { ArkClass } from '../model/ArkClass';
import { ArkSignatureBuilder } from '../model/builder/ArkSignatureBuilder';
import {
    COMPONENT_BRANCH_FUNCTION,
    COMPONENT_CREATE_FUNCTION,
    COMPONENT_CUSTOMVIEW,
    COMPONENT_IF,
    COMPONENT_POP_FUNCTION,
    COMPONENT_REPEAT,
    isEtsSystemComponent,
} from './EtsConst';
import { LineColPosition } from '../base/Position';
import { ModelUtils } from './ModelUtils';
import { Builtin } from './Builtin';
import { CONSTRUCTOR_NAME, THIS_NAME } from './TSConst';

const logger = Logger.getLogger();

export const DUMMY_INITIALIZER_STMT = 'dummyInitializerStmt';

type ValueAndStmts = {
    value: Value,
    stmts: Stmt[]
};

export class ArkIRTransformer {
    private readonly tempLocalPrefix = '$temp';
    private tempLocalIndex: number = 0;
    private locals: Map<string, Local> = new Map();
    private sourceFile: ts.SourceFile;
    private declaringMethod: ArkMethod;
    private thisLocal: Local;

    private inBuildMethod = false;
    private stmtToOriginalStmt: Map<Stmt, Stmt> = new Map<Stmt, Stmt>();
    private aliasTypeMap: Map<string, AliasType> = new Map();

    constructor(sourceFile: ts.SourceFile, declaringMethod: ArkMethod) {
        this.sourceFile = sourceFile;
        this.declaringMethod = declaringMethod;
        this.thisLocal = new Local(THIS_NAME, declaringMethod.getDeclaringArkClass().getSignature().getType());
        this.locals.set(this.thisLocal.getName(), this.thisLocal);
        this.inBuildMethod = ModelUtils.isArkUIBuilderMethod(declaringMethod);
    }

    public getLocals(): Set<Local> {
        return new Set<Local>(this.locals.values());
    }

    public getThisLocal(): Local {
        return this.thisLocal;
    }

    public getStmtToOriginalStmt(): Map<Stmt, Stmt> {
        return this.stmtToOriginalStmt;
    }

    public getAliasTypeMap(): Map<string, AliasType> {
        return this.aliasTypeMap;
    }

    public prebuildStmts(): Stmt[] {
        const stmts: Stmt[] = [];
        let index = 0;
        for (const methodParameter of this.declaringMethod.getParameters()) {
            const parameterRef = new ArkParameterRef(index, methodParameter.getType());
            stmts.push(new ArkAssignStmt(this.getOrCreatLocal(methodParameter.getName(), parameterRef.getType()), parameterRef));
            index++;
        }

        const thisRef = new ArkThisRef(this.getThisLocal().getType() as ClassType);
        stmts.push(new ArkAssignStmt(this.getThisLocal(), thisRef));
        return stmts;
    }

    public tsNodeToStmts(node: ts.Node): Stmt[] {
        let stmts: Stmt[] = [];
        if (ts.isExpressionStatement(node)) {
            stmts = this.expressionStatementToStmts(node);
        } else if (ts.isTypeAliasDeclaration(node)) {
            stmts = this.typeAliasDeclarationToStmts(node);
        } else if (ts.isBlock(node)) {
            stmts = this.blockToStmts(node);
        } else if (ts.isSwitchStatement(node)) {
            stmts = this.switchStatementToStmts(node);
        } else if (ts.isForStatement(node)) {
            stmts = this.forStatementToStmts(node);
        } else if (ts.isForInStatement(node) || ts.isForOfStatement(node)) {
            stmts = this.rangeForStatementToStmts(node);
        } else if (ts.isWhileStatement(node)) {
            stmts = this.whileStatementToStmts(node);
        } else if (ts.isDoStatement(node)) {
            stmts = this.doStatementToStmts(node);
        } else if (ts.isVariableStatement(node)) {
            stmts = this.variableStatementToStmts(node);
        } else if (ts.isVariableDeclarationList(node)) {
            stmts = this.variableDeclarationListToStmts(node);
        } else if (ts.isIfStatement(node)) {
            stmts = this.ifStatementToStmts(node);
        } else if (ts.isBreakStatement(node) || ts.isContinueStatement(node)) {
            stmts = this.gotoStatementToStmts(node);
        } else if (ts.isThrowStatement(node)) {
            stmts = this.throwStatementToStmts(node);
        } else if (ts.isCatchClause(node)) {
            stmts = this.catchClauseToStmts(node);
        } else if (ts.isReturnStatement(node)) {
            stmts = this.returnStatementToStmts(node);
        }

        this.mapStmtsToTsStmt(stmts, node);
        return stmts;
    }

    private returnStatementToStmts(returnStatement: ts.ReturnStatement): Stmt[] {
        const stmts: Stmt[] = [];
        if (returnStatement.expression) {
            let {
                value: exprValue,
                stmts: exprStmts,
            } = this.tsNodeToValueAndStmts(returnStatement.expression);
            stmts.push(...exprStmts);
            if (IRUtils.moreThanOneAddress(exprValue)) {
                ({
                    value: exprValue,
                    stmts: exprStmts,
                } = this.generateAssignStmtForValue(exprValue));
                stmts.push(...exprStmts);
            }
            stmts.push(new ArkReturnStmt(exprValue));
        } else {
            stmts.push(new ArkReturnVoidStmt());
        }
        return stmts;
    }

    private blockToStmts(block: ts.Block): Stmt[] {
        const stmts: Stmt[] = [];
        for (const statement of block.statements) {
            stmts.push(...this.tsNodeToStmts(statement));
        }
        return stmts;
    }

    private expressionStatementToStmts(expressionStatement: ts.ExpressionStatement): Stmt[] {
        return this.expressionToStmts(expressionStatement.expression);
    }

    private expressionToStmts(expression: ts.Expression): Stmt[] {
        const { value: exprValue, stmts: stmts } = this.tsNodeToValueAndStmts(expression);
        if (exprValue instanceof AbstractInvokeExpr) {
            const arkInvokeStmt = new ArkInvokeStmt(exprValue);
            stmts.push(arkInvokeStmt);

            let hasRepeat: boolean = false;
            for (const stmt of stmts) {
                if ((stmt instanceof ArkAssignStmt) && (stmt.getRightOp() instanceof ArkStaticInvokeExpr)) {
                    const rightOp = stmt.getRightOp() as ArkStaticInvokeExpr;
                    if (rightOp.getMethodSignature().getMethodSubSignature().getMethodName() === COMPONENT_REPEAT) {
                        const createMethodSignature = ArkSignatureBuilder.buildMethodSignatureFromClassNameAndMethodName(COMPONENT_REPEAT, COMPONENT_CREATE_FUNCTION);
                        const createInvokeExpr = new ArkStaticInvokeExpr(createMethodSignature, rightOp.getArgs());
                        stmt.setRightOp(createInvokeExpr);
                        hasRepeat = true;
                    }
                }
            }
            if (hasRepeat) {
                const popMethodSignature = ArkSignatureBuilder.buildMethodSignatureFromClassNameAndMethodName(COMPONENT_REPEAT, COMPONENT_POP_FUNCTION);
                const popInvokeExpr = new ArkStaticInvokeExpr(popMethodSignature, []);
                const popInvokeStmt = new ArkInvokeStmt(popInvokeExpr);
                stmts.push(popInvokeStmt);
            }
        } else if (exprValue instanceof AbstractExpr) {
            const { value: _, stmts: exprStmts } = this.generateAssignStmtForValue(exprValue);
            stmts.push(...exprStmts);
        }
        return stmts;
    }

    private typeAliasDeclarationToStmts(typeAliasDeclaration: ts.TypeAliasDeclaration): Stmt[] {
        const aliasName = typeAliasDeclaration.name.text;
        const originalType = this.resolveTypeNode(typeAliasDeclaration.type);
        this.aliasTypeMap.set(aliasName, new AliasType(aliasName, originalType,
            new LocalSignature(aliasName, this.declaringMethod.getSignature())));
        return [];
    }

    private switchStatementToStmts(switchStatement: ts.SwitchStatement): Stmt[] {
        const stmts: Stmt[] = [];
        let {
            value: exprValue,
            stmts: exprStmts,
        } = this.tsNodeToValueAndStmts(switchStatement.expression);
        stmts.push(...exprStmts);
        if (IRUtils.moreThanOneAddress(exprValue)) {
            const { value: newExprValue, stmts: exprStmts } = this.generateAssignStmtForValue(exprValue);
            stmts.push(...exprStmts);
            exprValue = newExprValue;
        }
        const caseValues: Value[] = [];
        for (const clause of switchStatement.caseBlock.clauses) {
            if (ts.isCaseClause(clause)) {
                let {
                    value: clauseValue,
                    stmts: clauseStmts,
                } = this.tsNodeToValueAndStmts(switchStatement.expression);
                stmts.push(...clauseStmts);
                if (IRUtils.moreThanOneAddress(clauseValue)) {
                    const {
                        value: newClauseValue,
                        stmts: clauseStmts,
                    } = this.generateAssignStmtForValue(exprValue);
                    stmts.push(...clauseStmts);
                    clauseValue = newClauseValue;
                }
                caseValues.push(clauseValue);
            }
        }
        return stmts;
    }

    private forStatementToStmts(forStatement: ts.ForStatement): Stmt[] {
        const stmts: Stmt[] = [];
        if (forStatement.initializer) {
            stmts.push(...this.tsNodeToValueAndStmts(forStatement.initializer).stmts);
        }
        const dummyInitializerStmt = new Stmt();
        dummyInitializerStmt.setText(DUMMY_INITIALIZER_STMT);
        stmts.push(dummyInitializerStmt);

        if (forStatement.condition) {
            const {
                value: conditionValue,
                stmts: conditionStmts,
            } = this.conditionToValueAndStmts(forStatement.condition);
            stmts.push(...conditionStmts);
            stmts.push(new ArkIfStmt(conditionValue as ArkConditionExpr));
        }
        if (forStatement.incrementor) {
            stmts.push(...this.tsNodeToValueAndStmts(forStatement.incrementor).stmts);
        }
        return stmts;
    }

    private rangeForStatementToStmts(forOfStatement: ts.ForOfStatement | ts.ForInStatement): Stmt[] {
        const stmts: Stmt[] = [];
        let {
            value: iterableValue,
            stmts: iterableStmts,
        } = this.tsNodeToValueAndStmts(forOfStatement.expression);
        stmts.push(...iterableStmts);
        if (!(iterableValue instanceof Local)) {
            ({ value: iterableValue, stmts: iterableStmts } = this.generateAssignStmtForValue(iterableValue));
            stmts.push(...iterableStmts);
        }
        const iteratorMethodSignature = new MethodSignature();
        iteratorMethodSignature.getMethodSubSignature().setReturnType(Builtin.ITERATOR_CLASS_SIGNATURE.getType());
        iteratorMethodSignature.getMethodSubSignature().setMethodName(Builtin.ITERATOR_FUNCTION);
        const iteratorInvokeExpr = new ArkInstanceInvokeExpr(iterableValue as Local, iteratorMethodSignature, []);
        const { value: iterator, stmts: iteratorStmts } = this.generateAssignStmtForValue(iteratorInvokeExpr);
        stmts.push(...iteratorStmts);
        (iterator as Local).setType(Builtin.ITERATOR_CLASS_SIGNATURE.getType());

        const nextMethodSignature = new MethodSignature();
        nextMethodSignature.getMethodSubSignature().setReturnType(Builtin.ITERATOR_RESULT_CLASS_SIGNATURE.getType());
        nextMethodSignature.getMethodSubSignature().setMethodName(Builtin.ITERATOR_NEXT);
        const iteratorNextInvokeExpr = new ArkInstanceInvokeExpr(iterator as Local, nextMethodSignature, []);
        const {
            value: iteratorResult,
            stmts: iteratorResultStmts,
        } = this.generateAssignStmtForValue(iteratorNextInvokeExpr);
        stmts.push(...iteratorResultStmts);
        (iteratorResult as Local).setType(Builtin.ITERATOR_RESULT_CLASS_SIGNATURE.getType());
        const doneFieldSignature = new FieldSignature();
        doneFieldSignature.setDeclaringSignature(Builtin.ITERATOR_RESULT_CLASS_SIGNATURE);
        doneFieldSignature.setFieldName(Builtin.ITERATOR_RESULT_DONE);
        const {
            value: doneFlag,
            stmts: doneFlagStmts,
        } = this.generateAssignStmtForValue(new ArkInstanceFieldRef(iteratorResult as Local, doneFieldSignature));
        stmts.push(...doneFlagStmts);
        (doneFlag as Local).setType(BooleanType.getInstance());
        const conditionExpr = new ArkConditionExpr(doneFlag, ValueUtil.getBooleanConstant(true), RelationalBinaryOperator.Equality);
        stmts.push(new ArkIfStmt(conditionExpr));

        const valueFieldSignature = new FieldSignature();
        valueFieldSignature.setDeclaringSignature(Builtin.ITERATOR_RESULT_CLASS_SIGNATURE);
        valueFieldSignature.setFieldName(Builtin.ITERATOR_RESULT_VALUE);
        const {
            value: yieldValue,
            stmts: yieldValueStmts,
        } = this.generateAssignStmtForValue(new ArkInstanceFieldRef(iteratorResult as Local, valueFieldSignature));
        stmts.push(...yieldValueStmts);

        // TODO: Support generics and then fill in the exact type
        const castExpr = new ArkCastExpr(yieldValue, UnknownType.getInstance());
        if (ts.isVariableDeclarationList(forOfStatement.initializer)) {
            const variableDeclarationList = forOfStatement.initializer as ts.VariableDeclarationList;
            const isConst = variableDeclarationList.flags == ts.NodeFlags.Const;
            const variableDeclaration = variableDeclarationList.declarations[0];
            if (ts.isArrayBindingPattern(variableDeclaration.name)) {
                const {
                    value: arrayItem,
                    stmts: arrayItemStmts,
                } = this.generateAssignStmtForValue(castExpr);
                stmts.push(...arrayItemStmts);
                (arrayItem as Local).setType(new ArrayType(UnknownType.getInstance(), 1));

                const elements = variableDeclaration.name.elements;
                let index = 0;
                for (const element of elements) {
                    let arrayRef = new ArkArrayRef(arrayItem as Local, new Constant(index.toString(), NumberType.getInstance()));
                    let item = new Local(element.getText(this.sourceFile));
                    item.setConstFlag(isConst);
                    stmts.push(new ArkAssignStmt(item, arrayRef));
                    index++;
                }
            } else if (ts.isObjectBindingPattern(variableDeclaration.name)) {
                const {
                    value: objectItem,
                    stmts: objectItemStmts,
                } = this.generateAssignStmtForValue(castExpr);
                stmts.push(...objectItemStmts);

                const elements = variableDeclaration.name.elements;
                for (const element of elements) {
                    const fieldName = element.propertyName ? element.propertyName.getText(this.sourceFile) : element.name.getText(this.sourceFile);
                    const fieldSignature = new FieldSignature();
                    fieldSignature.setFieldName(fieldName);
                    const fieldRef = new ArkInstanceFieldRef(objectItem as Local, fieldSignature);
                    const fieldLocal = this.getOrCreatLocal(element.name.getText(this.sourceFile));
                    fieldLocal.setConstFlag(isConst);
                    stmts.push(new ArkAssignStmt(fieldLocal, fieldRef));
                }
            } else {
                const item = this.getOrCreatLocal(variableDeclaration.name.getText(this.sourceFile));
                item.setConstFlag(isConst);
                stmts.push(new ArkAssignStmt(item, castExpr));
            }
        } else {
            const { value: item, stmts: itemStmts } = this.tsNodeToValueAndStmts(forOfStatement.initializer);
            stmts.push(...itemStmts);
            stmts.push(new ArkAssignStmt(item, castExpr));
        }
        return stmts;
    }

    private whileStatementToStmts(whileStatement: ts.WhileStatement): Stmt[] {
        const stmts: Stmt[] = [];
        const dummyInitializerStmt = new Stmt();
        dummyInitializerStmt.setText(DUMMY_INITIALIZER_STMT);
        stmts.push(dummyInitializerStmt);

        const {
            value: conditionExpr,
            stmts: conditionStmts,
        } = this.conditionToValueAndStmts(whileStatement.expression);
        stmts.push(...conditionStmts);
        stmts.push(new ArkIfStmt(conditionExpr as ArkConditionExpr));
        return stmts;
    }

    private doStatementToStmts(doStatement: ts.DoStatement): Stmt[] {
        const stmts: Stmt[] = [];
        const {
            value: conditionExpr,
            stmts: conditionStmts,
        } = this.conditionToValueAndStmts(doStatement.expression);
        stmts.push(...conditionStmts);
        stmts.push(new ArkIfStmt(conditionExpr as ArkConditionExpr));
        return stmts;
    }

    private variableStatementToStmts(variableStatement: ts.VariableStatement): Stmt[] {
        return this.variableDeclarationListToStmts(variableStatement.declarationList);
    }

    private variableDeclarationListToStmts(variableDeclarationList: ts.VariableDeclarationList): Stmt[] {
        return this.variableDeclarationListToValueAndStmts(variableDeclarationList).stmts;
    }

    private ifStatementToStmts(ifStatement: ts.IfStatement): Stmt[] {
        const stmts: Stmt[] = [];
        if (this.inBuildMethod) {
            const {
                value: conditionExpr,
                stmts: conditionStmts,
            } = this.conditionToValueAndStmts(ifStatement.expression);
            stmts.push(...conditionStmts);

            const createMethodSignature = ArkSignatureBuilder.buildMethodSignatureFromClassNameAndMethodName(COMPONENT_IF, COMPONENT_CREATE_FUNCTION);
            const {
                value: conditionValue,
                stmts: assignConditionStmts
            } = this.generateAssignStmtForValue(conditionExpr);
            stmts.push(...assignConditionStmts);
            const createInvokeExpr = new ArkStaticInvokeExpr(createMethodSignature, [conditionValue]);
            const { value: _, stmts: createStmts } = this.generateAssignStmtForValue(createInvokeExpr);
            stmts.push(...createStmts);
            const branchMethodSignature = ArkSignatureBuilder.buildMethodSignatureFromClassNameAndMethodName(COMPONENT_IF, COMPONENT_BRANCH_FUNCTION);
            const branchInvokeExpr = new ArkStaticInvokeExpr(branchMethodSignature, [ValueUtil.getOrCreateNumberConst(0)]);
            const branchInvokeStmt = new ArkInvokeStmt(branchInvokeExpr);
            stmts.push(branchInvokeStmt);

            stmts.push(...this.tsNodeToStmts(ifStatement.thenStatement));

            if (ifStatement.elseStatement) {
                const branchElseMethodSignature = ArkSignatureBuilder.buildMethodSignatureFromClassNameAndMethodName(COMPONENT_IF, COMPONENT_BRANCH_FUNCTION);
                const branchElseInvokeExpr = new ArkStaticInvokeExpr(branchElseMethodSignature, [ValueUtil.getOrCreateNumberConst(1)]);
                const branchElseInvokeStmt = new ArkInvokeStmt(branchElseInvokeExpr);
                stmts.push(branchElseInvokeStmt);

                stmts.push(...this.tsNodeToStmts(ifStatement.elseStatement));
            }
            const popMethodSignature = ArkSignatureBuilder.buildMethodSignatureFromClassNameAndMethodName(COMPONENT_IF, COMPONENT_POP_FUNCTION);
            const popInvokeExpr = new ArkStaticInvokeExpr(popMethodSignature, []);
            const popInvokeStmt = new ArkInvokeStmt(popInvokeExpr);
            stmts.push(popInvokeStmt);
        } else {
            const {
                value: conditionExpr,
                stmts: conditionStmts,
            } = this.conditionToValueAndStmts(ifStatement.expression);
            stmts.push(...conditionStmts);
            stmts.push(new ArkIfStmt(conditionExpr as ArkConditionExpr));
        }

        return stmts;
    }

    private gotoStatementToStmts(gotoStatement: ts.BreakStatement | ts.ContinueStatement): Stmt[] {
        return [];
    }

    private throwStatementToStmts(throwStatement: ts.ThrowStatement): Stmt[] {
        const stmts: Stmt[] = [];
        const {
            value: throwValue,
            stmts: throwStmts,
        } = this.tsNodeToValueAndStmts(throwStatement.expression);
        stmts.push(...throwStmts);
        stmts.push(new ArkThrowStmt(throwValue));
        return stmts;
    }

    private catchClauseToStmts(catchClause: ts.CatchClause): Stmt[] {
        const stmts: Stmt[] = [];
        if (catchClause.variableDeclaration) {
            const {
                value: catchValue,
                stmts: catchStmts,
            } = this.tsNodeToValueAndStmts(catchClause.variableDeclaration);
            stmts.push(...catchStmts);
            const caughtExceptionRef = new ArkCaughtExceptionRef(UnknownType.getInstance());
            stmts.push(new ArkAssignStmt(catchValue, caughtExceptionRef));
        }
        return stmts;
    }

    public tsNodeToValueAndStmts(node: ts.Node): ValueAndStmts {
        if (ts.isBinaryExpression(node)) {
            return this.binaryExpressionToValueAndStmts(node);
        } else if (ts.isCallExpression(node)) {
            return this.callExpressionToValueAndStmts(node);
        } else if (ts.isVariableDeclarationList(node)) {
            return this.variableDeclarationListToValueAndStmts(node);
        } else if (ts.isIdentifier(node)) {
            return this.identifierToValueAndStmts(node);
        } else if (ts.isPropertyAccessExpression(node)) {
            return this.propertyAccessExpressionToValue(node);
        } else if (ts.isPrefixUnaryExpression(node)) {
            return this.prefixUnaryExpressionToValueAndStmts(node);
        } else if (ts.isPostfixUnaryExpression(node)) {
            return this.postfixUnaryExpressionToValueAndStmts(node);
        } else if (ts.isTemplateExpression(node)) {
            return this.templateExpressionToValueAndStmts(node);
        } else if (ts.isAwaitExpression(node)) {
            return this.awaitExpressionToValueAndStmts(node);
        } else if (ts.isYieldExpression(node)) {
            return this.yieldExpressionToValueAndStmts(node);
        } else if (ts.isDeleteExpression(node)) {
            return this.deleteExpressionToValueAndStmts(node);
        } else if (ts.isVoidExpression(node)) {
            return this.voidExpressionToValueAndStmts(node);
        } else if (ts.isElementAccessExpression(node)) {
            return this.elementAccessExpressionToValueAndStmts(node);
        } else if (ts.isNewExpression(node)) {
            return this.newExpressionToValueAndStmts(node);
        } else if (ts.isParenthesizedExpression(node)) {
            return this.parenthesizedExpressionToValueAndStmts(node);
        } else if (ts.isAsExpression(node)) {
            return this.asExpressionToValueAndStmts(node);
        } else if (ts.isNonNullExpression(node)) {
            return this.nonNullExpressionToValueAndStmts(node);
        } else if (ts.isTypeAssertionExpression(node)) {
            return this.typeAssertionToValueAndStmts(node);
        } else if (ts.isTypeOfExpression(node)) {
            return this.typeOfExpressionToValueAndStmts(node);
        } else if (ts.isArrayLiteralExpression(node)) {
            return this.arrayLiteralExpressionToValueAndStmts(node);
        } else if (this.isLiteralNode(node)) {
            return this.literalNodeToValueAndStmts(node) as ValueAndStmts;
        } else if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
            return this.callableNodeToValueAndStmts(node);
        } else if (ts.isClassExpression(node)) {
            return this.classExpressionToValueAndStmts(node);
        } else if (ts.isEtsComponentExpression(node)) {
            return this.etsComponentExpressionToValueAndStmts(node);
        } else if (ts.isObjectLiteralExpression(node)) {
            return this.objectLiteralExpresionToValueAndStmts(node);
        } else if (node.kind === ts.SyntaxKind.ThisKeyword) {
            return this.thisExpressionToValueAndStmts(node as ts.ThisExpression);
        } else if (ts.isConditionalExpression(node)) {
            return this.conditionalExpressionToValueAndStmts(node);
        }
        // TODO: handle ts.SpreadElement, ts.ObjectBindingPattern, ts.ArrayBindingPattern

        return { value: new Local(node.getText(this.sourceFile)), stmts: [] };
    }

    private thisExpressionToValueAndStmts(thisExpression: ts.ThisExpression): ValueAndStmts {
        return { value: this.getThisLocal(), stmts: [] };
    }

    private conditionalExpressionToValueAndStmts(conditionalExpression: ts.ConditionalExpression): ValueAndStmts {
        // TODO: separated by blocks
        const stmts: Stmt[] = [];
        const {
            value: conditionValue,
            stmts: conditionStmts,
        } = this.conditionToValueAndStmts(conditionalExpression.condition);
        stmts.push(...conditionStmts);
        stmts.push(new ArkIfStmt(conditionValue as ArkConditionExpr));

        const {
            value: whenTrueValue,
            stmts: whenTrueStmts
        } = this.tsNodeToValueAndStmts(conditionalExpression.whenTrue);
        stmts.push(...whenTrueStmts);
        const { value: resultValue, stmts: tempStmts } = this.generateAssignStmtForValue(whenTrueValue);
        stmts.push(...tempStmts);
        const {
            value: whenFalseValue,
            stmts: whenFalseStmts,
        } = this.tsNodeToValueAndStmts(conditionalExpression.whenFalse);
        stmts.push(...whenFalseStmts);
        stmts.push(new ArkAssignStmt(resultValue, whenFalseValue));
        return { value: resultValue, stmts: stmts };
    }

    private objectLiteralExpresionToValueAndStmts(objectLiteralExpression: ts.ObjectLiteralExpression): ValueAndStmts {
        const declaringArkClass = this.declaringMethod.getDeclaringArkClass();
        const declaringArkNamespace = declaringArkClass.getDeclaringArkNamespace();
        const anonymousClass = new ArkClass();
        if (declaringArkNamespace) {
            buildNormalArkClassFromArkNamespace(objectLiteralExpression, declaringArkNamespace, anonymousClass, this.sourceFile, this.declaringMethod);
            declaringArkNamespace.addArkClass(anonymousClass);
        } else {
            const declaringArkFile = declaringArkClass.getDeclaringArkFile();
            buildNormalArkClassFromArkFile(objectLiteralExpression, declaringArkFile, anonymousClass, this.sourceFile, this.declaringMethod);
            declaringArkFile.addArkClass(anonymousClass);
        }

        const stmts: Stmt[] = [];
        const anonymousClassSignature = anonymousClass.getSignature();
        const anonymousClassType = new ClassType(anonymousClassSignature);
        const newExpr = new ArkNewExpr(anonymousClassType);
        const { value: newExprValue, stmts: newExprStmts } = this.generateAssignStmtForValue(newExpr);
        stmts.push(...newExprStmts);

        const constructorMethodSignature = new MethodSignature();
        constructorMethodSignature.setDeclaringClassSignature(anonymousClassSignature);
        constructorMethodSignature.getMethodSubSignature().setMethodName(CONSTRUCTOR_NAME);
        stmts.push(new ArkInvokeStmt(new ArkInstanceInvokeExpr(newExprValue as Local, constructorMethodSignature, [])));
        return { value: newExprValue, stmts: stmts };
    }

    private createCustomViewStmt(componentName: string, args: Value[],
                                 componentExpression: ts.EtsComponentExpression | ts.CallExpression, currStmts: Stmt[]): ValueAndStmts {
        const stmts: Stmt[] = [...currStmts];

        const classSignature = new ClassSignature();
        classSignature.setClassName(componentName);
        const classType = new ClassType(classSignature);
        const newExpr = new ArkNewExpr(classType);
        const { value: newExprValue, stmts: newExprStmts } = this.generateAssignStmtForValue(newExpr);
        stmts.push(...newExprStmts);

        const methodSubSignature = new MethodSubSignature();
        methodSubSignature.setMethodName('constructor');
        const methodSignature = new MethodSignature();
        methodSignature.setDeclaringClassSignature(classSignature);
        methodSignature.setMethodSubSignature(methodSubSignature);
        stmts.push(new ArkInvokeStmt(new ArkInstanceInvokeExpr(newExprValue as Local, methodSignature, args)));

        let createViewArgs = [newExprValue];
        if (ts.isEtsComponentExpression(componentExpression) && componentExpression.body) {
            const anonymous = ts.factory.createArrowFunction([], [], [], undefined, undefined, componentExpression.body);
            // @ts-ignore
            anonymous.pos = componentExpression.body.pos;
            // @ts-ignore
            anonymous.end = componentExpression.body.end;

            const { value: builderMethod, stmts: _ } = this.callableNodeToValueAndStmts(anonymous);
            createViewArgs.push(builderMethod);
        }
        const createMethodSignature = ArkSignatureBuilder.buildMethodSignatureFromClassNameAndMethodName(COMPONENT_CUSTOMVIEW, COMPONENT_CREATE_FUNCTION);
        let createInvokeExpr = new ArkStaticInvokeExpr(createMethodSignature, createViewArgs);
        const { value: componentValue, stmts: componentStmts } = this.generateAssignStmtForValue(createInvokeExpr);
        stmts.push(...componentStmts);

        const popMethodSignature = ArkSignatureBuilder.buildMethodSignatureFromClassNameAndMethodName(COMPONENT_CUSTOMVIEW, COMPONENT_POP_FUNCTION);
        const popInvokeExpr = new ArkStaticInvokeExpr(popMethodSignature, []);
        stmts.push(new ArkInvokeStmt(popInvokeExpr));
        return { value: componentValue, stmts: stmts };
    }

    private etsComponentExpressionToValueAndStmts(etsComponentExpression: ts.EtsComponentExpression): ValueAndStmts {
        const stmts: Stmt[] = [];
        const componentName = (etsComponentExpression.expression as ts.Identifier).text;
        const args: Value[] = [];
        for (const argument of etsComponentExpression.arguments) {
            let { value: argValue, stmts: arguStmts } = this.tsNodeToValueAndStmts(argument);
            stmts.push(...arguStmts);
            if (IRUtils.moreThanOneAddress(argValue)) {
                ({ value: argValue, stmts: arguStmts } = this.generateAssignStmtForValue(argValue));
                stmts.push(...arguStmts);
            }
            args.push(argValue);
        }

        if (isEtsSystemComponent(componentName)) {
            const createMethodSignature = ArkSignatureBuilder.buildMethodSignatureFromClassNameAndMethodName(componentName, COMPONENT_CREATE_FUNCTION);
            const createInvokeExpr = new ArkStaticInvokeExpr(createMethodSignature, args);
            const { value: componentValue, stmts: componentStmts } = this.generateAssignStmtForValue(createInvokeExpr);
            stmts.push(...componentStmts);

            if (etsComponentExpression.body) {
                for (const statement of etsComponentExpression.body.statements) {
                    stmts.push(...this.tsNodeToStmts(statement));
                }
            }

            const popMethodSignature = ArkSignatureBuilder.buildMethodSignatureFromClassNameAndMethodName(componentName, COMPONENT_POP_FUNCTION);
            const popInvokeExpr = new ArkStaticInvokeExpr(popMethodSignature, []);
            const popInvokeStmt = new ArkInvokeStmt(popInvokeExpr);
            stmts.push(popInvokeStmt);
            return { value: componentValue, stmts: stmts };
        }

        return this.createCustomViewStmt(componentName, args, etsComponentExpression, stmts);
    }

    private classExpressionToValueAndStmts(classExpression: ts.ClassExpression): ValueAndStmts {
        const declaringArkClass = this.declaringMethod.getDeclaringArkClass();
        const declaringArkNamespace = declaringArkClass.getDeclaringArkNamespace();
        const newClass = new ArkClass();
        if (declaringArkNamespace) {
            buildNormalArkClassFromArkNamespace(classExpression, declaringArkNamespace, newClass, this.sourceFile, this.declaringMethod);
            declaringArkNamespace.addArkClass(newClass);
        } else {
            const declaringArkFile = declaringArkClass.getDeclaringArkFile();
            buildNormalArkClassFromArkFile(classExpression, declaringArkFile, newClass, this.sourceFile, this.declaringMethod);
            declaringArkFile.addArkClass(newClass);
        }
        const classValue = this.getOrCreatLocal(newClass.getName(), new ClassType(newClass.getSignature()));
        return { value: classValue, stmts: [] };
    }

    private templateExpressionToValueAndStmts(templateExpression: ts.TemplateExpression): ValueAndStmts {
        const stmts: Stmt[] = [];
        const head = templateExpression.head;
        const values: Value[] = [ValueUtil.createStringConst(head.rawText ? head.rawText : '')];
        for (const templateSpan of templateExpression.templateSpans) {
            const { value: exprValue, stmts: exprStmts } = this.tsNodeToValueAndStmts(templateSpan.expression);
            stmts.push(...exprStmts);
            const literalRawText = templateSpan.literal.rawText;
            const literalStr = literalRawText ? literalRawText : '';
            values.push(exprValue);
            values.push(ValueUtil.createStringConst(literalStr));
        }
        let {
            value: combinationValue,
            stmts: combinatioStmts,
        } = this.generateAssignStmtForValue(new ArkNormalBinopExpr(values[0], values[1], NormalBinaryOperator.Addition));
        stmts.push(...combinatioStmts);
        for (let i = 2; i < values.length; i++) { // next iteration start from index 2
            ({
                value: combinationValue,
                stmts: combinatioStmts,
            } = this.generateAssignStmtForValue(new ArkNormalBinopExpr(combinationValue, values[i], NormalBinaryOperator.Addition)));
            stmts.push(...combinatioStmts);
        }
        return { value: combinationValue, stmts: stmts };
    }

    private identifierToValueAndStmts(identifier: ts.Identifier): ValueAndStmts {
        // TODO: handle global variable
        let value: Value;
        if (identifier.text == UndefinedType.getInstance().getName()) {
            value = ValueUtil.getUndefinedConst();
        } else {
            value = this.getOrCreatLocal(identifier.text);
        }
        return { value: value, stmts: [] };
    }

    private propertyAccessExpressionToValue(propertyAccessExpression: ts.PropertyAccessExpression): ValueAndStmts {
        const stmts: Stmt[] = [];
        let {
            value: baseValue,
            stmts: baseStmts,
        } = this.tsNodeToValueAndStmts(propertyAccessExpression.expression);
        stmts.push(...baseStmts);
        if (IRUtils.moreThanOneAddress(baseValue)) {
            ({ value: baseValue, stmts: baseStmts } = this.generateAssignStmtForValue(baseValue));
            stmts.push(...baseStmts);
        }
        if (!(baseValue instanceof Local)) {
            ({ value: baseValue, stmts: baseStmts } = this.generateAssignStmtForValue(baseValue));
            stmts.push(...baseStmts);
        }
        const fieldSignature = new FieldSignature();
        fieldSignature.setFieldName(propertyAccessExpression.name.getText(this.sourceFile));
        const fieldRef = new ArkInstanceFieldRef(baseValue as Local, fieldSignature);
        return { value: fieldRef, stmts: stmts };
    }

    private elementAccessExpressionToValueAndStmts(elementAccessExpression: ts.ElementAccessExpression): ValueAndStmts {
        const stmts: Stmt[] = [];
        let { value: baseValue, stmts: baseStmts } = this.tsNodeToValueAndStmts(elementAccessExpression.expression);
        stmts.push(...baseStmts);
        if (!(baseValue instanceof Local)) {
            ({ value: baseValue, stmts: baseStmts } = this.generateAssignStmtForValue(baseValue));
            stmts.push(...baseStmts);
        }
        let {
            value: argumentValue,
            stmts: argumentStmts,
        } = this.tsNodeToValueAndStmts(elementAccessExpression.argumentExpression);
        stmts.push(...argumentStmts);
        if (IRUtils.moreThanOneAddress(argumentValue)) {
            ({ value: argumentValue, stmts: argumentStmts } = this.generateAssignStmtForValue(argumentValue));
            stmts.push(...argumentStmts);
        }

        let elementAccessExpr: Value;
        if (baseValue.getType() instanceof ArrayType) {
            elementAccessExpr = new ArkArrayRef(baseValue as Local, argumentValue);
        } else {
            // TODO: deal with ArkStaticFieldRef
            const fieldSignature = new FieldSignature();
            fieldSignature.setFieldName(argumentValue.toString());
            elementAccessExpr = new ArkInstanceFieldRef(baseValue as Local, fieldSignature);
        }
        return { value: elementAccessExpr, stmts: stmts };
    }

    private callExpressionToValueAndStmts(callExpression: ts.CallExpression): ValueAndStmts {
        const stmts: Stmt[] = [];
        const args: Value[] = [];
        for (const argument of callExpression.arguments) {
            let { value: argValue, stmts: arguStmts } = this.tsNodeToValueAndStmts(argument);
            stmts.push(...arguStmts);
            if (IRUtils.moreThanOneAddress(argValue)) {
                ({ value: argValue, stmts: arguStmts } = this.generateAssignStmtForValue(argValue));
                stmts.push(...arguStmts);
            }
            args.push(argValue);
        }

        const methodSignature = new MethodSignature();
        let {
            value: callerValue,
            stmts: callerStmts,
        } = this.tsNodeToValueAndStmts(callExpression.expression);
        stmts.push(...callerStmts);
        let invokeValue: Value;
        if (callerValue instanceof ArkInstanceFieldRef) {
            methodSignature.getMethodSubSignature().setMethodName(callerValue.getFieldName());
            invokeValue = new ArkInstanceInvokeExpr(callerValue.getBase(), methodSignature, args);
        } else if (callerValue instanceof ArkStaticFieldRef) {
            methodSignature.getMethodSubSignature().setMethodName(callerValue.getFieldName());
            invokeValue = new ArkStaticInvokeExpr(methodSignature, args);
        } else if (callerValue instanceof Local) {
            const callerName = callerValue.getName();
            let classSignature = new ClassSignature();
            classSignature.setClassName(callerName);
            // temp for component
            let cls = ModelUtils.getClass(this.declaringMethod, classSignature);
            if (cls?.hasComponentDecorator()) {
                return this.createCustomViewStmt(callerName, args, callExpression, stmts);
            }

            methodSignature.getMethodSubSignature().setMethodName(callerName);
            invokeValue = new ArkStaticInvokeExpr(methodSignature, args);

        } else {
            ({ value: callerValue, stmts: callerStmts } = this.generateAssignStmtForValue(callerValue));
            stmts.push(...callerStmts);
            methodSignature.getMethodSubSignature().setMethodName((callerValue as Local).getName());
            invokeValue = new ArkStaticInvokeExpr(methodSignature, args);
        }
        return { value: invokeValue, stmts: stmts };
    }

    private callableNodeToValueAndStmts(callableNode: ts.ArrowFunction | ts.FunctionExpression): ValueAndStmts {
        const declaringClass = this.declaringMethod.getDeclaringArkClass();
        const arrowArkMethod = new ArkMethod();
        buildArkMethodFromArkClass(callableNode, declaringClass, arrowArkMethod, this.sourceFile, this.declaringMethod);
        declaringClass.addMethod(arrowArkMethod);

        const callableType = new FunctionType(arrowArkMethod.getSignature());
        const callableValue = this.getOrCreatLocal(arrowArkMethod.getName(), callableType);
        return { value: callableValue, stmts: [] };
    }

    private newExpressionToValueAndStmts(newExpression: ts.NewExpression): ValueAndStmts {
        // TODO: get class signature first
        // TODO: deal with generics
        const stmts: Stmt[] = [];
        const className = newExpression.expression.getText(this.sourceFile);
        if (className === 'Array') {
            let baseType: Type = AnyType.getInstance();
            if (newExpression.typeArguments && newExpression.typeArguments.length > 0) {
                const argumentType = this.resolveTypeNode(newExpression.typeArguments[0]);
                if (!(argumentType instanceof AnyType || argumentType instanceof UnknownType)) {
                    baseType = argumentType;
                }
            }

            let arrayLength = 0;
            const argumentValues: Value[] = [];
            if (newExpression.arguments && newExpression.arguments.length > 0) {
                arrayLength = newExpression.arguments.length;
                for (const argument of newExpression.arguments) {
                    const {
                        value: argumentValue,
                        stmts: argumentStmts,
                    } = this.tsNodeToValueAndStmts((argument));
                    argumentValues.push(argumentValue);
                    stmts.push(...argumentStmts);
                }
            }
            let arrayLengthValue: Value = ValueUtil.getOrCreateNumberConst(arrayLength);
            if (arrayLength === 1) {
                arrayLengthValue = argumentValues[0];
            } else if (arrayLength > 1 && !(argumentValues[0].getType() instanceof AnyType || argumentValues[0].getType() instanceof UnknownType)) {
                baseType = argumentValues[0].getType();
            }

            const {
                value: arrayExprValue,
                stmts: arrayStmts,
            } = this.generateAssignStmtForValue(new ArkNewArrayExpr(baseType, arrayLengthValue));
            stmts.push(...arrayStmts);

            if (arrayLength > 1) {
                for (let i = 0; i < arrayLength; i++) {
                    const arrayRef = new ArkArrayRef(arrayExprValue as Local, ValueUtil.getOrCreateNumberConst(i));
                    stmts.push(new ArkAssignStmt(arrayRef, argumentValues[i]));
                }
            }

            return { value: arrayExprValue, stmts: stmts };
        } else {
            const classSignature = new ClassSignature();
            classSignature.setClassName(className);
            const classType = new ClassType(classSignature);
            const newExpr = new ArkNewExpr(classType);
            const { value: newExprValue, stmts: newExprStmts } = this.generateAssignStmtForValue(newExpr);
            stmts.push(...newExprStmts);

            const methodSubSignature = new MethodSubSignature();
            methodSubSignature.setMethodName('constructor');
            const methodSignature = new MethodSignature();
            methodSignature.setDeclaringClassSignature(classSignature);
            methodSignature.setMethodSubSignature(methodSubSignature);

            const argValues: Value[] = [];
            if (newExpression.arguments) {
                for (const argument of newExpression.arguments) {
                    let { value: argValue, stmts: argStmts } = this.tsNodeToValueAndStmts(argument);
                    stmts.push(...argStmts);
                    if (IRUtils.moreThanOneAddress(argValue)) {
                        ({ value: argValue, stmts: argStmts } = this.generateAssignStmtForValue(argValue));
                        stmts.push(...argStmts);
                    }
                    argValues.push(argValue);
                }
            }
            stmts.push(new ArkInvokeStmt(new ArkInstanceInvokeExpr(newExprValue as Local, methodSignature, argValues)));
            return { value: newExprValue, stmts: stmts };
        }
    }

    private arrayLiteralExpressionToValueAndStmts(arrayLiteralExpression: ts.ArrayLiteralExpression): ValueAndStmts {
        const stmts: Stmt[] = [];
        const elementTypes: Set<Type> = new Set();
        const elementValues: Value[] = [];
        const arrayLength = arrayLiteralExpression.elements.length;
        for (const element of arrayLiteralExpression.elements) {
            let { value: elementValue, stmts: elementStmts } = this.tsNodeToValueAndStmts(element);
            stmts.push(...elementStmts);
            if (IRUtils.moreThanOneAddress(elementValue)) {
                ({ value: elementValue, stmts: elementStmts } = this.generateAssignStmtForValue(elementValue));
                stmts.push(...elementStmts);
            }
            elementValues.push(elementValue);
            elementTypes.add(elementValue.getType());
        }

        let baseType = AnyType.getInstance();
        if (elementTypes.size == 1) {
            baseType = elementTypes.keys().next().value;
        } else if (elementTypes.size > 1) {
            baseType = new UnionType(Array.from(elementTypes));
        }
        const newArrayExpr = new ArkNewArrayExpr(baseType, ValueUtil.getOrCreateNumberConst(arrayLength), true);
        const {value: newArrayValue, stmts: elementStmts} = this.generateAssignStmtForValue(newArrayExpr);
        stmts.push(...elementStmts);

        for (let i = 0; i < arrayLength; i++) {
            const arrayRef = new ArkArrayRef(newArrayValue as Local, ValueUtil.getOrCreateNumberConst(i));
            stmts.push(new ArkAssignStmt(arrayRef, elementValues[i]));
        }
        return { value: newArrayValue, stmts: stmts };
    }

    private prefixUnaryExpressionToValueAndStmts(prefixUnaryExpression: ts.PrefixUnaryExpression): ValueAndStmts {
        const stmts: Stmt[] = [];
        let {
            value: operandValue,
            stmts: exprStmts,
        } = this.tsNodeToValueAndStmts(prefixUnaryExpression.operand);
        stmts.push(...exprStmts);
        if (IRUtils.moreThanOneAddress(operandValue)) {
            ({ value: operandValue, stmts: exprStmts } = this.generateAssignStmtForValue(operandValue));
            stmts.push(...exprStmts);
        }

        const operatorToken = prefixUnaryExpression.operator;
        if (operatorToken === ts.SyntaxKind.PlusPlusToken) {
            const binopExpr = new ArkNormalBinopExpr(operandValue, ValueUtil.getOrCreateNumberConst(1), NormalBinaryOperator.Addition);
            stmts.push(new ArkAssignStmt(operandValue, binopExpr));
            return { value: operandValue, stmts: stmts };
        } else if (operatorToken === ts.SyntaxKind.MinusMinusToken) {
            const binopExpr = new ArkNormalBinopExpr(operandValue, ValueUtil.getOrCreateNumberConst(1), NormalBinaryOperator.Subtraction);
            stmts.push(new ArkAssignStmt(operandValue, binopExpr));
            return { value: operandValue, stmts: stmts };
        } else if (operatorToken === ts.SyntaxKind.PlusToken) {
            return { value: operandValue, stmts: stmts };
        } else {
            let unopExpr: Value;
            const operator = ArkIRTransformer.tokenToUnaryOperator(operatorToken);
            if (operator) {
                unopExpr = new ArkUnopExpr(operandValue, operator);
            } else {
                unopExpr = ValueUtil.getUndefinedConst();
            }
            return { value: unopExpr, stmts: stmts };
        }
    }

    private postfixUnaryExpressionToValueAndStmts(postfixUnaryExpression: ts.PostfixUnaryExpression): ValueAndStmts {
        const stmts: Stmt[] = [];
        let {
            value: operandValue,
            stmts: exprStmts,
        } = this.tsNodeToValueAndStmts(postfixUnaryExpression.operand);
        stmts.push(...exprStmts);
        if (IRUtils.moreThanOneAddress(operandValue)) {
            ({ value: operandValue, stmts: exprStmts } = this.generateAssignStmtForValue(operandValue));
            stmts.push(...exprStmts);
        }

        let value: Value;
        const operatorToken = postfixUnaryExpression.operator;
        if (operatorToken === ts.SyntaxKind.PlusPlusToken) {
            const binopExpr = new ArkNormalBinopExpr(operandValue, ValueUtil.getOrCreateNumberConst(1), NormalBinaryOperator.Addition);
            stmts.push(new ArkAssignStmt(operandValue, binopExpr));
            value = operandValue;
        } else if (operatorToken === ts.SyntaxKind.MinusMinusToken) {
            const binopExpr = new ArkNormalBinopExpr(operandValue, ValueUtil.getOrCreateNumberConst(1), NormalBinaryOperator.Subtraction);
            stmts.push(new ArkAssignStmt(operandValue, binopExpr));
            value = operandValue;
        } else {
            value = ValueUtil.getUndefinedConst();
        }

        return { value: value, stmts: stmts };
    }

    private awaitExpressionToValueAndStmts(awaitExpression: ts.AwaitExpression): ValueAndStmts {
        const { value: promiseValue, stmts: stmts } = this.tsNodeToValueAndStmts(awaitExpression.expression);
        const awaitExpr = new ArkAwaitExpr(promiseValue);
        return { value: awaitExpr, stmts: stmts };
    }

    private yieldExpressionToValueAndStmts(yieldExpression: ts.YieldExpression): ValueAndStmts {
        let yieldValue: Value = ValueUtil.getUndefinedConst();
        let stmts: Stmt[] = [];
        if (yieldExpression.expression) {
            ({ value: yieldValue, stmts: stmts } = this.tsNodeToValueAndStmts(yieldExpression.expression));
        }

        const yieldExpr = new ArkYieldExpr(yieldValue);
        return { value: yieldExpr, stmts: stmts };
    }

    private deleteExpressionToValueAndStmts(deleteExpression: ts.DeleteExpression): ValueAndStmts {
        const { value: exprValue, stmts: stmts } = this.tsNodeToValueAndStmts(deleteExpression.expression);
        const deleteExpr = new ArkDeleteExpr(exprValue as AbstractFieldRef);
        return { value: deleteExpr, stmts: stmts };
    }

    private voidExpressionToValueAndStmts(voidExpression: ts.VoidExpression): ValueAndStmts {
        const stmts = this.expressionToStmts(voidExpression.expression);
        return { value: ValueUtil.getUndefinedConst(), stmts: stmts };
    }

    private nonNullExpressionToValueAndStmts(nonNullExpression: ts.NonNullExpression): ValueAndStmts {
        return this.tsNodeToValueAndStmts(nonNullExpression.expression);
    }

    private parenthesizedExpressionToValueAndStmts(parenthesizedExpression: ts.ParenthesizedExpression): ValueAndStmts {
        return this.tsNodeToValueAndStmts(parenthesizedExpression.expression);
    }

    private typeOfExpressionToValueAndStmts(typeOfExpression: ts.TypeOfExpression): ValueAndStmts {
        const { value: exprValue, stmts: exprStmts } = this.tsNodeToValueAndStmts(typeOfExpression.expression);
        const typeOfExpr = new ArkTypeOfExpr(exprValue);
        return { value: typeOfExpr, stmts: exprStmts };
    }

    private asExpressionToValueAndStmts(asExpression: ts.AsExpression): ValueAndStmts {
        const stmts: Stmt[] = [];
        let { value: exprValue, stmts: exprStmts } = this.tsNodeToValueAndStmts(asExpression.expression);
        stmts.push(...exprStmts);
        if (IRUtils.moreThanOneAddress(exprValue)) {
            ({ value: exprValue, stmts: exprStmts } = this.generateAssignStmtForValue(exprValue));
            stmts.push(...exprStmts);
        }
        const castExpr = new ArkCastExpr(exprValue, this.resolveTypeNode(asExpression.type));
        return { value: castExpr, stmts: stmts };
    }

    private typeAssertionToValueAndStmts(typeAssertion: ts.TypeAssertion): ValueAndStmts {
        const { value: exprValue, stmts: exprStmts } = this.tsNodeToValueAndStmts(typeAssertion.expression);
        const castExpr = new ArkCastExpr(exprValue, this.resolveTypeNode(typeAssertion.type));
        return { value: castExpr, stmts: exprStmts };
    }

    private variableDeclarationListToValueAndStmts(variableDeclarationList: ts.VariableDeclarationList): ValueAndStmts {
        const stmts: Stmt[] = [];
        let declaredValue!: Value;
        for (const declaration of variableDeclarationList.declarations) {
            const {
                value: newDeclaredValue,
                stmts: declaredStmts,
            } = this.variableDeclarationToValueAndStmts(declaration, variableDeclarationList.flags);
            stmts.push(...declaredStmts);
            declaredValue = newDeclaredValue;
        }
        return { value: declaredValue, stmts: stmts };
    }

    private variableDeclarationToValueAndStmts(variableDeclaration: ts.VariableDeclaration, nodeFlag: ts.NodeFlags): ValueAndStmts {
        const leftOpNode = variableDeclaration.name;
        let rightOpNode: ts.Node | null = null;
        if (variableDeclaration.initializer) {
            rightOpNode = variableDeclaration.initializer;
        }

        const stmts: Stmt[] = [];
        let { value: leftValue, stmts: leftStmts } = this.tsNodeToValueAndStmts(leftOpNode);
        stmts.push(...leftStmts);
        let rightValue: Value;
        if (rightOpNode) {
            let {
                value: tempRightValue,
                stmts: rightStmts,
            } = this.tsNodeToValueAndStmts(rightOpNode);
            stmts.push(...rightStmts);
            rightValue = tempRightValue;
        } else {
            rightValue = ValueUtil.getUndefinedConst();
        }
        if (IRUtils.moreThanOneAddress(leftValue) && IRUtils.moreThanOneAddress(rightValue)) {
            const { value: tempRightValue, stmts: rightStmts } = this.generateAssignStmtForValue(rightValue);
            stmts.push(...rightStmts);
            rightValue = tempRightValue;
        }

        if (leftValue instanceof Local) {
            leftValue.setConstFlag(nodeFlag == ts.NodeFlags.Const);
            if (variableDeclaration.type) {
                leftValue.setType(this.resolveTypeNode(variableDeclaration.type));
            }
            if (leftValue.getType() instanceof UnknownType && !(rightValue.getType() instanceof UnknownType) &&
                !(rightValue.getType() instanceof UndefinedType)) {
                leftValue.setType(rightValue.getType());
            }
        }
        stmts.push(new ArkAssignStmt(leftValue, rightValue));

        if (ts.isArrayBindingPattern(leftOpNode)) {
            const elements = leftOpNode.elements;
            let index = 0;
            for (const element of elements) {
                let arrayRef = new ArkArrayRef(leftValue as Local, new Constant(index.toString(), NumberType.getInstance()));
                let arrayItem = new Constant(element.getText(this.sourceFile));
                stmts.push(new ArkAssignStmt(arrayItem, arrayRef));
                index++;
            }
        } else if (ts.isObjectBindingPattern(leftOpNode)) {
            const elements = leftOpNode.elements;
            for (const element of elements) {
                const fieldName = element.name.getText(this.sourceFile);
                const fieldSignature = new FieldSignature();
                fieldSignature.setFieldName(fieldName);
                const fieldRef = new ArkInstanceFieldRef(leftValue as Local, fieldSignature);
                if (element.initializer) {
                    let {
                        value: initializerValue,
                        stmts: initializerStmts,
                    } = this.tsNodeToValueAndStmts(element.initializer);
                    stmts.push(...initializerStmts);
                    stmts.push(new ArkAssignStmt(initializerValue, fieldRef));
                } else {
                    let {
                        value: nameValue,
                        stmts: nameStmts,
                    } = this.tsNodeToValueAndStmts(element.name);
                    stmts.push(...nameStmts);
                    stmts.push(new ArkAssignStmt(nameValue, fieldRef));
                }
            }
        }
        return { value: leftValue, stmts: stmts };
    }

    private binaryExpressionToValueAndStmts(binaryExpression: ts.BinaryExpression): ValueAndStmts {
        const compoundAssignmentOperators = new Set([ts.SyntaxKind.PlusEqualsToken,
            ts.SyntaxKind.MinusEqualsToken,
            ts.SyntaxKind.AsteriskAsteriskEqualsToken,
            ts.SyntaxKind.AsteriskEqualsToken,
            ts.SyntaxKind.SlashEqualsToken,
            ts.SyntaxKind.PercentEqualsToken,
            ts.SyntaxKind.AmpersandEqualsToken,
            ts.SyntaxKind.BarEqualsToken,
            ts.SyntaxKind.CaretEqualsToken,
            ts.SyntaxKind.LessThanLessThanEqualsToken,
            ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken,
            ts.SyntaxKind.GreaterThanGreaterThanEqualsToken,
            ts.SyntaxKind.BarBarEqualsToken,
            ts.SyntaxKind.AmpersandAmpersandEqualsToken,
            ts.SyntaxKind.QuestionQuestionEqualsToken]);

        const operatorToken = binaryExpression.operatorToken;
        if (operatorToken.kind === ts.SyntaxKind.FirstAssignment) {
            return this.assignmentToValueAndStmts(binaryExpression);
        } else if (compoundAssignmentOperators.has(operatorToken.kind)) {
            return this.compoundAssignmentToValueAndStmts(binaryExpression);
        }

        const stmts: Stmt[] = [];
        let {
            value: opValue1,
            stmts: opStmts1,
        } = this.tsNodeToValueAndStmts(binaryExpression.left);
        stmts.push(...opStmts1);
        if (IRUtils.moreThanOneAddress(opValue1)) {
            ({ value: opValue1, stmts: opStmts1 } = this.generateAssignStmtForValue(opValue1));
            stmts.push(...opStmts1);
        }

        if (operatorToken.kind === ts.SyntaxKind.InstanceOfKeyword) {
            const instanceOfExpr = new ArkInstanceOfExpr(opValue1, new UnclearReferenceType(binaryExpression.right.getText(this.sourceFile)));
            return { value: instanceOfExpr, stmts: stmts };
        }

        let {
            value: opValue2,
            stmts: opStmts2,
        } = this.tsNodeToValueAndStmts(binaryExpression.right);
        stmts.push(...opStmts2);
        if (IRUtils.moreThanOneAddress(opValue2)) {
            ({ value: opValue2, stmts: opStmts2 } = this.generateAssignStmtForValue(opValue2));
            stmts.push(...opStmts2);
        }

        let exprValue: Value;
        if (operatorToken.kind === ts.SyntaxKind.CommaToken) {
            exprValue = opValue2;
        } else {
            const operator = ArkIRTransformer.tokenToBinaryOperator(operatorToken.kind);
            if (operator) {
                if (this.isRelationalOperator(operator)) {
                    exprValue = new ArkConditionExpr(opValue1, opValue2, operator as RelationalBinaryOperator);
                } else {
                    exprValue = new ArkNormalBinopExpr(opValue1, opValue2, operator as NormalBinaryOperator);
                }
            } else {
                exprValue = ValueUtil.getUndefinedConst();
            }
        }

        return { value: exprValue, stmts: stmts };
    }

    private assignmentToValueAndStmts(binaryExpression: ts.BinaryExpression): ValueAndStmts {
        const leftOpNode = binaryExpression.left;
        const rightOpNode = binaryExpression.right;
        const stmts: Stmt[] = [];
        let { value: leftValue, stmts: leftStmts } = this.tsNodeToValueAndStmts(leftOpNode);
        stmts.push(...leftStmts);
        let { value: rightValue, stmts: rightStmts } = this.tsNodeToValueAndStmts(rightOpNode);
        stmts.push(...rightStmts);
        if (IRUtils.moreThanOneAddress(leftValue) && IRUtils.moreThanOneAddress(rightValue)) {
            const { value: tempRightValue, stmts: rightStmts } = this.generateAssignStmtForValue(rightValue);
            stmts.push(...rightStmts);
            rightValue = tempRightValue;
        }
        if (leftValue instanceof Local && leftValue.getType() instanceof UnknownType
            && !(rightValue.getType() instanceof UnknownType)) {
            leftValue.setType(rightValue.getType());
        }

        stmts.push(new ArkAssignStmt(leftValue, rightValue));
        return { value: leftValue, stmts: stmts };
    }

    private compoundAssignmentToValueAndStmts(binaryExpression: ts.BinaryExpression): ValueAndStmts {
        const stmts: Stmt[] = [];
        let {
            value: leftValue,
            stmts: leftStmts,
        } = this.tsNodeToValueAndStmts(binaryExpression.left);
        stmts.push(...leftStmts);
        let {
            value: rightValue,
            stmts: rightStmts,
        } = this.tsNodeToValueAndStmts(binaryExpression.right);
        stmts.push(...rightStmts);
        if (IRUtils.moreThanOneAddress(leftValue) && IRUtils.moreThanOneAddress(rightValue)) {
            const { value: newRightValue, stmts: rightStmts } = this.generateAssignStmtForValue(rightValue);
            rightValue = newRightValue;
            stmts.push(...rightStmts);
        }

        let value: Value;
        const operator = this.compoundAssignmentTokenToBinaryOperator(binaryExpression.operatorToken.kind);
        if (operator) {
            const exprValue = new ArkNormalBinopExpr(leftValue, rightValue, operator);
            stmts.push(new ArkAssignStmt(leftValue, exprValue));
            value = leftValue;
        } else {
            value = ValueUtil.getUndefinedConst();
        }
        return { value: value, stmts: stmts };
    }

    private compoundAssignmentTokenToBinaryOperator(token: ts.SyntaxKind): NormalBinaryOperator | null {
        switch (token) {
            case ts.SyntaxKind.QuestionQuestionEqualsToken:
                return NormalBinaryOperator.NullishCoalescing;
            case ts.SyntaxKind.AsteriskAsteriskEqualsToken:
                return NormalBinaryOperator.Exponentiation;
            case ts.SyntaxKind.SlashEqualsToken:
                return NormalBinaryOperator.Division;
            case ts.SyntaxKind.PlusEqualsToken:
                return NormalBinaryOperator.Addition;
            case ts.SyntaxKind.MinusEqualsToken:
                return NormalBinaryOperator.Subtraction;
            case ts.SyntaxKind.AsteriskEqualsToken:
                return NormalBinaryOperator.Multiplication;
            case ts.SyntaxKind.PercentEqualsToken:
                return NormalBinaryOperator.Remainder;
            case ts.SyntaxKind.LessThanLessThanEqualsToken:
                return NormalBinaryOperator.LeftShift;
            case ts.SyntaxKind.GreaterThanGreaterThanEqualsToken:
                return NormalBinaryOperator.RightShift;
            case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken:
                return NormalBinaryOperator.UnsignedRightShift;
            case ts.SyntaxKind.AmpersandEqualsToken:
                return NormalBinaryOperator.BitwiseAnd;
            case ts.SyntaxKind.BarEqualsToken:
                return NormalBinaryOperator.BitwiseOr;
            case ts.SyntaxKind.CaretEqualsToken:
                return NormalBinaryOperator.BitwiseXor;
            case ts.SyntaxKind.AmpersandAmpersandEqualsToken:
                return NormalBinaryOperator.LogicalAnd;
            case ts.SyntaxKind.BarBarEqualsToken:
                return NormalBinaryOperator.LogicalOr;
        }
        return null;
    }

    private conditionToValueAndStmts(condition: ts.Expression): ValueAndStmts {
        const stmts: Stmt[] = [];
        let {
            value: conditionValue,
            stmts: conditionStmts,
        } = this.tsNodeToValueAndStmts(condition);
        stmts.push(...conditionStmts);
        let conditionExpr: ArkConditionExpr;
        if ((conditionValue instanceof AbstractBinopExpr) && this.isRelationalOperator(conditionValue.getOperator())) {
            const operator = conditionValue.getOperator() as RelationalBinaryOperator;
            conditionExpr = new ArkConditionExpr(conditionValue.getOp1(), conditionValue.getOp2(), operator);
        } else {
            if (IRUtils.moreThanOneAddress(conditionValue)) {
                ({
                    value: conditionValue,
                    stmts: conditionStmts,
                } = this.generateAssignStmtForValue(conditionValue));
                stmts.push(...conditionStmts);
            }
            conditionExpr = new ArkConditionExpr(conditionValue, ValueUtil.getOrCreateNumberConst(0), RelationalBinaryOperator.InEquality);
        }
        return { value: conditionExpr, stmts: stmts };
    }

    private literalNodeToValueAndStmts(literalNode: ts.Node): ValueAndStmts | null {
        const syntaxKind = literalNode.kind;
        let constant: Constant | null = null;
        switch (syntaxKind) {
            case ts.SyntaxKind.NumericLiteral:
                constant = ValueUtil.getOrCreateNumberConst(parseFloat((literalNode as ts.NumericLiteral).text));
                break;
            case ts.SyntaxKind.BigIntLiteral:
                constant = ValueUtil.getOrCreateNumberConst(parseInt((literalNode as ts.BigIntLiteral).text));
                break;
            case ts.SyntaxKind.StringLiteral:
                constant = ValueUtil.createStringConst((literalNode as ts.StringLiteral).text);
                break;
            case ts.SyntaxKind.RegularExpressionLiteral:
                const classSignature = new ClassSignature();
                classSignature.setClassName('RegExp');
                constant = new Constant((literalNode as ts.RegularExpressionLiteral).text, classSignature.getType());
                break;
            case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
                constant = ValueUtil.createStringConst((literalNode as ts.NoSubstitutionTemplateLiteral).text);
                break;
            case ts.SyntaxKind.NullKeyword:
                constant = ValueUtil.getNullConstant();
                break;
            case ts.SyntaxKind.UndefinedKeyword:
                constant = ValueUtil.getUndefinedConst();
                break;
            case ts.SyntaxKind.TrueKeyword:
                constant = ValueUtil.getBooleanConstant(true);
                break;
            case ts.SyntaxKind.FalseKeyword:
                constant = ValueUtil.getBooleanConstant(false);
                break;
            default:
                logger.warn(`ast node's syntaxKind is ${ts.SyntaxKind[literalNode.kind]}, not literalNode`);
        }

        if (constant === null) {
            return null;
        }
        return { value: constant, stmts: [] };
    }

    private getOrCreatLocal(localName: string, localType: Type = UnknownType.getInstance()): Local {
        let local = this.locals.get(localName) || null;
        if (local == null) {
            local = new Local(localName, localType);
            this.locals.set(localName, local);
        }
        return local;
    }

    private generateTempLocal(localType: Type = UnknownType.getInstance()): Local {
        const tempLocalName = this.tempLocalPrefix + this.tempLocalIndex;
        this.tempLocalIndex++;
        const tempLocal: Local = new Local(tempLocalName, localType);
        this.locals.set(tempLocalName, tempLocal);
        return tempLocal;
    }

    public generateAssignStmtForValue(value: Value): ValueAndStmts {
        const leftOp = this.generateTempLocal(value.getType());
        return { value: leftOp, stmts: [new ArkAssignStmt(leftOp, value)] };
    }

    private isRelationalOperator(operator: BinaryOperator): boolean {
        return operator == RelationalBinaryOperator.LessThan ||
            operator == RelationalBinaryOperator.LessThanOrEqual ||
            operator == RelationalBinaryOperator.GreaterThan ||
            operator == RelationalBinaryOperator.GreaterThanOrEqual ||
            operator == RelationalBinaryOperator.Equality ||
            operator == RelationalBinaryOperator.InEquality ||
            operator == RelationalBinaryOperator.StrictEquality ||
            operator == RelationalBinaryOperator.StrictInequality;
    }

    private resolveTypeNode(type: ts.TypeNode): Type {
        const kind = type.kind;
        switch (kind) {
            case ts.SyntaxKind.BooleanKeyword:
                return BooleanType.getInstance();
            case ts.SyntaxKind.NumberKeyword:
                return NumberType.getInstance();
            case ts.SyntaxKind.StringKeyword:
                return StringType.getInstance();
            case ts.SyntaxKind.UndefinedKeyword:
                return UndefinedType.getInstance();
            case ts.SyntaxKind.AnyKeyword:
                return AnyType.getInstance();
            case ts.SyntaxKind.VoidKeyword:
                return VoidType.getInstance();
            case ts.SyntaxKind.NeverKeyword:
                return NeverType.getInstance();
            case ts.SyntaxKind.TypeReference:
                return this.resolveTypeReferenceNode(type as ts.TypeReferenceNode);
            case ts.SyntaxKind.ArrayType:
                return new ArrayType(this.resolveTypeNode((type as ts.ArrayTypeNode).elementType), 1);
            case ts.SyntaxKind.UnionType:
                const cur = type as ts.UnionTypeNode;
                const mayTypes: Type[] = [];
                cur.types.forEach(t => mayTypes.push(this.resolveTypeNode(t)));
                return new UnionType(mayTypes);
            case ts.SyntaxKind.TupleType:
                const types: Type[] = [];
                (type as ts.TupleTypeNode).elements.forEach(element => {
                    types.push(this.resolveTypeNode(element));
                });
                return new TupleType(types);
            case ts.SyntaxKind.NamedTupleMember:
                return this.resolveTypeNode((type as ts.NamedTupleMember).type);
            case ts.SyntaxKind.LiteralType:
                return this.resolveLiteralTypeNode(type as ts.LiteralTypeNode);
            case ts.SyntaxKind.TemplateLiteralType:
                return this.resolveTemplateLiteralTypeNode(type as ts.TemplateLiteralTypeNode);
            case ts.SyntaxKind.TypeLiteral:
                return this.resolveTypeLiteralNode(type as ts.TypeLiteralNode);
            case ts.SyntaxKind.FunctionType:
                return this.resolveFunctionTypeNode(type as ts.FunctionTypeNode);
        }
        return UnknownType.getInstance();
    }

    private resolveLiteralTypeNode(literalTypeNode: ts.LiteralTypeNode): Type {
        const literal = literalTypeNode.literal;
        const kind = literal.kind;
        switch (kind) {
            case ts.SyntaxKind.NullKeyword:
                return NullType.getInstance();
            case ts.SyntaxKind.TrueKeyword:
                return LiteralType.TRUE;
            case ts.SyntaxKind.FalseKeyword:
                return LiteralType.FALSE;
            case ts.SyntaxKind.NumericLiteral:
                return new LiteralType(parseFloat((literal as ts.NumericLiteral).text));
            case ts.SyntaxKind.PrefixUnaryExpression:
                return new LiteralType(parseFloat(literal.getText(this.sourceFile)));
        }
        return new LiteralType(literal.getText(this.sourceFile));
    }

    private resolveTemplateLiteralTypeNode(templateLiteralTypeNode: ts.TemplateLiteralTypeNode): Type {
        let stringLiterals: string[] = [''];
        const headString = templateLiteralTypeNode.head.rawText || '';
        let newStringLiterals: string[] = [];
        for (const stringLiteral of stringLiterals) {
            newStringLiterals.push(stringLiteral + headString);
        }
        stringLiterals = newStringLiterals;
        newStringLiterals = [];

        for (const templateSpan of templateLiteralTypeNode.templateSpans) {
            const templateType = this.resolveTypeNode(templateSpan.type);
            const unfoldTemplateTypes: Type[] = [];
            if (templateType instanceof UnionType) {
                unfoldTemplateTypes.push(...templateType.getTypes());
            } else {
                unfoldTemplateTypes.push(templateType);
            }
            const unfoldTemplateTypeStrs: string[] = [];
            for (const unfoldTemplateType of unfoldTemplateTypes) {
                unfoldTemplateTypeStrs.push(unfoldTemplateType instanceof AliasType ? unfoldTemplateType.getOriginalType().toString() : unfoldTemplateType.toString());
            }

            const templateSpanString = templateSpan.literal.rawText || '';
            for (const stringLiteral of stringLiterals) {
                for (const unfoldTemplateTypeStr of unfoldTemplateTypeStrs) {
                    newStringLiterals.push(stringLiteral + unfoldTemplateTypeStr + templateSpanString);
                }
            }
            stringLiterals = newStringLiterals;
            newStringLiterals = [];
        }

        const templateTypes: Type[] = [];
        for (const stringLiteral of stringLiterals) {
            templateTypes.push(new LiteralType(stringLiteral));
        }
        if (templateTypes.length > 0) {
            return new UnionType(templateTypes);
        }
        return templateTypes[0];
    }

    private resolveTypeReferenceNode(typeReferenceNode: ts.TypeReferenceNode): Type {
        const typeReferenceFullName = typeReferenceNode.getText(this.sourceFile);
        const aliasType = this.aliasTypeMap.get(typeReferenceFullName);
        if (!aliasType) {
            const genericTypes: Type[] = [];
            if (typeReferenceNode.typeArguments) {
                for (const typeArgument of typeReferenceNode.typeArguments) {
                    genericTypes.push(this.resolveTypeNode(typeArgument));
                }
            }

            // TODO:handle ts.QualifiedName
            const typeNameNode = typeReferenceNode.typeName;
            const typeName = typeNameNode.getText(this.sourceFile);
            return new UnclearReferenceType(typeName, genericTypes);
        } else {
            return aliasType;
        }
    }

    private resolveTypeLiteralNode(typeLiteralNode: ts.TypeLiteralNode): Type {
        const anonymousClass = new ArkClass();
        const declaringClass = this.declaringMethod.getDeclaringArkClass();
        const declaringNamespace = declaringClass.getDeclaringArkNamespace();
        if (declaringNamespace) {
            buildNormalArkClassFromArkNamespace(typeLiteralNode, declaringNamespace, anonymousClass, this.sourceFile);
        } else {
            buildNormalArkClassFromArkFile(typeLiteralNode, declaringClass.getDeclaringArkFile(), anonymousClass, this.sourceFile);
        }
        return new ClassType(anonymousClass.getSignature());
    }

    private resolveFunctionTypeNode(functionTypeNode: ts.FunctionTypeNode): Type {
        const anonymousMethod = new ArkMethod();
        const declaringClass = this.declaringMethod.getDeclaringArkClass();
        buildArkMethodFromArkClass(functionTypeNode, declaringClass, anonymousMethod, this.sourceFile);
        return new FunctionType(anonymousMethod.getSignature());
    }

    private isLiteralNode(node: ts.Node): boolean {
        if (ts.isStringLiteral(node) ||
            ts.isNumericLiteral(node) ||
            ts.isBigIntLiteral(node) ||
            ts.isRegularExpressionLiteral(node) ||
            ts.isNoSubstitutionTemplateLiteral(node) ||
            node.kind === ts.SyntaxKind.NullKeyword ||
            node.kind === ts.SyntaxKind.TrueKeyword ||
            node.kind === ts.SyntaxKind.FalseKeyword ||
            node.kind === ts.SyntaxKind.UndefinedKeyword) {
            return true;
        }
        return false;
    }

    public mapStmtsToTsStmt(stmts: Stmt[], node: ts.Node): void {
        const originalStmt = new Stmt();
        originalStmt.setText(node.getText(this.sourceFile));
        const positionInfo = LineColPosition.buildFromNode(node, this.sourceFile);
        originalStmt.setOriginPositionInfo(positionInfo);
        originalStmt.setPositionInfo(positionInfo);

        for (const stmt of stmts) {
            if (stmt.getOriginPositionInfo().getLineNo() === -1) {
                stmt.setOriginPositionInfo(originalStmt.getOriginPositionInfo());
                this.stmtToOriginalStmt.set(stmt, originalStmt);
            }
        }
    }

    public static tokenToUnaryOperator(token: ts.SyntaxKind): UnaryOperator | null {
        switch (token) {
            case ts.SyntaxKind.MinusToken:
                return UnaryOperator.Neg;
            case ts.SyntaxKind.TildeToken:
                return UnaryOperator.BitwiseNot;
            case ts.SyntaxKind.ExclamationToken:
                return UnaryOperator.LogicalNot;
        }
        return null;
    }

    public static tokenToBinaryOperator(token: ts.SyntaxKind): BinaryOperator | null {
        switch (token) {
            case ts.SyntaxKind.QuestionQuestionToken:
                return NormalBinaryOperator.NullishCoalescing;
            case ts.SyntaxKind.AsteriskAsteriskToken:
                return NormalBinaryOperator.Exponentiation;
            case ts.SyntaxKind.SlashToken:
                return NormalBinaryOperator.Division;
            case ts.SyntaxKind.PlusToken:
                return NormalBinaryOperator.Addition;
            case ts.SyntaxKind.MinusToken:
                return NormalBinaryOperator.Subtraction;
            case ts.SyntaxKind.AsteriskToken:
                return NormalBinaryOperator.Multiplication;
            case ts.SyntaxKind.PercentToken:
                return NormalBinaryOperator.Remainder;
            case ts.SyntaxKind.LessThanLessThanToken:
                return NormalBinaryOperator.LeftShift;
            case ts.SyntaxKind.GreaterThanGreaterThanToken:
                return NormalBinaryOperator.RightShift;
            case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken:
                return NormalBinaryOperator.UnsignedRightShift;
            case ts.SyntaxKind.AmpersandToken:
                return NormalBinaryOperator.BitwiseAnd;
            case ts.SyntaxKind.BarToken:
                return NormalBinaryOperator.BitwiseOr;
            case ts.SyntaxKind.CaretToken:
                return NormalBinaryOperator.BitwiseXor;
            case ts.SyntaxKind.AmpersandAmpersandToken:
                return NormalBinaryOperator.LogicalAnd;
            case ts.SyntaxKind.BarBarToken:
                return NormalBinaryOperator.LogicalOr;
            case ts.SyntaxKind.LessThanToken:
                return RelationalBinaryOperator.LessThan;
            case ts.SyntaxKind.LessThanEqualsToken:
                return RelationalBinaryOperator.LessThanOrEqual;
            case ts.SyntaxKind.GreaterThanToken:
                return RelationalBinaryOperator.GreaterThan;
            case ts.SyntaxKind.GreaterThanEqualsToken:
                return RelationalBinaryOperator.GreaterThanOrEqual;
            case ts.SyntaxKind.EqualsEqualsToken:
                return RelationalBinaryOperator.Equality;
            case ts.SyntaxKind.ExclamationEqualsToken:
                return RelationalBinaryOperator.InEquality;
            case ts.SyntaxKind.EqualsEqualsEqualsToken:
                return RelationalBinaryOperator.StrictEquality;
            case ts.SyntaxKind.ExclamationEqualsEqualsToken:
                return RelationalBinaryOperator.StrictInequality;
        }
        return null;
    }
}