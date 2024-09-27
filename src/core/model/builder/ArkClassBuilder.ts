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

import { ArkField } from '../ArkField';
import { ArkFile } from '../ArkFile';
import { ArkMethod } from '../ArkMethod';
import { ArkNamespace } from '../ArkNamespace';
import Logger, { LOG_MODULE_TYPE } from '../../../utils/logger';
import ts from 'ohos-typescript';
import { ArkClass, ClassCategory } from '../ArkClass';
import { buildArkMethodFromArkClass, buildDefaultArkMethodFromArkClass, buildInitMethod } from './ArkMethodBuilder';
import { buildHeritageClauses, buildModifiers, buildTypeParameters } from './builderUtils';
import { buildGetAccessor2ArkField, buildIndexSignature2ArkField, buildProperty2ArkField } from './ArkFieldBuilder';
import { ArkIRTransformer } from '../../common/ArkIRTransformer';
import { ArkAssignStmt, OriginalStmt, Stmt } from '../../base/Stmt';
import { ArkInstanceFieldRef } from '../../base/Ref';
import {
    ANONYMOUS_CLASS_DELIMITER,
    ANONYMOUS_CLASS_PREFIX,
    DEFAULT_ARK_CLASS_NAME,
    INSTANCE_INIT_METHOD_NAME,
    STATIC_INIT_METHOD_NAME,
} from '../../common/Const';
import { IRUtils } from '../../common/IRUtils';
import { ClassSignature, MethodSignature } from '../ArkSignature';
import { ArkSignatureBuilder } from './ArkSignatureBuilder';
import { FullPosition } from '../../base/Position';

const logger = Logger.getLogger(LOG_MODULE_TYPE.ARKANALYZER, 'ArkClassBuilder');

export type ClassLikeNode =
    ts.ClassDeclaration |
    ts.InterfaceDeclaration |
    ts.EnumDeclaration |
    ts.ClassExpression |
    ts.TypeLiteralNode |
    ts.StructDeclaration |
    ts.ObjectLiteralExpression;

export function buildDefaultArkClassFromArkFile(arkFile: ArkFile, defaultClass: ArkClass, astRoot: ts.SourceFile) {
    defaultClass.setDeclaringArkFile(arkFile);
    buildDefaultArkClass(defaultClass, astRoot);
}

export function buildDefaultArkClassFromArkNamespace(arkNamespace: ArkNamespace, defaultClass: ArkClass,
                                                     nsNode: ts.ModuleDeclaration, sourceFile: ts.SourceFile) {
    defaultClass.setDeclaringArkNamespace(arkNamespace);
    defaultClass.setDeclaringArkFile(arkNamespace.getDeclaringArkFile());
    buildDefaultArkClass(defaultClass, sourceFile, nsNode);
}

export function buildNormalArkClassFromArkMethod(clsNode: ts.TypeLiteralNode,
                                                 cls: ArkClass, sourceFile: ts.SourceFile) {
    const namespace = cls.getDeclaringArkNamespace();
    if (namespace) {
        buildNormalArkClassFromArkNamespace(clsNode, namespace, cls, sourceFile);
    } else {
        buildNormalArkClassFromArkFile(clsNode, cls.getDeclaringArkFile(), cls, sourceFile);
    }
}

export function buildNormalArkClassFromArkFile(clsNode: ClassLikeNode, arkFile: ArkFile, cls: ArkClass,
                                               sourceFile: ts.SourceFile, declaringMethod?: ArkMethod) {
    cls.setDeclaringArkFile(arkFile);
    cls.setCode(clsNode.getText(sourceFile));
    const { line, character } = ts.getLineAndCharacterOfPosition(
        sourceFile,
        clsNode.getStart(sourceFile),
    );
    cls.setLine(line + 1);
    cls.setColumn(character + 1);

    buildNormalArkClass(clsNode, cls, sourceFile, declaringMethod);
    arkFile.addArkClass(cls);
}

export function buildNormalArkClassFromArkNamespace(clsNode: ClassLikeNode, arkNamespace: ArkNamespace, cls: ArkClass,
                                                    sourceFile: ts.SourceFile, declaringMethod?: ArkMethod) {
    cls.setDeclaringArkNamespace(arkNamespace);
    cls.setDeclaringArkFile(arkNamespace.getDeclaringArkFile());
    cls.setCode(clsNode.getText(sourceFile));
    const { line, character } = ts.getLineAndCharacterOfPosition(
        sourceFile,
        clsNode.getStart(sourceFile),
    );
    cls.setLine(line + 1);
    cls.setColumn(character + 1);

    buildNormalArkClass(clsNode, cls, sourceFile, declaringMethod);
    arkNamespace.addArkClass(cls);
}

function buildDefaultArkClass(cls: ArkClass, sourceFile: ts.SourceFile, node?: ts.ModuleDeclaration) {
    const defaultArkClassSignature = new ClassSignature(DEFAULT_ARK_CLASS_NAME,
        cls.getDeclaringArkFile().getFileSignature(), cls.getDeclaringArkNamespace()?.getSignature() || null);
    cls.setSignature(defaultArkClassSignature);

    genDefaultArkMethod(cls, sourceFile, node);
}

function genDefaultArkMethod(cls: ArkClass, sourceFile: ts.SourceFile, node?: ts.ModuleDeclaration) {
    let defaultMethod = new ArkMethod();
    buildDefaultArkMethodFromArkClass(cls, defaultMethod, sourceFile, node);
    cls.setDefaultArkMethod(defaultMethod);
}

export function buildNormalArkClass(clsNode: ClassLikeNode, cls: ArkClass, sourceFile: ts.SourceFile, declaringMethod?: ArkMethod) {
    switch (clsNode.kind) {
        case ts.SyntaxKind.StructDeclaration:
            buildStruct2ArkClass(clsNode, cls, sourceFile, declaringMethod);
            break;
        case ts.SyntaxKind.ClassDeclaration:
            buildClass2ArkClass(clsNode, cls, sourceFile, declaringMethod);
            break;
        case ts.SyntaxKind.ClassExpression:
            buildClass2ArkClass(clsNode, cls, sourceFile, declaringMethod);
            break;
        case ts.SyntaxKind.InterfaceDeclaration:
            buildInterface2ArkClass(clsNode, cls, sourceFile, declaringMethod);
            break;
        case ts.SyntaxKind.EnumDeclaration:
            buildEnum2ArkClass(clsNode, cls, sourceFile, declaringMethod);
            break;
        case ts.SyntaxKind.TypeLiteral:
            buildTypeLiteralNode2ArkClass(clsNode, cls, sourceFile, declaringMethod);
            break;
        case ts.SyntaxKind.ObjectLiteralExpression:
            buildObjectLiteralExpression2ArkClass(clsNode, cls, sourceFile, declaringMethod);
            break;
    }
}

function init4InstanceInitMethod(cls: ArkClass) {
    const instanceInit = new ArkMethod();
    instanceInit.setDeclaringArkClass(cls);
    instanceInit.setIsGeneratedFlag(true);
    const methodSubSignature = ArkSignatureBuilder.buildMethodSubSignatureFromMethodName(INSTANCE_INIT_METHOD_NAME);
    const methodSignature = new MethodSignature(instanceInit.getDeclaringArkClass().getSignature(),
        methodSubSignature);
    instanceInit.setSignature(methodSignature);

    cls.addMethod(instanceInit);
    cls.setInstanceInitMethod(instanceInit);
}

function init4StaticInitMethod(cls: ArkClass) {
    const staticInit = new ArkMethod();
    staticInit.setDeclaringArkClass(cls);
    staticInit.setIsGeneratedFlag(true);
    const methodSubSignature = ArkSignatureBuilder.buildMethodSubSignatureFromMethodName(STATIC_INIT_METHOD_NAME);
    const methodSignature = new MethodSignature(staticInit.getDeclaringArkClass().getSignature(),
        methodSubSignature);
    staticInit.setSignature(methodSignature);

    cls.addMethod(staticInit);
    cls.setStaticInitMethod(staticInit);
}

function buildStruct2ArkClass(clsNode: ts.StructDeclaration, cls: ArkClass, sourceFile: ts.SourceFile, declaringMethod?: ArkMethod) {
    let className = '';
    if (clsNode.name) {
        className = clsNode.name.text;
    } else {
        className = genAnonymousClassName(clsNode, cls, declaringMethod);
    }
    const classSignature = new ClassSignature(className,
        cls.getDeclaringArkFile().getFileSignature(), cls.getDeclaringArkNamespace()?.getSignature() || null);
    cls.setSignature(classSignature);

    if (clsNode.typeParameters) {
        buildTypeParameters(clsNode.typeParameters, sourceFile, cls).forEach((typeParameter) => {
            cls.addGenericType(typeParameter);
        });
    }

    if (clsNode.heritageClauses) {
        for (let [key, value] of buildHeritageClauses(clsNode.heritageClauses)) {
            if (value == 'ExtendsKeyword') {
                cls.setSuperClassName(key);
            } else {
                cls.addImplementedInterfaceName(key);
            }
        }
    }

    buildModifiers(clsNode, sourceFile).forEach((modifier) => {
        cls.addModifier(modifier);
    });

    cls.setCategory(ClassCategory.STRUCT);
    init4InstanceInitMethod(cls);
    init4StaticInitMethod(cls);
    buildArkClassMembers(clsNode, cls, sourceFile);
}

function buildClass2ArkClass(clsNode: ts.ClassDeclaration | ts.ClassExpression, cls: ArkClass, sourceFile: ts.SourceFile, declaringMethod?: ArkMethod) {
    let className = '';
    if (clsNode.name) {
        className = clsNode.name.text;
    } else {
        className = genAnonymousClassName(clsNode, cls, declaringMethod);
    }
    const classSignature = new ClassSignature(className,
        cls.getDeclaringArkFile().getFileSignature(), cls.getDeclaringArkNamespace()?.getSignature() || null);
    cls.setSignature(classSignature);

    if (clsNode.typeParameters) {
        buildTypeParameters(clsNode.typeParameters, sourceFile, cls).forEach((typeParameter) => {
            cls.addGenericType(typeParameter);
        });
    }

    if (clsNode.heritageClauses) {
        for (let [key, value] of buildHeritageClauses(clsNode.heritageClauses)) {
            if (value == 'ExtendsKeyword') {
                cls.setSuperClassName(key);
            } else {
                cls.addImplementedInterfaceName(key);
            }
        }
    }

    buildModifiers(clsNode, sourceFile).forEach((modifier) => {
        cls.addModifier(modifier);
    });

    cls.setCategory(ClassCategory.CLASS);
    init4InstanceInitMethod(cls);
    init4StaticInitMethod(cls);
    buildArkClassMembers(clsNode, cls, sourceFile);
}

function buildInterface2ArkClass(clsNode: ts.InterfaceDeclaration, cls: ArkClass, sourceFile: ts.SourceFile, declaringMethod?: ArkMethod) {
    let className = '';
    if (clsNode.name) {
        className = clsNode.name.text;
    } else {
        className = genAnonymousClassName(clsNode, cls, declaringMethod);
    }
    const classSignature = new ClassSignature(className,
        cls.getDeclaringArkFile().getFileSignature(), cls.getDeclaringArkNamespace()?.getSignature() || null);
    cls.setSignature(classSignature);

    if (clsNode.typeParameters) {
        buildTypeParameters(clsNode.typeParameters, sourceFile, cls).forEach((typeParameter) => {
            cls.addGenericType(typeParameter);
        });
    }

    if (clsNode.heritageClauses) {
        for (let [key, value] of buildHeritageClauses(clsNode.heritageClauses)) {
            if (value == 'ExtendsKeyword') {
                cls.setSuperClassName(key);
            } else {
                cls.addImplementedInterfaceName(key);
            }
        }
    }

    buildModifiers(clsNode, sourceFile).forEach((modifier) => {
        cls.addModifier(modifier);
    });

    cls.setCategory(ClassCategory.INTERFACE);

    buildArkClassMembers(clsNode, cls, sourceFile);
}

function buildEnum2ArkClass(clsNode: ts.EnumDeclaration, cls: ArkClass, sourceFile: ts.SourceFile, declaringMethod?: ArkMethod) {
    let className = '';
    if (clsNode.name) {
        className = clsNode.name.text;
    } else {
        className = genAnonymousClassName(clsNode, cls, declaringMethod);
    }
    const classSignature = new ClassSignature(className,
        cls.getDeclaringArkFile().getFileSignature(), cls.getDeclaringArkNamespace()?.getSignature() || null);
    cls.setSignature(classSignature);

    buildModifiers(clsNode, sourceFile).forEach((modifier) => {
        cls.addModifier(modifier);
    });

    cls.setCategory(ClassCategory.ENUM);

    init4StaticInitMethod(cls);
    buildArkClassMembers(clsNode, cls, sourceFile);
}

function buildTypeLiteralNode2ArkClass(clsNode: ts.TypeLiteralNode, cls: ArkClass,
                                       sourceFile: ts.SourceFile, declaringMethod?: ArkMethod) {
    const className = genAnonymousClassName(clsNode, cls, declaringMethod);
    const classSignature = new ClassSignature(className,
        cls.getDeclaringArkFile().getFileSignature(), cls.getDeclaringArkNamespace()?.getSignature() || null);
    cls.setSignature(classSignature);



    cls.setCategory(ClassCategory.TYPE_LITERAL);
    if (ts.isTypeAliasDeclaration(clsNode.parent) && clsNode.parent.typeParameters) {
        buildTypeParameters(clsNode.parent.typeParameters, sourceFile, cls).forEach((typeParameter) => {
            cls.addGenericType(typeParameter);
        });
    }
    buildArkClassMembers(clsNode, cls, sourceFile);
}

function buildObjectLiteralExpression2ArkClass(clsNode: ts.ObjectLiteralExpression, cls: ArkClass,
                                               sourceFile: ts.SourceFile, declaringMethod?: ArkMethod) {
    const className = genAnonymousClassName(clsNode, cls, declaringMethod);
    const classSignature = new ClassSignature(className,
        cls.getDeclaringArkFile().getFileSignature(), cls.getDeclaringArkNamespace()?.getSignature() || null);
    cls.setSignature(classSignature);

    cls.setCategory(ClassCategory.OBJECT);

    let arkMethods: ArkMethod[] = [];

    init4InstanceInitMethod(cls);
    const instanceInitStmtMap: Map<Stmt, Stmt> = new Map();
    const instanceIRTransformer = new ArkIRTransformer(sourceFile, cls.getInstanceInitMethod());
    clsNode.properties.forEach((property) => {
        if (ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property) || ts.isSpreadAssignment(property)) {
            const arkField = buildProperty2ArkField(property, sourceFile, cls);
            if (ts.isPropertyAssignment(property)) {
                getInitStmts(instanceIRTransformer, arkField, instanceInitStmtMap, property.initializer);
            }
        } else {
            let arkMethod = new ArkMethod();
            arkMethod.setDeclaringArkClass(cls);
            buildArkMethodFromArkClass(property, cls, arkMethod, sourceFile);
        }
    });
    buildInitMethod(cls.getInstanceInitMethod(), instanceInitStmtMap, instanceIRTransformer.getThisLocal());
    arkMethods.forEach((mtd) => {
        cls.addMethod(mtd);
    });
}

function genAnonymousClassName(clsNode: ClassLikeNode, cls: ArkClass, declaringMethod?: ArkMethod): string {
    const declaringArkNamespace = cls.getDeclaringArkNamespace();
    const declaringArkFile = cls.getDeclaringArkFile();
    let anonymousClassName = '';
    let declaringMethodName = '';
    if (declaringMethod) {
        declaringMethodName = declaringMethod.getDeclaringArkClass().getName() + ANONYMOUS_CLASS_DELIMITER + declaringMethod.getName() + ANONYMOUS_CLASS_DELIMITER;
    }
    if (declaringArkNamespace) {
        anonymousClassName = ANONYMOUS_CLASS_PREFIX + ANONYMOUS_CLASS_DELIMITER + declaringMethodName + declaringArkNamespace.getAnonymousClassNumber();
    } else {
        anonymousClassName = ANONYMOUS_CLASS_PREFIX + ANONYMOUS_CLASS_DELIMITER + declaringMethodName + declaringArkFile.getAnonymousClassNumber();
    }
    return anonymousClassName;
}

function buildArkClassMembers(clsNode: ClassLikeNode, cls: ArkClass, sourceFile: ts.SourceFile) {
    if (ts.isObjectLiteralExpression(clsNode)) {
        return;
    }
    let instanceIRTransformer: ArkIRTransformer;
    let staticIRTransformer: ArkIRTransformer;
    if (ts.isClassDeclaration(clsNode) || ts.isClassExpression(clsNode) || ts.isStructDeclaration(clsNode)) {
        instanceIRTransformer = new ArkIRTransformer(sourceFile, cls.getInstanceInitMethod());
        staticIRTransformer = new ArkIRTransformer(sourceFile, cls.getStaticInitMethod());
    }
    if (ts.isEnumDeclaration(clsNode)) {
        staticIRTransformer = new ArkIRTransformer(sourceFile, cls.getStaticInitMethod());
    }
    const instanceInitStmtMap: Map<Stmt, Stmt> = new Map();
    const staticInitStmtMap: Map<Stmt, Stmt> = new Map();
    // 先构建所有method，再构建field
    clsNode.members.forEach((member) => {
        if (
            ts.isMethodDeclaration(member) ||
            ts.isConstructorDeclaration(member) ||
            ts.isMethodSignature(member) ||
            ts.isConstructSignatureDeclaration(member) ||
            ts.isAccessor(member) ||
            ts.isCallSignatureDeclaration(member)
        ) {
            let mthd: ArkMethod = new ArkMethod();
            buildArkMethodFromArkClass(member, cls, mthd, sourceFile);
            cls.addMethod(mthd);
            if (ts.isGetAccessor(member)) {
                buildGetAccessor2ArkField(member, mthd, sourceFile);
            }
        }
    });
    clsNode.members.forEach((member) => {
        if (ts.isPropertyDeclaration(member) || ts.isPropertySignature(member)) {
            const arkField = buildProperty2ArkField(member, sourceFile, cls);
            if (ts.isClassDeclaration(clsNode) || ts.isClassExpression(clsNode) || ts.isStructDeclaration(clsNode)) {
                if (arkField.isStatic()) {
                    getInitStmts(staticIRTransformer, arkField, staticInitStmtMap, member.initializer);
                } else {
                    if (!instanceIRTransformer)
                        console.log(clsNode.getText(sourceFile));
                    getInitStmts(instanceIRTransformer, arkField, instanceInitStmtMap, member.initializer);
                }
            }
        } else if (ts.isEnumMember(member)) {
            const arkField = buildProperty2ArkField(member, sourceFile, cls);
            getInitStmts(staticIRTransformer, arkField, staticInitStmtMap, member.initializer);
        } else if (ts.isIndexSignatureDeclaration(member)) {
            buildIndexSignature2ArkField(member, sourceFile, cls);
        } else if (ts.isSemicolonClassElement(member)) {
            logger.debug('Skip these members.');
        } else {
            logger.warn('Please contact developers to support new member type!');
        }
    });
    if (ts.isClassDeclaration(clsNode) || ts.isClassExpression(clsNode) || ts.isStructDeclaration(clsNode)) {
        buildInitMethod(cls.getInstanceInitMethod(), instanceInitStmtMap, instanceIRTransformer!.getThisLocal());
        buildInitMethod(cls.getStaticInitMethod(), staticInitStmtMap, staticIRTransformer!.getThisLocal());
    }
    if (ts.isEnumDeclaration(clsNode)) {
        buildInitMethod(cls.getStaticInitMethod(), staticInitStmtMap, staticIRTransformer!.getThisLocal());
    }
}

function getInitStmts(transformer: ArkIRTransformer, field: ArkField, initStmtMap: Map<Stmt, Stmt>, initNode?: ts.Node) {
    if (initNode) {
        const stmts: Stmt[] = [];
        let {
            value: initValue,
            valueOriginalPositions: initPositions,
            stmts: initStmts,
        } = transformer.tsNodeToValueAndStmts(initNode);
        stmts.push(...initStmts);
        if (IRUtils.moreThanOneAddress(initValue)) {
            ({ value: initValue, valueOriginalPositions: initPositions, stmts: initStmts } =
                transformer.generateAssignStmtForValue(initValue, initPositions));
            stmts.push(...initStmts);
        }

        const fieldRef = new ArkInstanceFieldRef(transformer.getThisLocal(), field.getSignature());
        const fieldRefPositons = [FullPosition.DEFAULT, FullPosition.DEFAULT];
        const assignStmt = new ArkAssignStmt(fieldRef, initValue);
        assignStmt.setOperandOriginalPositions([...fieldRefPositons, ...initPositions]);
        stmts.push(assignStmt);
        for (const stmt of stmts) {
            const originStmt = new OriginalStmt(field.getCode(), field.getOriginPosition());
            initStmtMap.set(stmt, originStmt);
        }
        field.setInitializer(stmts);
    }
}
