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
import Logger from '../../../utils/logger';
import ts from 'ohos-typescript';
import { ArkClass } from '../ArkClass';
import { buildArkMethodFromArkClass, buildDefaultArkMethodFromArkClass, buildInitMethod } from './ArkMethodBuilder';
import { buildHeritageClauses, buildModifiers, buildTypeParameters } from './builderUtils';
import { buildGetAccessor2ArkField, buildIndexSignature2ArkField, buildProperty2ArkField } from './ArkFieldBuilder';
import { ArkIRTransformer } from '../../common/ArkIRTransformer';
import { ArkAssignStmt, Stmt } from '../../base/Stmt';
import { ArkInstanceFieldRef } from '../../base/Ref';
import {
    ANONYMOUS_CLASS_DELIMITER,
    ANONYMOUS_CLASS_PREFIX,
    CLASS_ORIGIN_TYPE_OBJECT,
    INSTANCE_INIT_METHOD_NAME,
    STATIC_INIT_METHOD_NAME,
} from '../../common/Const';
import { IRUtils } from '../../common/IRUtils';

const logger = Logger.getLogger();

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
    const {line, character} = ts.getLineAndCharacterOfPosition(
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
    const {line, character} = ts.getLineAndCharacterOfPosition(
        sourceFile,
        clsNode.getStart(sourceFile),
    );
    cls.setLine(line + 1);
    cls.setColumn(character + 1);

    buildNormalArkClass(clsNode, cls, sourceFile, declaringMethod);
    arkNamespace.addArkClass(cls);
}

function buildDefaultArkClass(cls: ArkClass, sourceFile: ts.SourceFile, node?: ts.ModuleDeclaration) {
    cls.setName('_DEFAULT_ARK_CLASS');
    cls.genSignature();

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
    instanceInit.setName(INSTANCE_INIT_METHOD_NAME);
    instanceInit.setDeclaringArkClass(cls);
    instanceInit.setDeclaringArkFile();
    instanceInit.setIsGeneratedFlag(true);
    cls.addMethod(instanceInit);
    cls.setInstanceInitMethod(instanceInit);
}

function init4StaticInitMethod(cls: ArkClass) {
    const staticInit = new ArkMethod();
    staticInit.setName(STATIC_INIT_METHOD_NAME);
    staticInit.setDeclaringArkClass(cls);
    staticInit.setDeclaringArkFile();
    staticInit.setIsGeneratedFlag(true);
    cls.addMethod(staticInit);
    cls.setStaticInitMethod(staticInit);
}

function buildStruct2ArkClass(clsNode: ts.StructDeclaration, cls: ArkClass, sourceFile: ts.SourceFile, declaringMethod?: ArkMethod) {
    if (clsNode.name) {
        cls.setName(clsNode.name.text);
    } else {
        genAnonymousClassName(clsNode, cls, declaringMethod);
    }

    cls.genSignature();

    if (clsNode.typeParameters) {
        buildTypeParameters(clsNode.typeParameters, sourceFile, cls).forEach((typeParameter) => {
            cls.addTypeParameter(typeParameter);
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

    cls.setOriginType('Struct');
    init4InstanceInitMethod(cls);
    init4StaticInitMethod(cls);
    buildArkClassMembers(clsNode, cls, sourceFile);
    cls.getInstanceInitMethod().genSignature();
    cls.getStaticInitMethod().genSignature();
}

function buildClass2ArkClass(clsNode: ts.ClassDeclaration | ts.ClassExpression, cls: ArkClass, sourceFile: ts.SourceFile, declaringMethod?: ArkMethod) {
    if (clsNode.name) {
        cls.setName(clsNode.name.text);
    } else {
        genAnonymousClassName(clsNode, cls, declaringMethod);
    }

    cls.genSignature();

    if (clsNode.typeParameters) {
        buildTypeParameters(clsNode.typeParameters, sourceFile, cls).forEach((typeParameter) => {
            cls.addTypeParameter(typeParameter);
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

    cls.setOriginType('Class');
    init4InstanceInitMethod(cls);
    init4StaticInitMethod(cls);
    buildArkClassMembers(clsNode, cls, sourceFile);
    cls.getInstanceInitMethod().genSignature();
    cls.getStaticInitMethod().genSignature();
}

function buildInterface2ArkClass(clsNode: ts.InterfaceDeclaration, cls: ArkClass, sourceFile: ts.SourceFile, declaringMethod?: ArkMethod) {
    if (clsNode.name) {
        cls.setName(clsNode.name.text);
    } else {
        genAnonymousClassName(clsNode, cls, declaringMethod);
    }

    cls.genSignature();

    if (clsNode.typeParameters) {
        buildTypeParameters(clsNode.typeParameters, sourceFile, cls).forEach((typeParameter) => {
            cls.addTypeParameter(typeParameter);
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

    cls.setOriginType('Interface');

    buildArkClassMembers(clsNode, cls, sourceFile);
}

function buildEnum2ArkClass(clsNode: ts.EnumDeclaration, cls: ArkClass, sourceFile: ts.SourceFile, declaringMethod?: ArkMethod) {
    if (clsNode.name) {
        cls.setName(clsNode.name.text);
    } else {
        genAnonymousClassName(clsNode, cls, declaringMethod);
    }

    cls.genSignature();

    buildModifiers(clsNode, sourceFile).forEach((modifier) => {
        cls.addModifier(modifier);
    });

    cls.setOriginType('Enum');

    init4StaticInitMethod(cls);
    buildArkClassMembers(clsNode, cls, sourceFile);
    cls.getStaticInitMethod().genSignature();
}

function buildTypeLiteralNode2ArkClass(clsNode: ts.TypeLiteralNode, cls: ArkClass,
                                       sourceFile: ts.SourceFile, declaringMethod?: ArkMethod) {
    genAnonymousClassName(clsNode, cls, declaringMethod);

    cls.genSignature();

    cls.setOriginType('TypeLiteral');
    buildArkClassMembers(clsNode, cls, sourceFile);
}

function buildObjectLiteralExpression2ArkClass(clsNode: ts.ObjectLiteralExpression, cls: ArkClass,
                                               sourceFile: ts.SourceFile, declaringMethod?: ArkMethod) {
    genAnonymousClassName(clsNode, cls, declaringMethod);

    cls.genSignature();

    cls.setOriginType(CLASS_ORIGIN_TYPE_OBJECT);

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
            arkMethod.setDeclaringArkFile();
            buildArkMethodFromArkClass(property, cls, arkMethod, sourceFile);
        }
    });
    buildInitMethod(cls.getInstanceInitMethod(), instanceInitStmtMap, instanceIRTransformer.getThisLocal());
    cls.getInstanceInitMethod().genSignature();
    arkMethods.forEach((mtd) => {
        cls.addMethod(mtd);
    });
}

function genAnonymousClassName(clsNode: ClassLikeNode, cls: ArkClass, declaringMethod?: ArkMethod) {
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
    cls.setName(anonymousClassName);
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
        const valueAndStmts = transformer.tsNodeToValueAndStmts(initNode);
        const stmts = valueAndStmts.stmts;
        const fieldRef = new ArkInstanceFieldRef(transformer.getThisLocal(), field.getSignature());
        let rightOp = valueAndStmts.value;
        if (IRUtils.moreThanOneAddress(rightOp)) {
            const rightOpValueAndStmts = transformer.generateAssignStmtForValue(rightOp);
            rightOp = rightOpValueAndStmts.value;
            stmts.push(...rightOpValueAndStmts.stmts);
        }
        const assignStmt = new ArkAssignStmt(fieldRef, rightOp);
        stmts.push(assignStmt);
        for (const stmt of stmts) {
            stmt.setOriginPositionInfo(field.getOriginPosition());
            const originStmt = new Stmt();
            originStmt.setText(field.getCode());
            originStmt.setOriginPositionInfo(field.getOriginPosition());
            initStmtMap.set(stmt, originStmt);
        }
        field.setInitializer(stmts);
    }
}
