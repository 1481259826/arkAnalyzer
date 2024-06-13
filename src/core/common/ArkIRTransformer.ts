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
    AbstractInvokeExpr,
    ArkBinopExpr,
    ArkCastExpr,
    ArkConditionExpr,
    ArkDeleteExpr,
    ArkInstanceInvokeExpr,
    ArkLengthExpr,
    ArkNewArrayExpr,
    ArkNewExpr,
    ArkStaticInvokeExpr,
    ArkTypeOfExpr,
    ArkUnopExpr,
    ObjectLiteralExpr,
} from '../base/Expr';
import {
    AbstractFieldRef,
    ArkArrayRef,
    ArkCaughtExceptionRef,
    ArkInstanceFieldRef,
    ArkStaticFieldRef,
} from '../base/Ref';
import { Value } from '../base/Value';
import * as ts from 'ohos-typescript';
import { Local } from '../base/Local';
import { ArkAssignStmt, ArkGotoStmt, ArkIfStmt, ArkInvokeStmt, ArkThrowStmt, Stmt } from '../base/Stmt';
import {
    AnyType,
    ArrayObjectType,
    ArrayType,
    BooleanType,
    CallableType,
    ClassType,
    NeverType,
    NullType,
    NumberType,
    StringType,
    Type,
    UnclearReferenceType,
    UndefinedType,
    UnionType,
    UnknownType,
    VoidType,
} from '../base/Type';
import { Constant } from '../base/Constant';
import { ValueUtil } from './ValueUtil';
import { ClassSignature, FieldSignature, MethodSignature, MethodSubSignature } from '../model/ArkSignature';
import Logger from '../../utils/logger';
import { IRUtils } from './IRUtils';
import { ArkMethod } from '../model/ArkMethod';
import { buildArkMethodFromArkClass } from '../model/builder/ArkMethodBuilder';
import { buildNormalArkClassFromArkFile, buildNormalArkClassFromArkNamespace } from '../model/builder/ArkClassBuilder';
import { ArkClass } from '../model/ArkClass';
import { ArkSignatureBuilder } from '../model/builder/ArkSignatureBuilder';
import {
    COMPONENT_BRANCH_FUNCTION,
    COMPONENT_BUILD_FUNCTION,
    COMPONENT_CREATE_FUNCTION,
    COMPONENT_CUSTOMVIEW,
    COMPONENT_IF,
    COMPONENT_POP_FUNCTION,
    isEtsSystemComponent,
} from './EtsConst';
import { tsNode2Value } from '../model/builder/builderUtils';

const logger = Logger.getLogger();

type ValueAndStmts = {
    value: Value,
    stmts: Stmt[]
};

export class ArkIRTransformer {
    private readonly tempLocalPrefix = '$temp';
    private tempLocalIndex: number = 0;
    private locals: Map<string, Local> = new Map();
    private sourceFile: ts.SourceFile;
    private withinMethod: ArkMethod | null;

    private componentIfDepth = 0;

    constructor(sourceFile: ts.SourceFile, withinMethod?: ArkMethod) {
        this.sourceFile = sourceFile;
        this.withinMethod = withinMethod || null;
    }

    public getLocals(): Set<Local> {
        return new Set<Local>(this.locals.values());
    }

    public tsNodeToStmts(node: ts.Node): Stmt[] {
        const stmts: Stmt[] = [];
        if (ts.isExpressionStatement(node)) {
            return this.expressionStatementToStmts(node);
        } else if (ts.isBlock(node)) {
            return this.blockToStmts(node);
        } else if (ts.isSwitchStatement(node)) {
            return this.switchStatementToStmts(node);
        } else if (ts.isForStatement(node)) {
            return this.forStatementToStmts(node);
        } else if (ts.isForInStatement(node) || ts.isForOfStatement(node)) {
            return this.rangeForStatementToStmts(node);
        } else if (ts.isWhileStatement(node)) {
            return this.whileStatementToStmts(node);
        } else if (ts.isDoStatement(node)) {
            return this.doStatementToStmts(node);
        } else if (ts.isVariableStatement(node)) {
            return this.variableStatementToStmts(node);
        } else if (ts.isVariableDeclarationList(node)) {
            return this.variableDeclarationListToStmts(node);
        } else if (ts.isIfStatement(node)) {
            return this.ifStatementToStmts(node);
        } else if (ts.isBreakStatement(node) || ts.isContinueStatement(node)) {
            return this.gotoStatementToStmts(node);
        } else if (ts.isThrowStatement(node)) {
            return this.throwStatementToStmts(node);
        } else if (ts.isCatchClause(node)) {
            return this.catchClauseToStmts(node);
        }

        logger.warn(`unsupported statement node: ${ts.SyntaxKind[node.kind]}`);
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
        const {value: expr, stmts: stmts} = this.tsNodeToValueAndStmts(expressionStatement.expression);
        if (expr instanceof AbstractInvokeExpr) {
            stmts.push(new ArkInvokeStmt(expr));
        }
        return stmts;
    }

    private switchStatementToStmts(switchStatement: ts.SwitchStatement): Stmt[] {
        const stmts: Stmt[] = [];
        let {
            value: exprValue,
            stmts: exprStmts,
        } = this.tsNodeToValueAndStmts(switchStatement.expression);
        stmts.push(...exprStmts);
        if (IRUtils.moreThanOneAddress(exprValue)) {
            const {value: newExprValue, stmts: exprStmts} = this.generateAssignStmtForValue(exprValue);
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

    // 暂时只支持数组遍历
    private rangeForStatementToStmts(forOfStatement: ts.ForOfStatement | ts.ForInStatement): Stmt[] {
        const stmts: Stmt[] = [];
        const {
            value: itemValue,
            stmts: itemStmts,
        } = this.tsNodeToValueAndStmts(forOfStatement.initializer);
        stmts.push(...itemStmts);
        const {
            value: iterableValue,
            stmts: iterableStmts,
        } = this.tsNodeToValueAndStmts(forOfStatement.expression);
        stmts.push(...iterableStmts);
        const lengthLocal = this.generateTempLocal(NumberType.getInstance());
        stmts.push(new ArkAssignStmt(lengthLocal, new ArkLengthExpr(iterableValue)));
        const indexLocal = this.generateTempLocal(NumberType.getInstance());
        stmts.push(new ArkAssignStmt(indexLocal, ValueUtil.getOrCreateNumberConst(0)));

        const conditionExpr = new ArkConditionExpr(indexLocal, lengthLocal, '>=');
        stmts.push(new ArkIfStmt(conditionExpr));
        const currArrayRef = new ArkArrayRef(iterableValue as Local, indexLocal);
        stmts.push(new ArkAssignStmt(itemValue, currArrayRef));
        const incrExpr = new ArkBinopExpr(indexLocal, ValueUtil.getOrCreateNumberConst(1), '+');
        stmts.push(new ArkAssignStmt(indexLocal, incrExpr));
        return stmts;
    }

    private whileStatementToStmts(whileStatement: ts.WhileStatement): Stmt[] {
        const stmts: Stmt[] = [];
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
        let inComponent = false;
        if (this.withinMethod && this.withinMethod.getName() === COMPONENT_BUILD_FUNCTION) {
            inComponent = true;
        }

        const stmts: Stmt[] = [];
        const {
            value: conditionExpr,
            stmts: conditionStmts,
        } = this.conditionToValueAndStmts(ifStatement.expression);
        stmts.push(...conditionStmts);
        if (inComponent) {
            const createMethodSignature = ArkSignatureBuilder.buildMethodSignatureFromClassNameAndMethodName(COMPONENT_IF, COMPONENT_CREATE_FUNCTION);
            const createInvokeExpr = new ArkStaticInvokeExpr(createMethodSignature, [conditionExpr]);
            const {value: createValue, stmts: createStmts} = this.generateAssignStmtForValue(createInvokeExpr);
            stmts.push(...createStmts);
        }
        if (inComponent) {
            const divideMethodSignature = ArkSignatureBuilder.buildMethodSignatureFromClassNameAndMethodName(COMPONENT_IF, COMPONENT_BRANCH_FUNCTION);
            const divideInvokeExpr = new ArkStaticInvokeExpr(divideMethodSignature, [ValueUtil.getOrCreateNumberConst(0)]);
            this.componentIfDepth++;
            stmts.push(new ArkInvokeStmt(divideInvokeExpr));
        }
        if (inComponent && ifStatement.thenStatement) {
            stmts.push(...this.tsNodeToStmts(ifStatement.thenStatement));
        }
        if (inComponent && ifStatement.elseStatement) {
            const divideMethodSignature = ArkSignatureBuilder.buildMethodSignatureFromClassNameAndMethodName(COMPONENT_IF, COMPONENT_BRANCH_FUNCTION);
            const divideInvokeExpr = new ArkStaticInvokeExpr(divideMethodSignature, [ValueUtil.getOrCreateNumberConst(1)]);
            this.componentIfDepth++;
            stmts.push(new ArkInvokeStmt(divideInvokeExpr));

            stmts.push(...this.tsNodeToStmts(ifStatement.elseStatement));
        }

        if (inComponent) {
            const popMethodSignature = ArkSignatureBuilder.buildMethodSignatureFromClassNameAndMethodName(COMPONENT_IF, COMPONENT_POP_FUNCTION);
            const popInvokeExpr = new ArkStaticInvokeExpr(popMethodSignature, []);
            stmts.push(new ArkInvokeStmt(popInvokeExpr));
        }
        return stmts;
    }

    private gotoStatementToStmts(gotoStatement: ts.BreakStatement | ts.ContinueStatement): Stmt[] {
        return [new ArkGotoStmt()];
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
            return this.ObjectLiteralExpresionToValueAndStmts(node);
        }
        // TODO: handle ts.ObjectLiteralExpression, ts.SpreadElement, ts.ObjectBindingPattern, ts.ArrayBindingPattern

        logger.warn(`unsupported expression node: ${ts.SyntaxKind[node.kind]}`);
        return {value: new Local(node.getText(this.sourceFile)), stmts: []};
    }

    private ObjectLiteralExpresionToValueAndStmts(node: ts.ObjectLiteralExpression): ValueAndStmts{
        if (!this.withinMethod) {
            logger.error(`withMethod is null`);
            return {value: ValueUtil.getNullConstant(), stmts: []};
        }
        
        return {value: tsNode2Value(node, this.sourceFile, this.withinMethod.getDeclaringArkClass()), stmts: []};
    }

    private createCustomViewStmt(componentName: string, args: Value[], body: ts.Block | undefined = undefined): ValueAndStmts {
        const stmts: Stmt[] = [];

        const classSignature = new ClassSignature();
        classSignature.setClassName(componentName);
        const classType = new ClassType(classSignature);
        const newExpr = new ArkNewExpr(classType);
        const {value: newExprValue, stmts: newExprStmts} = this.generateAssignStmtForValue(newExpr);
        stmts.push(...newExprStmts);

        const methodSubSignature = new MethodSubSignature();
        methodSubSignature.setMethodName('constructor');
        const methodSignature = new MethodSignature();
        methodSignature.setDeclaringClassSignature(classSignature);
        methodSignature.setMethodSubSignature(methodSubSignature);
        stmts.push(new ArkInvokeStmt(new ArkInstanceInvokeExpr(newExprValue as Local, methodSignature, args)));

        let createViewArgs = [newExprValue];
        if (body) {
            const anonymous = ts.factory.createArrowFunction([], [], [], undefined, undefined, body);
            // @ts-ignore
            anonymous.pos = body.pos;
            // @ts-ignore
            anonymous.end = body.end;

            const {value: builderMethod, stmts: _} = this.callableNodeToValueAndStmts(anonymous);
            createViewArgs.push(builderMethod);
        }
        const createMethodSignature = ArkSignatureBuilder.buildMethodSignatureFromClassNameAndMethodName(COMPONENT_CUSTOMVIEW, COMPONENT_CREATE_FUNCTION);
        let createInvokeExpr = new ArkStaticInvokeExpr(createMethodSignature, createViewArgs);
        const {value: componentValue, stmts: componentStmts} = this.generateAssignStmtForValue(createInvokeExpr);
        stmts.push(...componentStmts);

        const popMethodSignature = ArkSignatureBuilder.buildMethodSignatureFromClassNameAndMethodName(COMPONENT_CUSTOMVIEW, COMPONENT_POP_FUNCTION);
        const popInvokeExpr = new ArkStaticInvokeExpr(popMethodSignature, []);
        stmts.push(new ArkInvokeStmt(popInvokeExpr));
        return {value: componentValue, stmts: stmts};
    }

    private etsComponentExpressionToValueAndStmts(etsComponentExpression: ts.EtsComponentExpression): ValueAndStmts {
        const stmts: Stmt[] = [];
        const componentName = (etsComponentExpression.expression as ts.Identifier).text;
        const args: Value[] = [];
        for (const argument of etsComponentExpression.arguments) {
            let {value: argValue, stmts: arguStmts} = this.tsNodeToValueAndStmts(argument);
            stmts.push(...arguStmts);
            if (IRUtils.moreThanOneAddress(argValue)) {
                ({value: argValue, stmts: arguStmts} = this.generateAssignStmtForValue(argValue));
                stmts.push(...arguStmts);
            }
            args.push(argValue);
        }

        if (isEtsSystemComponent(componentName)) {
            const createMethodSignature = ArkSignatureBuilder.buildMethodSignatureFromClassNameAndMethodName(componentName, COMPONENT_CREATE_FUNCTION);
            const createInvokeExpr = new ArkStaticInvokeExpr(createMethodSignature, args);
            const {value: componentValue, stmts: componentStmts} = this.generateAssignStmtForValue(createInvokeExpr);
            stmts.push(...componentStmts);

            if (etsComponentExpression.body) {
                for (const statement of etsComponentExpression.body.statements) {
                    stmts.push(...this.tsNodeToStmts(statement));
                }
            }

            const popMethodSignature = ArkSignatureBuilder.buildMethodSignatureFromClassNameAndMethodName(componentName, COMPONENT_POP_FUNCTION);
            const popInvokeExpr = new ArkStaticInvokeExpr(popMethodSignature, []);
            stmts.push(new ArkInvokeStmt(popInvokeExpr));
            return {value: componentValue, stmts: stmts};
        }

        return this.createCustomViewStmt(componentName, args, etsComponentExpression.body);
    }

    private classExpressionToValueAndStmts(classExpression: ts.ClassExpression): ValueAndStmts {
        if (!this.withinMethod) {
            logger.error(`withMethod is null`);
            return {value: ValueUtil.getNullConstant(), stmts: []};
        }
        const declaringArkClass = this.withinMethod.getDeclaringArkClass();
        const declaringArkNamespace = declaringArkClass.getDeclaringArkNamespace();
        const newClass = new ArkClass();
        if (declaringArkNamespace) {
            buildNormalArkClassFromArkNamespace(classExpression, declaringArkNamespace, newClass, this.sourceFile);
            declaringArkNamespace.addArkClass(newClass);
        } else {
            const declaringArkFile = declaringArkClass.getDeclaringArkFile();
            buildNormalArkClassFromArkFile(classExpression, declaringArkFile, newClass, this.sourceFile);
            declaringArkFile.addArkClass(newClass);
        }
        const classValue = this.getOrCreatLocal(newClass.getName(), new ClassType(newClass.getSignature()));
        return {value: classValue, stmts: []};
    }

    private templateExpressionToValueAndStmts(templateExpression: ts.TemplateExpression): ValueAndStmts {
        const stmts: Stmt[] = [];
        const head = templateExpression.head;
        const values: Value[] = [ValueUtil.createStringConst(head.rawText ? head.rawText : '')];
        for (const templateSpan of templateExpression.templateSpans) {
            const {value: exprValue, stmts: exprStmts} = this.tsNodeToValueAndStmts(templateSpan.expression);
            stmts.push(...stmts);
            const literalRawText = templateSpan.literal.rawText;
            const literalStr = literalRawText ? literalRawText : '';
            values.push(exprValue);
            values.push(ValueUtil.createStringConst(literalStr));
        }
        let {
            value: combinationValue,
            stmts: combinatioStmts,
        } = this.generateAssignStmtForValue(new ArkBinopExpr(values[0], values[1], '+'));
        stmts.push(...combinatioStmts);
        for (let i = 2; i < values.length; i++) { // next iteration start from index 2
            ({
                value: combinationValue,
                stmts: combinatioStmts,
            } = this.generateAssignStmtForValue(new ArkBinopExpr(combinationValue, values[i], '+')));
            stmts.push(...combinatioStmts);
        }
        return {value: combinationValue, stmts: stmts};
    }

    private identifierToValueAndStmts(identifier: ts.Identifier): ValueAndStmts {
        // TODO: handle global variable
        const local = this.getOrCreatLocal(identifier.text);
        return {value: local, stmts: []};
    }

    private propertyAccessExpressionToValue(propertyAccessExpression: ts.PropertyAccessExpression): ValueAndStmts {
        const stmts: Stmt[] = [];
        let {
            value: baseValue,
            stmts: baseStmts,
        } = this.tsNodeToValueAndStmts(propertyAccessExpression.expression);
        stmts.push(...baseStmts);
        if (IRUtils.moreThanOneAddress(baseValue)) {
            ({value: baseValue, stmts: baseStmts} = this.generateAssignStmtForValue(baseValue));
            stmts.push(...baseStmts);
        }
        const fieldSignature = new FieldSignature();
        fieldSignature.setFieldName(propertyAccessExpression.name.getText(this.sourceFile));
        const fieldRef = new ArkInstanceFieldRef(baseValue as Local, fieldSignature);
        return {value: fieldRef, stmts: stmts};
    }

    private elementAccessExpressionToValueAndStmts(elementAccessExpression: ts.ElementAccessExpression): ValueAndStmts {
        const stmts: Stmt[] = [];
        let {value: baseValue, stmts: baseStmts} = this.tsNodeToValueAndStmts(elementAccessExpression.expression);
        stmts.push(...baseStmts);
        if (!(baseValue instanceof Local)) {
            ({value: baseValue, stmts: baseStmts} = this.generateAssignStmtForValue(baseValue));
            stmts.push(...baseStmts);
        }
        let {
            value: argumentValue,
            stmts: argumentStmts,
        } = this.tsNodeToValueAndStmts(elementAccessExpression.argumentExpression);
        stmts.push(...argumentStmts);
        if (IRUtils.moreThanOneAddress(argumentValue)) {
            ({value: argumentValue, stmts: argumentStmts} = this.generateAssignStmtForValue(argumentValue));
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
        return {value: elementAccessExpr, stmts: stmts};
    }

    private callExpressionToValueAndStmts(callExpression: ts.CallExpression): ValueAndStmts {
        const stmts: Stmt[] = [];
        const args: Value[] = [];
        for (const argument of callExpression.arguments) {
            let {value: argValue, stmts: arguStmts} = this.tsNodeToValueAndStmts(argument);
            stmts.push(...arguStmts);
            if (IRUtils.moreThanOneAddress(argValue)) {
                ({value: argValue, stmts: arguStmts} = this.generateAssignStmtForValue(argValue));
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
        let invokeExpr: AbstractInvokeExpr;
        if (callerValue instanceof ArkInstanceFieldRef) {
            methodSignature.getMethodSubSignature().setMethodName(callerValue.getFieldName());
            invokeExpr = new ArkInstanceInvokeExpr(callerValue.getBase(), methodSignature, args);
        } else if (callerValue instanceof ArkStaticFieldRef) {
            methodSignature.getMethodSubSignature().setMethodName(callerValue.getFieldName());
            invokeExpr = new ArkStaticInvokeExpr(methodSignature, args);
        } else if (callerValue instanceof Local) {
            const callerName = callerValue.getName();
            // temp for component
            if (this.withinMethod?.getDeclaringArkFile().getScene().isCustomComponents(callerName)) {
                return this.createCustomViewStmt(callerName, args);
            } else {
                methodSignature.getMethodSubSignature().setMethodName(callerName);
                invokeExpr = new ArkStaticInvokeExpr(methodSignature, args);
            }
        } else {
            ({value: callerValue, stmts: callerStmts} = this.generateAssignStmtForValue(callerValue));
            stmts.push(...callerStmts);
            methodSignature.getMethodSubSignature().setMethodName((callerValue as Local).getName());
            invokeExpr = new ArkStaticInvokeExpr(methodSignature, args);
        }
        return {value: invokeExpr, stmts: stmts};
    }

    private callableNodeToValueAndStmts(callableNode: ts.ArrowFunction | ts.FunctionExpression): ValueAndStmts {
        if (!this.withinMethod) {
            logger.error(`withMethod is null`);
            return {value: ValueUtil.getNullConstant(), stmts: []};
        }
        const declaringClass = this.withinMethod.getDeclaringArkClass();
        const arrowArkMethod = new ArkMethod();
        buildArkMethodFromArkClass(callableNode, declaringClass, arrowArkMethod, this.sourceFile);
        declaringClass.addMethod(arrowArkMethod);

        const callableType = new CallableType(arrowArkMethod.getSignature());
        const callableValue = this.getOrCreatLocal(arrowArkMethod.getName(), callableType);
        return {value: callableValue, stmts: []};
    }

    private newExpressionToValueAndStmts(newExpression: ts.NewExpression): ValueAndStmts {
        // TODO: get class signature first
        // TODO: deal with generics
        const stmts: Stmt[] = [];
        const className = newExpression.expression.getText(this.sourceFile);
        if (className === 'Array') {
            let baseType: Type = AnyType.getInstance();
            if (newExpression.typeArguments) {
                baseType = this.resolveTypeNode(newExpression.typeArguments[0]);
            }

            let arrayLength = 0;
            const argumentValues: Value[] = [];
            if (newExpression.arguments) {
                arrayLength = newExpression.arguments.length;
                for (const argument of newExpression.arguments) {
                    const {
                        value: argumentValue,
                        stmts: argumentStmts,
                    } = this.tsNodeToValueAndStmts((argument));
                    argumentValues.push(argumentValue);
                    stmts.push(...argumentStmts);
                }
                if ((baseType instanceof AnyType || baseType instanceof UnknownType) && (arrayLength > 1 ||
                    !(argumentValues[0].getType() instanceof NumberType))) {
                    baseType = argumentValues[0].getType();
                }
            }
            let arrayLengthValue: Value = ValueUtil.getOrCreateNumberConst(arrayLength);
            if (arrayLength === 1 && argumentValues[0].getType() instanceof NumberType) {
                arrayLengthValue = argumentValues[0];
            }

            const {
                value: arrayExprValue,
                stmts: arrayStmts,
            } = this.generateAssignStmtForValue(new ArkNewArrayExpr(baseType, arrayLengthValue));
            stmts.push(...arrayStmts);
            (arrayExprValue as Local).setType(new ArrayObjectType(baseType, 1));
            return {value: arrayExprValue, stmts: stmts};
        } else {
            const classSignature = new ClassSignature();
            classSignature.setClassName(className);
            const classType = new ClassType(classSignature);
            const newExpr = new ArkNewExpr(classType);
            const {value: newExprValue, stmts: newExprStmts} = this.generateAssignStmtForValue(newExpr);
            stmts.push(...newExprStmts);

            const methodSubSignature = new MethodSubSignature();
            methodSubSignature.setMethodName('constructor');
            const methodSignature = new MethodSignature();
            methodSignature.setDeclaringClassSignature(classSignature);
            methodSignature.setMethodSubSignature(methodSubSignature);

            const argValues: Value[] = [];
            if (newExpression.arguments) {
                for (const argument of newExpression.arguments) {
                    const {value: argValue, stmts: argStmts} = this.tsNodeToValueAndStmts(argument);
                    stmts.push(...argStmts);
                    argValues.push(argValue);
                }
            }
            stmts.push(new ArkInvokeStmt(new ArkInstanceInvokeExpr(newExprValue as Local, methodSignature, argValues)));
            return {value: newExprValue, stmts: stmts};
        }
    }

    private arrayLiteralExpressionToValueAndStmts(arrayLiteralExpression: ts.ArrayLiteralExpression): ValueAndStmts {
        const stmts: Stmt[] = [];
        const elementTypes: Set<Type> = new Set();
        for (const element of arrayLiteralExpression.elements) {
            let {value: elementValue, stmts: elementStmts} = this.tsNodeToValueAndStmts(element);
            stmts.push(...elementStmts);
            if (IRUtils.moreThanOneAddress(elementValue)) {
                ({value: elementValue, stmts: elementStmts} = this.generateAssignStmtForValue(elementValue));
                stmts.push(...elementStmts);
            }
            elementTypes.add(elementValue.getType());
        }

        let baseType = UnknownType.getInstance();
        if (elementTypes.size == 1) {
            baseType = elementTypes.keys().next().value;
        } else if (elementTypes.size > 1) {
            baseType = new UnionType(Array.from(elementTypes));
        }
        const newArrayExpr = new ArkNewArrayExpr(baseType, ValueUtil.getOrCreateNumberConst(elementTypes.size));
        const {value: newArrayValue, stmts: elementStmts} = this.generateAssignStmtForValue(newArrayExpr);
        stmts.push(...elementStmts);
        return {value: newArrayValue, stmts: stmts};
    }

    private prefixUnaryExpressionToValueAndStmts(prefixUnaryExpression: ts.PrefixUnaryExpression): ValueAndStmts {
        const {
            value: operandValue,
            stmts: stmts,
        } = this.tsNodeToValueAndStmts(prefixUnaryExpression.operand);
        const operator = prefixUnaryExpression.operator;
        const operatorStr = ts.tokenToString(operator) as string;
        if (operator == ts.SyntaxKind.PlusPlusToken || operator == ts.SyntaxKind.MinusMinusToken) {
            const binopExpr = new ArkBinopExpr(operandValue, ValueUtil.getOrCreateNumberConst(1), operatorStr[0]);
            stmts.push(new ArkAssignStmt(operandValue, binopExpr));
            return {value: operandValue, stmts: stmts};
        } else {
            const unopExpr = new ArkUnopExpr(operandValue, operatorStr);
            return {value: unopExpr, stmts: stmts};
        }
    }

    private postfixUnaryExpressionToValueAndStmts(postfixUnaryExpression: ts.PostfixUnaryExpression): ValueAndStmts {
        const {
            value: operandValue,
            stmts: stmts,
        } = this.tsNodeToValueAndStmts(postfixUnaryExpression.operand);
        const operator = postfixUnaryExpression.operator;
        const operatorStr = ts.tokenToString(operator) as string;
        const binopExpr = new ArkBinopExpr(operandValue, ValueUtil.getOrCreateNumberConst(1), operatorStr[0]);
        stmts.push(new ArkAssignStmt(operandValue, binopExpr));
        return {value: binopExpr, stmts: stmts};
    }

    private awaitExpressionToValueAndStmts(awaitExpression: ts.AwaitExpression): ValueAndStmts {
        return this.tsNodeToValueAndStmts(awaitExpression.expression);
    }

    private deleteExpressionToValueAndStmts(deleteExpression: ts.DeleteExpression): ValueAndStmts {
        // TODO: reserve ArkDeleteStmt or not
        const {value: exprValue, stmts: stmts} = this.tsNodeToValueAndStmts(deleteExpression.expression);
        const deleteExpr = new ArkDeleteExpr(exprValue as AbstractFieldRef);
        return {value: deleteExpr, stmts: stmts};
    }

    private voidExpressionToValueAndStmts(voidExpression: ts.VoidExpression): ValueAndStmts {
        const {value: _, stmts: stmts} = this.tsNodeToValueAndStmts(voidExpression.expression);
        return {value: ValueUtil.getUndefinedConst(), stmts: stmts};
    }

    private nonNullExpressionToValueAndStmts(nonNullExpression: ts.NonNullExpression): ValueAndStmts {
        return this.tsNodeToValueAndStmts(nonNullExpression.expression);
    }

    private parenthesizedExpressionToValueAndStmts(parenthesizedExpression: ts.ParenthesizedExpression): ValueAndStmts {
        return this.tsNodeToValueAndStmts(parenthesizedExpression.expression);
    }

    private typeOfExpressionToValueAndStmts(typeOfExpression: ts.TypeOfExpression): ValueAndStmts {
        const {value: exprValue, stmts: exprStmts} = this.tsNodeToValueAndStmts(typeOfExpression.expression);
        const typeOfExpr = new ArkTypeOfExpr(exprValue);
        return {value: typeOfExpr, stmts: exprStmts};
    }

    private asExpressionToValueAndStmts(asExpression: ts.AsExpression): ValueAndStmts {
        const {value: exprValue, stmts: exprStmts} = this.tsNodeToValueAndStmts(asExpression.expression);
        const castExpr = new ArkCastExpr(exprValue, this.resolveTypeNode(asExpression.type));
        return {value: castExpr, stmts: exprStmts};
    }

    private typeAssertionToValueAndStmts(typeAssertion: ts.TypeAssertion): ValueAndStmts {
        const {value: exprValue, stmts: exprStmts} = this.tsNodeToValueAndStmts(typeAssertion.expression);
        const castExpr = new ArkCastExpr(exprValue, this.resolveTypeNode(typeAssertion.type));
        return {value: castExpr, stmts: exprStmts};
    }

    private variableDeclarationListToValueAndStmts(variableDeclarationList: ts.VariableDeclarationList): ValueAndStmts {
        const stmts: Stmt[] = [];
        let declaredValue!: Value;
        for (const declaration of variableDeclarationList.declarations) {
            const {
                value: newDeclaredValue,
                stmts: declaredStmts,
            } = this.variableDeclarationToValueAndStmts(declaration);
            stmts.push(...declaredStmts);
            declaredValue = newDeclaredValue;
        }
        return {value: declaredValue, stmts: stmts};
    }

    private variableDeclarationToValueAndStmts(variableDeclaration: ts.VariableDeclaration): ValueAndStmts {
        const leftOpNode = variableDeclaration.name;
        let rightOpNode: ts.Node | null = null;
        if (variableDeclaration.initializer) {
            rightOpNode = variableDeclaration.initializer;
        }

        const stmts: Stmt[] = [];
        let {value: leftValue, stmts: leftStmts} = this.tsNodeToValueAndStmts(leftOpNode);
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
            const {value: tempRightValue, stmts: rightStmts} = this.generateAssignStmtForValue(rightValue);
            stmts.push(...rightStmts);
            rightValue = tempRightValue;
        }

        if (leftValue instanceof Local) {
            if (variableDeclaration.type) {
                leftValue.setType(this.resolveTypeNode(variableDeclaration.type));
            }
            if (leftValue.getType() instanceof UnknownType && !(rightValue.getType() instanceof UnknownType)) {
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
        return {value: leftValue, stmts: stmts};
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

        const operator = binaryExpression.operatorToken;
        if (operator.kind === ts.SyntaxKind.FirstAssignment) {
            return this.assignmentToValueAndStmts(binaryExpression);
        } else if (compoundAssignmentOperators.has(operator.kind)) {
            return this.compoundAssignmentToValueAndStmts(binaryExpression);
        }

        const stmts: Stmt[] = [];
        let {
            value: opValue1,
            stmts: opStmts1,
        } = this.tsNodeToValueAndStmts(binaryExpression.left);
        stmts.push(...opStmts1);
        if (IRUtils.moreThanOneAddress(opValue1)) {
            ({value: opValue1, stmts: opStmts1} = this.generateAssignStmtForValue(opValue1));
            stmts.push(...opStmts1);
        }
        let {
            value: opValue2,
            stmts: opStmts2,
        } = this.tsNodeToValueAndStmts(binaryExpression.right);
        stmts.push(...opStmts2);
        if (IRUtils.moreThanOneAddress(opValue2)) {
            ({value: opValue2, stmts: opStmts2} = this.generateAssignStmtForValue(opValue2));
            stmts.push(...opStmts2);
        }
        const binopExpr = new ArkBinopExpr(opValue1, opValue2, binaryExpression.operatorToken.getText(this.sourceFile));
        return {value: binopExpr, stmts: stmts};
    }

    private assignmentToValueAndStmts(binaryExpression: ts.BinaryExpression): ValueAndStmts {
        const leftOpNode = binaryExpression.left;
        const rightOpNode = binaryExpression.right;
        const stmts: Stmt[] = [];
        let {value: leftValue, stmts: leftStmts} = this.tsNodeToValueAndStmts(leftOpNode);
        stmts.push(...leftStmts);
        let {value: rightValue, stmts: rightStmts} = this.tsNodeToValueAndStmts(rightOpNode);
        stmts.push(...rightStmts);
        if (IRUtils.moreThanOneAddress(leftValue) && IRUtils.moreThanOneAddress(rightValue)) {
            const {value: tempRightValue, stmts: rightStmts} = this.generateAssignStmtForValue(rightValue);
            stmts.push(...rightStmts);
            rightValue = tempRightValue;
        }
        if (leftValue instanceof Local && leftValue.getType() instanceof UnknownType
            && !(rightValue.getType() instanceof UnknownType)) {
            leftValue.setType(rightValue.getType());
        }

        stmts.push(new ArkAssignStmt(leftValue, rightValue));
        return {value: leftValue, stmts: stmts};
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
            const {value: newRightValue, stmts: rightStmts} = this.generateAssignStmtForValue(rightValue);
            rightValue = newRightValue;
            stmts.push(...rightStmts);
        }
        let operatorStr = binaryExpression.operatorToken.getText(this.sourceFile);
        operatorStr = operatorStr.substring(0, operatorStr.length - 1);
        stmts.push(new ArkAssignStmt(leftValue, new ArkBinopExpr(leftValue, rightValue, operatorStr)));
        return {value: leftValue, stmts: stmts};
    }

    private conditionToValueAndStmts(condition: ts.Expression): ValueAndStmts {
        const stmts: Stmt[] = [];
        let {
            value: conditionValue,
            stmts: conditionStmts,
        } = this.tsNodeToValueAndStmts(condition);
        stmts.push(...conditionStmts);
        let conditionExpr: ArkConditionExpr;
        if ((conditionValue instanceof ArkBinopExpr) && this.isRelationalOperator(conditionValue.getOperator())) {
            conditionExpr = new ArkConditionExpr(conditionValue.getOp1(), conditionValue.getOp2(), this.flipOperator(conditionValue.getOperator()));
        } else {
            if (IRUtils.moreThanOneAddress(conditionValue)) {
                ({
                    value: conditionValue,
                    stmts: conditionStmts,
                } = this.generateAssignStmtForValue(conditionValue));
                stmts.push(...conditionStmts);
            }
            conditionExpr = new ArkConditionExpr(conditionValue, new Constant('0', NumberType.getInstance()), '==');
        }
        return {value: conditionExpr, stmts: stmts};
    }

    private literalNodeToValueAndStmts(literalNode: ts.Node): ValueAndStmts | null {
        const syntaxKind = literalNode.kind;
        let constant: Constant | null = null;
        switch (syntaxKind) {
            case ts.SyntaxKind.NumericLiteral:
                constant = ValueUtil.getOrCreateNumberConst(parseInt((literalNode as ts.NumericLiteral).text));
                break;
            case ts.SyntaxKind.BigIntLiteral:
                constant = ValueUtil.getOrCreateNumberConst(parseInt((literalNode as ts.BigIntLiteral).text));
                break;
            case ts.SyntaxKind.StringLiteral:
                constant = ValueUtil.createStringConst((literalNode as ts.StringLiteral).text);
                break;
            case ts.SyntaxKind.RegularExpressionLiteral:
                constant = ValueUtil.createStringConst((literalNode as ts.RegularExpressionLiteral).text);
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
        return {value: constant, stmts: []};
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
        return {value: leftOp, stmts: [new ArkAssignStmt(leftOp, value)]};
    }

    private isRelationalOperator(operator: string): boolean {
        return operator == '<' || operator == '<=' || operator == '>' || operator == '>=' ||
            operator == '==' || operator == '===' || operator == '!=' || operator == '!==';
    }

    private flipOperator(operator: string): string {
        let newOperater = '';
        switch (operator) {
            case '<':
                newOperater = '>=';
                break;
            case '<=':
                newOperater = '>';
                break;
            case '>':
                newOperater = '<=';
                break;
            case '>=':
                newOperater = '<';
                break;
            case '==':
                newOperater = '!=';
                break;
            case '===':
                newOperater = '!==';
                break;
            case '!=':
                newOperater = '==';
                break;
            case '!==':
                newOperater = '===';
                break;
            default:
                logger.warn(`unsupported operator ${operator} to flip`);
        }
        return newOperater;
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
            case ts.SyntaxKind.NullKeyword:
                return NullType.getInstance();
            case ts.SyntaxKind.AnyKeyword:
                return AnyType.getInstance();
            case ts.SyntaxKind.VoidKeyword:
                return VoidType.getInstance();
            case ts.SyntaxKind.NeverKeyword:
                return NeverType.getInstance();
            case ts.SyntaxKind.TypeReference:
                return new UnclearReferenceType(type.getText(this.sourceFile));
        }
        return UnknownType.getInstance();
    }

    private getTypeOfLiteralNode(literalNode: ts.Node): Type {
        const syntaxKind = literalNode.kind;
        let type: Type;
        switch (syntaxKind) {
            case ts.SyntaxKind.NumericLiteral:
                type = NumberType.getInstance();
                break;
            case ts.SyntaxKind.BigIntLiteral:
                type = NumberType.getInstance();
                break;
            case ts.SyntaxKind.StringLiteral:
                type = StringType.getInstance();
                break;
            case ts.SyntaxKind.RegularExpressionLiteral:
                type = StringType.getInstance();
                break;
            case ts.SyntaxKind.NullKeyword:
                type = NullType.getInstance();
                break;
            case ts.SyntaxKind.UndefinedKeyword:
                type = UndefinedType.getInstance();
                break;
            case ts.SyntaxKind.TrueKeyword:
                type = BooleanType.getInstance();
                break;
            case ts.SyntaxKind.FalseKeyword:
                type = BooleanType.getInstance();
                break;
            default:
                logger.warn(`ast node's syntaxKind is ${ts.SyntaxKind[literalNode.kind]}, not literalNode`);
                type = UnknownType.getInstance();
        }
        return type;
    }

    private isLiteralNode(node: ts.Node): boolean {
        if (ts.isStringLiteral(node) ||
            ts.isNumericLiteral(node) ||
            ts.isBigIntLiteral(node) ||
            ts.isRegularExpressionLiteral(node) ||
            node.kind === ts.SyntaxKind.NullKeyword ||
            node.kind === ts.SyntaxKind.TrueKeyword ||
            node.kind === ts.SyntaxKind.FalseKeyword) {
            return true;
        }
        return false;
    }

}