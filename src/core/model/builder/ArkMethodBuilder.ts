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

import { ClassType, Type } from '../../base/Type';
import { BodyBuilder } from '../../common/BodyBuilder';
import { buildViewTree } from '../../graph/builder/ViewTreeBuilder';
import { ArkClass } from '../ArkClass';
import { Decorator } from '../../base/Decorator';
import { ArkMethod } from '../ArkMethod';
import ts from 'ohos-typescript';
import {
    buildModifiers,
    buildParameters,
    buildReturnType,
    buildTypeParameters,
    handlePropertyAccessExpression,
} from './builderUtils';
import Logger from '../../../utils/logger';
import { ArkAssignStmt, ArkReturnVoidStmt, Stmt } from '../../base/Stmt';
import { ArkInstanceFieldRef, ArkThisRef } from '../../base/Ref';
import { ArkBody } from '../ArkBody';
import { BasicBlock } from '../../graph/BasicBlock';
import { Local } from '../../base/Local';
import { Cfg } from '../../graph/Cfg';

const logger = Logger.getLogger();

export const arkMethodNodeKind = ['MethodDeclaration', 'Constructor', 'FunctionDeclaration', 'GetAccessor',
    'SetAccessor', 'ArrowFunction', 'FunctionExpression', 'MethodSignature', 'ConstructSignature', 'CallSignature'];

export type MethodLikeNode =
    ts.FunctionDeclaration |
    ts.MethodDeclaration |
    ts.ConstructorDeclaration |
    ts.ArrowFunction |
    ts.AccessorDeclaration |
    ts.FunctionExpression |
    ts.MethodSignature |
    ts.ConstructSignatureDeclaration |
    ts.CallSignatureDeclaration |
    ts.FunctionTypeNode;

export function buildDefaultArkMethodFromArkClass(declaringClass: ArkClass, mtd: ArkMethod,
                                                  sourceFile: ts.SourceFile, node?: ts.ModuleDeclaration) {
    mtd.setDeclaringArkClass(declaringClass);
    mtd.setDeclaringArkFile();
    mtd.setName('_DEFAULT_ARK_METHOD');
    mtd.genSignature();

    const defaultMethodNode = node ? node : sourceFile;

    let bodyBuilder = new BodyBuilder(mtd.getSignature(), defaultMethodNode, mtd, sourceFile);
    mtd.setBodyBuilder(bodyBuilder);
}

export function buildArkMethodFromArkClass(methodNode: MethodLikeNode, declaringClass: ArkClass, mtd: ArkMethod, sourceFile: ts.SourceFile, declaringMethod?: ArkMethod) {

    mtd.setDeclaringArkClass(declaringClass);
    mtd.setDeclaringArkFile();

    mtd.setCode(methodNode.getText(sourceFile));
    const {line, character} = ts.getLineAndCharacterOfPosition(
        sourceFile,
        methodNode.getStart(sourceFile),
    );
    mtd.setLine(line + 1);
    mtd.setColumn(character + 1);

    const methodName = buildMethodName(methodNode, declaringClass, sourceFile, declaringMethod);
    mtd.setName(methodName);

    buildParameters(methodNode.parameters, mtd, sourceFile).forEach((parameter) => {
        mtd.addParameter(parameter);
    });

    buildModifiers(methodNode, sourceFile).forEach((value) => {
        mtd.addModifier(value);
    });

    if (methodNode.type) {
        mtd.setReturnType(buildReturnType(methodNode.type, sourceFile, mtd));
    }

    if (methodNode.typeParameters) {
        buildTypeParameters(methodNode.typeParameters, sourceFile, mtd).forEach((typeParameter) => {
            mtd.addTypeParameter(typeParameter);
        });
    }

    mtd.genSignature();

    let bodyBuilder = new BodyBuilder(mtd.getSignature(), methodNode, mtd, sourceFile);
    mtd.setBodyBuilder(bodyBuilder);

    if (mtd.hasBuilderDecorator()) {
        mtd.setViewTree(buildViewTree(mtd));
    } else if (declaringClass.hasComponentDecorator() &&
        mtd.getSubSignature().toString() == 'build()' &&
        !mtd.containsModifier('StaticKeyword')) {
        declaringClass.setViewTree(buildViewTree(mtd));
    }

    declaringClass.addMethod(mtd);
}

function buildMethodName(node: MethodLikeNode, declaringClass: ArkClass, sourceFile: ts.SourceFile, declaringMethod?: ArkMethod): string {
    let name: string = '';
    let getAccessorName: string | undefined = undefined;
    if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)) {
        if (node.name) {
            name = node.name.text;
        } else {
            name = buildAnonymousMethodName(node, declaringClass, declaringMethod);
        }
    } else if (ts.isFunctionTypeNode(node)) {
        if (node.name) {
            //TODO: check name type
            name = node.name.getText(sourceFile);
        } else {
            name = buildAnonymousMethodName(node, declaringClass, declaringMethod);
        }
    } else if (ts.isMethodDeclaration(node) || ts.isMethodSignature(node)) {
        if (ts.isIdentifier(node.name)) {
            name = (node.name as ts.Identifier).text;
        } else if (ts.isComputedPropertyName(node.name)) {
            if (ts.isIdentifier(node.name.expression)) {
                name = node.name.expression.text;
            } else if (ts.isPropertyAccessExpression(node.name.expression)) {
                name = handlePropertyAccessExpression(node.name.expression);
            } else {
                debugger;
                logger.warn('Other method ComputedPropertyName found!');
            }
        } else {
            logger.warn('Other method declaration type found!');
        }
    }
    //TODO, hard code
    else if (ts.isConstructorDeclaration(node)) {
        name = 'constructor';
    } else if (ts.isConstructSignatureDeclaration(node)) {
        name = 'construct-signature';
    } else if (ts.isCallSignatureDeclaration(node)) {
        name = 'call-signature';
    } else if (ts.isGetAccessor(node) && ts.isIdentifier(node.name)) {
        name = 'Get-' + node.name.text;
        getAccessorName = node.name.text;
    } else if (ts.isSetAccessor(node) && ts.isIdentifier(node.name)) {
        name = 'Set-' + node.name.text;
    } else if (ts.isArrowFunction(node)) {
        name = buildAnonymousMethodName(node, declaringClass, declaringMethod);
    }
    return name;
}

function buildAnonymousMethodName(node: MethodLikeNode, declaringClass: ArkClass, declaringMethod?: ArkMethod) {
    let declaringMethodName = '';
    if (declaringMethod) {
        declaringMethodName = declaringMethod.getName() + '-';
    }
    const mtdName = 'AnonymousMethod-' + declaringMethodName + declaringClass.getAnonymousMethodNumber();
    return mtdName;
}

export class ObjectBindingPatternParameter {
    private propertyName: string = '';
    private name: string = '';
    private optional: boolean = false;
    private initializer: string = '';

    constructor() {
    }

    public getName() {
        return this.name;
    }

    public setName(name: string) {
        this.name = name;
    }

    public getPropertyName() {
        return this.propertyName;
    }

    public setPropertyName(propertyName: string) {
        this.propertyName = propertyName;
    }

    public isOptional() {
        return this.optional;
    }

    public setOptional(optional: boolean) {
        this.optional = optional;
    }
}

export class ArrayBindingPatternParameter {
    private propertyName: string = '';
    private name: string = '';
    private optional: boolean = false;
    private initializer: string = '';

    constructor() {
    }

    public getName() {
        return this.name;
    }

    public setName(name: string) {
        this.name = name;
    }

    public getPropertyName() {
        return this.propertyName;
    }

    public setPropertyName(propertyName: string) {
        this.propertyName = propertyName;
    }

    public isOptional() {
        return this.optional;
    }

    public setOptional(optional: boolean) {
        this.optional = optional;
    }
}

export class MethodParameter {
    private name: string = '';
    private type: Type;
    private optional: boolean = false;
    private dotDotDotToken: boolean = false;
    private objElements: ObjectBindingPatternParameter[] = [];
    private arrayElements: ArrayBindingPatternParameter[] = [];

    constructor() {
    }

    public getName() {
        return this.name;
    }

    public setName(name: string) {
        this.name = name;
    }

    public getType() {
        return this.type;
    }

    public setType(type: Type) {
        this.type = type;
    }

    public isOptional() {
        return this.optional;
    }

    public setOptional(optional: boolean) {
        this.optional = optional;
    }

    public hasDotDotDotToken() {
        return this.dotDotDotToken;
    }

    public setDotDotDotToken(dotDotDotToken: boolean) {
        this.dotDotDotToken = dotDotDotToken;
    }

    public addObjElement(element: ObjectBindingPatternParameter) {
        this.objElements.push(element);
    }

    public getObjElements() {
        return this.objElements;
    }

    public setObjElements(objElements: ObjectBindingPatternParameter[]) {
        this.objElements = objElements;
    }

    public addArrayElement(element: ArrayBindingPatternParameter) {
        this.arrayElements.push(element);
    }

    public getArrayElements() {
        return this.arrayElements;
    }

    public setArrayElements(arrayElements: ArrayBindingPatternParameter[]) {
        this.arrayElements = arrayElements;
    }
}

export function buildInitMethod(initMethod: ArkMethod, stmts: Stmt[]): void {
    const classType = new ClassType(initMethod.getDeclaringArkClass().getSignature());
    const cThis = new Local('this', classType);
    const assignStmt = new ArkAssignStmt(cThis, new ArkThisRef(classType));
    const block = new BasicBlock();
    block.addStmt(assignStmt);
    const locals: Set<Local> = new Set();
    for (const stmt of stmts) {
        block.addStmt(stmt);
        if (stmt.getDef() && stmt.getDef() instanceof Local) {
            locals.add(stmt.getDef() as Local);
        }
    }
    block.addStmt(new ArkReturnVoidStmt());
    const cfg = new Cfg();
    cfg.addBlock(block);
    cfg.setStartingStmt(assignStmt);
    initMethod.setBody(new ArkBody(initMethod.getSignature(), locals, new Cfg(), cfg, new Map()));
    
}