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
import { ObjectLiteralExpr } from '../../base/Expr';
import ts from 'ohos-typescript';
import { ArkClass } from '../ArkClass';
import { buildArkMethodFromArkClass, buildDefaultArkMethodFromArkClass, buildInitMethod } from './ArkMethodBuilder';
import { buildHeritageClauses, buildModifiers, buildTypeParameters } from './builderUtils';
import { buildGetAccessor2ArkField, buildIndexSignature2ArkField, buildProperty2ArkField } from './ArkFieldBuilder';
import { TypeInference } from '../../common/TypeInference';
import { ArkIRTransformer } from '../../common/ArkIRTransformer';
import { ArkAssignStmt, Stmt } from '../../base/Stmt';
import { ArkInstanceFieldRef } from '../../base/Ref';

const logger = Logger.getLogger();

export const DEFAULT_ARK_CLASS_NAME = '_DEFAULT_ARK_CLASS';

export const InstanceInitMethodName = '@instance_init';
export const StaticInitMethodName = '@static_init';

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
    instanceInit.setName(InstanceInitMethodName);
    instanceInit.setDeclaringArkClass(cls);
    instanceInit.setDeclaringArkFile();
    instanceInit.setIsGeneratedFlag(true);
    cls.addMethod(instanceInit);
    cls.setInstanceInitMethod(instanceInit);
}

function init4StaticInitMethod(cls: ArkClass) {
    const staticInit = new ArkMethod();
    staticInit.setName(StaticInitMethodName);
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
    cls.getStaticInitMethod().genSignature()
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
    cls.getStaticInitMethod().genSignature()
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

    cls.setOriginType('Object');

    let arkMethods: ArkMethod[] = [];
    
    init4InstanceInitMethod(cls);
    const instanceInitStmts: Stmt[] = [];              
    const instanceIRTransformer = new ArkIRTransformer(sourceFile, cls.getInstanceInitMethod());                        
    clsNode.properties.forEach((property) => {
        if (ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property) || ts.isSpreadAssignment(property)) {
            const arkField = buildProperty2ArkField(property, sourceFile, cls);
            if (ts.isPropertyAssignment(property) && property.initializer) {
                getInitStmts(instanceIRTransformer, property.initializer, arkField, instanceInitStmts);
            }
        } else {
            let arkMethod = new ArkMethod();
            arkMethod.setDeclaringArkClass(cls);
            arkMethod.setDeclaringArkFile();
            buildArkMethodFromArkClass(property, cls, arkMethod, sourceFile);
        }
    });
    buildInitMethod(cls.getInstanceInitMethod(), instanceInitStmts);
    cls.getInstanceInitMethod().genSignature();
    arkMethods.forEach((mtd) => {
        cls.addMethod(mtd);
    });
}

function genAnonymousClassName(clsNode: ClassLikeNode, cls: ArkClass, declaringMethod?: ArkMethod) {
    const declaringArkNamespace = cls.getDeclaringArkNamespace();
    const declaringArkFile = cls.getDeclaringArkFile();
    let clsName = '';
    let declaringMethodName = '';
    if (declaringMethod) {
        declaringMethodName = declaringMethod.getName() + '-';
    }
    if (declaringArkNamespace) {
        clsName = 'AnonymousClass-' + declaringMethodName + declaringArkNamespace.getAnonymousClassNumber();
    } else {
        clsName = 'AnonymousClass-' + declaringMethodName + declaringArkFile.getAnonymousClassNumber();
    }
    cls.setName(clsName);
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
    const instanceInitStmts: Stmt[] = [];
    const staticInitStmts: Stmt[] = [];
    clsNode.members.forEach((member) => {
        if (ts.isPropertyDeclaration(member) || ts.isPropertySignature(member)) {
            const arkField = buildProperty2ArkField(member, sourceFile, cls);
            if (member.initializer) {
                if (arkField.isStatic()) {
                    getInitStmts(staticIRTransformer, member.initializer, arkField, staticInitStmts);
                } else {
                    getInitStmts(instanceIRTransformer, member.initializer, arkField, instanceInitStmts);
                }
            }
        } else if (ts.isEnumMember(member)) {
            const arkField = buildProperty2ArkField(member, sourceFile, cls);
            if (member.initializer) {
                getInitStmts(staticIRTransformer, member.initializer, arkField, staticInitStmts);
            }
        } else if (ts.isIndexSignatureDeclaration(member)) {
            buildIndexSignature2ArkField(member, sourceFile, cls);
        } else if (
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
        } else if (ts.isSemicolonClassElement(member)) {
            logger.debug('Skip these members.');
        } else {
            logger.warn('Please contact developers to support new member type!');
        }
    });
    if (ts.isClassDeclaration(clsNode) || ts.isClassExpression(clsNode) || ts.isStructDeclaration(clsNode)) {
        buildInitMethod(cls.getInstanceInitMethod(), instanceInitStmts);
        buildInitMethod(cls.getStaticInitMethod(), staticInitStmts);
    }
    if (ts.isEnumDeclaration(clsNode)) {
        buildInitMethod(cls.getStaticInitMethod(), staticInitStmts);
    }
}

function getInitStmts(transformer: ArkIRTransformer, initNode: ts.Node, field: ArkField, initStmts: Stmt[]) {
    const valueAndStmts = transformer.tsNodeToValueAndStmts(initNode);
    const stmts = valueAndStmts.stmts
    const fieldRef = new ArkInstanceFieldRef(transformer.getThisLocal(), field.getSignature());
    const assignStmt = new ArkAssignStmt(fieldRef, valueAndStmts.value);
    stmts.push(assignStmt);
    field.setInitializer(stmts);
    initStmts.push(...stmts)
}

function checkInitializer(field: ArkField, cls: ArkClass) {
    let initializer = field.getInitializer();
    if (initializer instanceof ObjectLiteralExpr) {
        let anonymousClass = initializer.getAnonymousClass();
        let newName = 'AnonymousClass-' + cls.getName() + '-' + field.getName();
        anonymousClass.setName(newName);
        anonymousClass.setDeclaringArkNamespace(cls.getDeclaringArkNamespace());
        anonymousClass.setDeclaringArkFile(cls.getDeclaringArkFile());
        anonymousClass.genSignature();
        anonymousClass.getMethods().forEach((mtd) => {
            mtd.setDeclaringArkClass(anonymousClass);
            mtd.setDeclaringArkFile();
            mtd.genSignature();
        });
    }
}

/**
 * convert variable which declare in file or namespace to defaultClass field
 * @param defaultClass
 */
export function generateDefaultClassField(defaultClass: ArkClass) {
    const defaultArkMethod = defaultClass?.getDefaultArkMethod();
    if (defaultArkMethod) {
        TypeInference.inferTypeInMethod(defaultArkMethod);
        defaultClass.getDefaultArkMethod()?.getBody()?.getLocals().forEach(local => {
            if (local.getName().startsWith('$temp') || defaultClass.getDeclaringArkFile().getImportInfoBy(local.getName())
                || local.getName() === 'this') {
            } else {
                const arkField = new ArkField();
                arkField.setFieldType(ArkField.DEFAULT_ARK_Field);
                arkField.setDeclaringClass(defaultClass);
                arkField.setType(local.getType());
                arkField.setName(local.getName());
                arkField.genSignature();
                defaultClass.addField(arkField);
            }
        });
    }
}
