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

import ts from "ohos-typescript";
import { ArkField } from "../ArkField";
import Logger from "../../../utils/logger";
import { LineColPosition } from "../../base/Position";
import { ArkClass } from "../ArkClass";
import { ArkMethod } from "../ArkMethod";
import { buildModifiers, handlePropertyAccessExpression, tsNode2Type, tsNode2Value } from "./builderUtils";

const logger = Logger.getLogger();

export type PropertyLike = ts.PropertyDeclaration | ts.PropertyAssignment;

export function buildProperty2ArkField(member: ts.PropertyDeclaration | ts.PropertyAssignment | ts.ShorthandPropertyAssignment
    | ts.SpreadAssignment | ts.PropertySignature | ts.EnumMember, sourceFile: ts.SourceFile, cls: ArkClass): ArkField {
    let field = new ArkField();
    field.setFieldType(ts.SyntaxKind[member.kind]);
    field.setCode(member.getText(sourceFile));
    field.setOriginPosition(LineColPosition.buildFromNode(member, sourceFile));
    if (cls) {
        field.setDeclaringClass(cls);
    }

    if (member.name && ts.isComputedPropertyName(member.name)) {
        if (ts.isIdentifier(member.name.expression)) {
            let propertyName = member.name.expression.text;
            field.setName(propertyName);
        } else if (ts.isPropertyAccessExpression(member.name.expression)) {
            field.setName(handlePropertyAccessExpression(member.name.expression));
        } else {
            logger.warn("Other property expression type found!");
        }
    } else if (member.name && ts.isIdentifier(member.name)) {
        let propertyName = member.name.text;
        field.setName(propertyName);
    } else {
        logger.warn("Other type of property name found!");
    }

    if ((ts.isPropertyDeclaration(member) || ts.isPropertySignature(member)) && member.modifiers) {
        let modifiers = buildModifiers(member, sourceFile);
        modifiers.forEach((modifier) => {
            field.addModifier(modifier);
        });
    }

    if ((ts.isPropertyDeclaration(member) || ts.isPropertySignature(member)) && member.type) {
        field.setType(tsNode2Type(member.type, sourceFile, cls));
    }

    if ((ts.isPropertyDeclaration(member) || ts.isPropertySignature(member)) && member.questionToken) {
        field.setQuestionToken(true);
    }

    if (ts.isPropertyDeclaration(member) && member.exclamationToken) {
        field.setExclamationToken(true);
    }

    if (ts.isEnumMember(member)) {
        field.addModifier('StaticKeyword');
    }

    if (cls) {
        cls.addField(field);
    }

    field.genSignature();

    return field;
}

export function buildIndexSignature2ArkField(member: ts.IndexSignatureDeclaration, sourceFile: ts.SourceFile, cls: ArkClass) {
    let field = new ArkField();
    field.setCode(member.getText(sourceFile));
    field.setFieldType(ts.SyntaxKind[member.kind]);
    if (cls) {
        field.setDeclaringClass(cls);
    }

    if (member.name) {
        field.setName(member.name.getText(sourceFile));
    }
    else {
        field.setName(buildAnonymousFieldName(cls));
    }

    //TODO: parameters
    //field.setParameters(buildParameters(member.parameters, sourceFile));
    field.setOriginPosition(LineColPosition.buildFromNode(member, sourceFile));

    //modifiers
    if (member.modifiers) {
        buildModifiers(member, sourceFile).forEach((modifier) => {
            field.addModifier(modifier);
        });
    }

    //type
    field.setType(tsNode2Type(member.type, sourceFile, field));

    if (cls) {
        cls.addField(field);
    }

    field.genSignature();
}

export function buildGetAccessor2ArkField(member: ts.GetAccessorDeclaration, mthd: ArkMethod, sourceFile: ts.SourceFile) {
    let field = new ArkField();
    field.setCode(member.getText(sourceFile));
    if (ts.isIdentifier(member.name)) {
        field.setName(member.name.text);
    }
    else if (ts.isComputedPropertyName(member.name)) {
        if (ts.isIdentifier(member.name.expression)) {
            let propertyName = member.name.expression.text;
            field.setName(propertyName);
        } else if (ts.isPropertyAccessExpression(member.name.expression)) {
            field.setName(handlePropertyAccessExpression(member.name.expression));
        } else if (ts.isStringLiteral(member.name.expression)) {
            field.setName(member.name.expression.text);
        } else {
            logger.warn("Other type of computed property name found!");
        }
    }
    else {
        logger.warn("Please contact developers to support new type of GetAccessor name!");
        field.setName('');
    }
    let cls = mthd.getDeclaringArkClass();
    field.setFieldType(ts.SyntaxKind[member.kind]);
    field.setOriginPosition(LineColPosition.buildFromNode(member, sourceFile));
    field.setDeclaringClass(cls);
    field.setParameters(mthd.getParameters());
    field.setType(mthd.getReturnType());
    field.setTypeParameters(mthd.getTypeParameter());
    field.setArkMethodSignature(mthd.getSignature());
    field.genSignature();
    cls.addField(field);
}

function buildAnonymousFieldName(arkClass: ArkClass) {
    const fieldName = 'IndexSignature-' + arkClass.getName() + '-' + arkClass.getIndexSignatureNumber();
    return fieldName;
}