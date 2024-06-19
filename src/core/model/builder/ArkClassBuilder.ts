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

import { ArkField } from "../ArkField";
import { ArkFile } from "../ArkFile";
import { ArkMethod, arkMethodNodeKind } from "../ArkMethod";
import { ArkNamespace } from "../ArkNamespace";
import Logger from "../../../utils/logger";
import { ObjectLiteralExpr } from "../../base/Expr";
import ts from "ohos-typescript";
import { ArkClass } from "../ArkClass";
import { buildArkMethodFromArkClass, buildDefaultArkMethodFromArkClass } from "./ArkMethodBuilder";
import { buildHeritageClauses, buildModifiers, buildTypeParameters } from "./builderUtils";
import { buildGetAccessor2ArkField, buildIndexSignature2ArkField, buildProperty2ArkField } from "./ArkFieldBuilder";

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
    if (cls.getDeclaringArkNamespace()) {
        buildNormalArkClassFromArkNamespace(clsNode, cls.getDeclaringArkNamespace(), cls, sourceFile);
    }
    else {
        buildNormalArkClassFromArkFile(clsNode, cls.getDeclaringArkFile(), cls, sourceFile);
    }
}

export function buildNormalArkClassFromArkFile(clsNode: ClassLikeNode,
    arkFile: ArkFile, cls: ArkClass, sourceFile: ts.SourceFile) {
    cls.setDeclaringArkFile(arkFile);
    cls.setCode(clsNode.getText(sourceFile));
    const { line, character } = ts.getLineAndCharacterOfPosition(
        sourceFile,
        clsNode.getStart(sourceFile)
    );
    cls.setLine(line + 1);
    cls.setColumn(character + 1);

    buildNormalArkClass(clsNode, cls, sourceFile);
}

export function buildNormalArkClassFromArkNamespace(clsNode: ClassLikeNode,
    arkNamespace: ArkNamespace, cls: ArkClass, sourceFile: ts.SourceFile) {
    cls.setDeclaringArkNamespace(arkNamespace);
    cls.setDeclaringArkFile(arkNamespace.getDeclaringArkFile());
    cls.setCode(clsNode.getText(sourceFile));
    const { line, character } = ts.getLineAndCharacterOfPosition(
        sourceFile,
        clsNode.getStart(sourceFile)
    );
    cls.setLine(line + 1);
    cls.setColumn(character + 1);

    buildNormalArkClass(clsNode, cls, sourceFile);
}

function buildDefaultArkClass(cls: ArkClass, sourceFile: ts.SourceFile, node?: ts.ModuleDeclaration) {
    cls.setName("_DEFAULT_ARK_CLASS");
    cls.genSignature();

    genDefaultArkMethod(cls, sourceFile, node);
}

function genDefaultArkMethod(cls: ArkClass, sourceFile: ts.SourceFile, node?: ts.ModuleDeclaration) {
    let defaultMethod = new ArkMethod();
    buildDefaultArkMethodFromArkClass(cls, defaultMethod, sourceFile, node);
    cls.setDefaultArkMethod(defaultMethod);
}

export function buildNormalArkClass(clsNode: ClassLikeNode,
    cls: ArkClass, sourceFile: ts.SourceFile) {
    switch (clsNode.kind) {
        case ts.SyntaxKind.StructDeclaration:
            buildStruct2ArkClass(clsNode, cls, sourceFile);
            break;
        case ts.SyntaxKind.ClassDeclaration:
            buildClass2ArkClass(clsNode, cls, sourceFile);
            break;
        case ts.SyntaxKind.ClassExpression:
            buildClass2ArkClass(clsNode, cls, sourceFile);
            break;
        case ts.SyntaxKind.InterfaceDeclaration:
            buildInterface2ArkClass(clsNode, cls, sourceFile);
            break;
        case ts.SyntaxKind.EnumDeclaration:
            buildEnum2ArkClass(clsNode, cls, sourceFile);
            break;
        case ts.SyntaxKind.TypeLiteral:
            buildTypeLiteralNode2ArkClass(clsNode, cls, sourceFile);
            break;
        case ts.SyntaxKind.ObjectLiteralExpression:
            buildObjectLiteralExpression2ArkClass(clsNode, cls, sourceFile);
            break;
    }
}

function buildStruct2ArkClass(clsNode: ts.StructDeclaration, cls: ArkClass, sourceFile: ts.SourceFile) {
    if (clsNode.name) {
        cls.setName(clsNode.name.text);
    }
    else {
        genAnonymousClassName(clsNode, cls);
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

    cls.setOriginType("Struct");

    buildArkClassMembers(clsNode, cls, sourceFile);
}

function buildClass2ArkClass(clsNode: ts.ClassDeclaration | ts.ClassExpression, cls: ArkClass, sourceFile: ts.SourceFile) {
    if (clsNode.name) {
        cls.setName(clsNode.name.text);
    }
    else {
        genAnonymousClassName(clsNode, cls);
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

    cls.setOriginType("Class");

    buildArkClassMembers(clsNode, cls, sourceFile);
}

function buildInterface2ArkClass(clsNode: ts.InterfaceDeclaration, cls: ArkClass, sourceFile: ts.SourceFile) {
    if (clsNode.name) {
        cls.setName(clsNode.name.text);
    }
    else {
        genAnonymousClassName(clsNode, cls);
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

    cls.setOriginType("Interface");

    buildArkClassMembers(clsNode, cls, sourceFile);
}

function buildEnum2ArkClass(clsNode: ts.EnumDeclaration, cls: ArkClass, sourceFile: ts.SourceFile) {
    if (clsNode.name) {
        cls.setName(clsNode.name.text);
    }
    else {
        genAnonymousClassName(clsNode, cls);
    }

    cls.genSignature();

    buildModifiers(clsNode, sourceFile).forEach((modifier) => {
        cls.addModifier(modifier);
    });

    cls.setOriginType("Enum");

    buildArkClassMembers(clsNode, cls, sourceFile);
}

function buildTypeLiteralNode2ArkClass(clsNode: ts.TypeLiteralNode, cls: ArkClass, sourceFile: ts.SourceFile) {
    genAnonymousClassName(clsNode, cls);

    cls.genSignature();

    cls.setOriginType("TypeLiteral");
}

function buildObjectLiteralExpression2ArkClass(clsNode: ts.ObjectLiteralExpression, cls: ArkClass, sourceFile: ts.SourceFile) {
    genAnonymousClassName(clsNode, cls);

    cls.genSignature();

    cls.setOriginType("Object");

    let arkMethods: ArkMethod[] = [];
    clsNode.properties.forEach((property) => {
        if (ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property) || ts.isSpreadAssignment(property)) {
            buildProperty2ArkField(property, sourceFile, cls);
        }
        else {
            let arkMethod = new ArkMethod();
            arkMethod.setDeclaringArkClass(cls);
            arkMethod.setDeclaringArkFile();
            buildArkMethodFromArkClass(property, cls, arkMethod, sourceFile);
        }
    });
    arkMethods.forEach((mtd) => {
        cls.addMethod(mtd);
    });
}

function genAnonymousClassName(clsNode: ClassLikeNode, cls: ArkClass) {
    const declaringArkNamespace = cls.getDeclaringArkNamespace();
    const declaringArkFile = cls.getDeclaringArkFile();
    let clsName = '';
    if (declaringArkNamespace) {
        clsName = 'AnonymousClass-' + declaringArkNamespace.getName() + '-' + declaringArkNamespace.getAnonymousClassNumber();
    }
    else {
        clsName = 'AnonymousClass-' + declaringArkFile.getName() + '-' + declaringArkFile.getAnonymousClassNumber();
    }
    cls.setName(clsName);
}

function buildArkClassMembers(clsNode: ClassLikeNode, cls: ArkClass, sourceFile: ts.SourceFile) {
    if (ts.isObjectLiteralExpression(clsNode)) {
        return;
    }
    clsNode.members.forEach((member) => {
        if (ts.isPropertyDeclaration(member) || ts.isPropertySignature(member) || ts.isEnumMember(member)) {
            buildProperty2ArkField(member, sourceFile, cls);
        }
        else if (ts.isIndexSignatureDeclaration(member)) {
            buildIndexSignature2ArkField(member, sourceFile, cls);
        }
        else if (
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
        else if (ts.isSemicolonClassElement(member)) {
            logger.debug("Skip these members.");
        }
        else {
            logger.warn("Please contact developers to support new member type!");
        }
    });
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