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

import ts, { HeritageClause, ParameterDeclaration, TypeNode, TypeParameterDeclaration } from "ohos-typescript";
import { AnyType, ArrayType, CallableType, ClassType, LiteralType, NumberType, Type, TypeLiteralType, UnclearReferenceType, UnionType, UnknownType } from "../../base/Type";
import { TypeInference } from "../../common/TypeInference";
import { ArkField } from "../ArkField";
import Logger from "../../../utils/logger";
import { LineColPosition } from "../../base/Position";
import { Value } from "../../base/Value";
import { Constant } from "../../base/Constant";
import { ArkBinopExpr, ArkInstanceInvokeExpr, ArkNewArrayExpr, ArkNewExpr, ArkStaticInvokeExpr, ArkUnopExpr, ArrayLiteralExpr, ObjectLiteralExpr } from "../../base/Expr";
import { ClassSignature, FieldSignature, MethodSignature, MethodSubSignature } from "../ArkSignature";
import { Local } from "../../base/Local";
import { ArkInstanceFieldRef, ArkStaticFieldRef } from "../../base/Ref";
import { ArkClass } from "../ArkClass";
import { ArkMethod } from "../ArkMethod";
import { Decorator } from "../../base/Decorator";
import { buildProperty2ArkField } from "./ArkFieldBuilder";
import { ArrayBindingPatternParameter, MethodParameter, ObjectBindingPatternParameter, buildArkMethodFromArkClass } from "./ArkMethodBuilder";
import { buildNormalArkClassFromArkFile, buildNormalArkClassFromArkMethod, buildNormalArkClassFromArkNamespace } from "./ArkClassBuilder";

const logger = Logger.getLogger();

export function handleQualifiedName(node: ts.QualifiedName): string {
    let right = (node.right as ts.Identifier).text;
    let left: string = '';
    if (ts.SyntaxKind[node.left.kind] == 'Identifier') {
        left = (node.left as ts.Identifier).text;
    }
    else if (ts.SyntaxKind[node.left.kind] == 'QualifiedName') {
        left = handleQualifiedName(node.left as ts.QualifiedName);
    }
    let qualifiedName = left + '.' + right;
    return qualifiedName;
}

export function handlePropertyAccessExpression(node: ts.PropertyAccessExpression): string {
    let right = (node.name as ts.Identifier).text;
    let left: string = '';
    if (ts.SyntaxKind[node.expression.kind] == 'Identifier') {
        left = (node.expression as ts.Identifier).text;
    }
    else if (ts.isStringLiteral(node.expression)) {
        left = node.expression.text;
    }
    else if (ts.isPropertyAccessExpression(node.expression)) {
        left = handlePropertyAccessExpression(node.expression as ts.PropertyAccessExpression);
    }
    let propertyAccessExpressionName = left + '.' + right;
    return propertyAccessExpressionName;
}

export function buildModifiers(node: ts.Node, sourceFile: ts.SourceFile): Set<string | Decorator> {
    let modifiers: Set<string | Decorator> = new Set<string | Decorator>();

    function parseModifier(modifier: ts.ModifierLike) {
        if (ts.SyntaxKind[modifier.kind] == 'FirstContextualKeyword') {
            modifiers.add('AbstractKeyword');
        } else if (ts.isDecorator(modifier)) {
            if (modifier.expression) {
                let kind = "";
                let param = "";
                if (ts.isIdentifier(modifier.expression)) {
                    kind = modifier.expression.text;
                } else if (ts.isCallExpression(modifier.expression)) {
                    if (ts.isIdentifier(modifier.expression.expression)) {
                        kind = modifier.expression.expression.text;
                    }
                    if (modifier.expression.arguments.length > 0) {
                        const arg = (modifier.expression as ts.CallExpression).arguments[0];
                        if (ts.isArrowFunction(arg)) {
                            const body = (arg as ts.ArrowFunction).body;
                            if (ts.isIdentifier(body)) {
                                param = body.text;
                            }
                        }
                    }
                }
                const decorator = new Decorator(kind);
                decorator.setContent(modifier.expression.getText(sourceFile));
                if (param != "") {
                    decorator.setParam(param);
                }
                modifiers.add(decorator);
            }
        } else {
            modifiers.add(ts.SyntaxKind[modifier.kind]);
        }
    }

    if (ts.canHaveModifiers(node)) {
        ts.getModifiers(node)?.forEach(parseModifier);
    }

    ts.getAllDecorators(node).forEach(parseModifier);

    return modifiers;
}

export function buildHeritageClauses(heritageClauses: ts.NodeArray<HeritageClause>): Map<string, string> {
    let heritageClausesMap: Map<string, string> = new Map<string, string>();
    heritageClauses?.forEach((heritageClause) => {
        heritageClause.types.forEach((type) => {
            let heritageClauseName: string = '';
            if (ts.isIdentifier(type.expression)) {
                heritageClauseName = (type.expression as ts.Identifier).text;
            }
            else if (ts.isPropertyAccessExpression(type.expression)) {
                heritageClauseName = handlePropertyAccessExpression(type.expression);
            }
            else {
                logger.warn("Other type expression found!!!");
            }
            heritageClausesMap.set(heritageClauseName, ts.SyntaxKind[heritageClause.token]);
        });
    });
    return heritageClausesMap;
}

export function buildTypeParameters(typeParameters: ts.NodeArray<TypeParameterDeclaration>,
    sourceFile: ts.SourceFile, arkInstance: ArkMethod | ArkClass): Type[] {
    let typeParams: Type[] = [];
    typeParameters.forEach((typeParameter) => {
        tsNode2Type(typeParameter, sourceFile, arkInstance);

        if (typeParameter.modifiers) {
            logger.warn("This typeparameter has modifiers.");
        }

        if (typeParameter.expression) {
            logger.warn("This typeparameter has expression.");
        }
    });
    return typeParams;
}

export function buildParameters(params: ts.NodeArray<ParameterDeclaration>, arkMethod: ArkMethod, sourceFile: ts.SourceFile) {
    let parameters: MethodParameter[] = [];
    params.forEach((parameter) => {
        let methodParameter = new MethodParameter();

        // name
        if (ts.isIdentifier(parameter.name)) {
            methodParameter.setName(parameter.name.text);
        }
        else if (ts.isObjectBindingPattern(parameter.name)) {
            methodParameter.setName("ObjectBindingPattern");
            let elements: ObjectBindingPatternParameter[] = [];
            parameter.name.elements.forEach((element) => {
                let paraElement = new ObjectBindingPatternParameter();
                if (element.propertyName) {
                    if (ts.isIdentifier(element.propertyName)) {
                        paraElement.setPropertyName(element.propertyName.text);
                    }
                    else {
                        logger.warn("New propertyName of ObjectBindingPattern found, please contact developers to support this!");
                    }
                }

                if (element.name) {
                    if (ts.isIdentifier(element.name)) {
                        paraElement.setName(element.name.text);
                    }
                    else {
                        logger.warn("New name of ObjectBindingPattern found, please contact developers to support this!");
                    }
                }

                if (element.initializer) {
                    logger.warn("TODO: support ObjectBindingPattern initializer.");
                }

                if (element.dotDotDotToken) {
                    paraElement.setOptional(true);
                }
                elements.push(paraElement);
            });
            methodParameter.setObjElements(elements);
        }
        else if (ts.isArrayBindingPattern(parameter.name)) {
            methodParameter.setName("ArrayBindingPattern");
            let elements: ArrayBindingPatternParameter[] = [];
            parameter.name.elements.forEach((element) => {
                let paraElement = new ArrayBindingPatternParameter();
                if (ts.isBindingElement(element)) {
                    if (element.propertyName) {
                        if (ts.isIdentifier(element.propertyName)) {
                            paraElement.setPropertyName(element.propertyName.text);
                        }
                        else {
                            logger.warn("New propertyName of ArrayBindingPattern found, please contact developers to support this!");
                        }
                    }

                    if (element.name) {
                        if (ts.isIdentifier(element.name)) {
                            paraElement.setName(element.name.text);
                        }
                        else {
                            logger.warn("New name of ArrayBindingPattern found, please contact developers to support this!");
                        }
                    }

                    if (element.initializer) {
                        logger.warn("TODO: support ArrayBindingPattern initializer.");
                    }

                    if (element.dotDotDotToken) {
                        paraElement.setOptional(true);
                    }
                }
                else if (ts.isOmittedExpression(element)) {
                    logger.warn("TODO: support OmittedExpression for ArrayBindingPattern parameter name.");
                }
                elements.push(paraElement);
            });
            methodParameter.setArrayElements(elements);
        }
        else {
            logger.warn("Parameter name is not identifier, ObjectBindingPattern nor ArrayBindingPattern, please contact developers to support this!");
        }

        // questionToken
        if (parameter.questionToken) {
            methodParameter.setOptional(true);
        }

        // type
        if (parameter.type) {
            methodParameter.setType(tsNode2Type(parameter.type, sourceFile, arkMethod));
        }
        else {
            methodParameter.setType(UnknownType.getInstance());
        }

        // initializer
        if (parameter.initializer) {
            //TODO?
        }

        // dotDotDotToken
        if (parameter.dotDotDotToken) {
            //
        }

        // modifiers
        if (parameter.modifiers) {
            //
        }

        parameters.push(methodParameter);
    });
    return parameters;
}

export function buildReturnType(node: TypeNode, sourceFile: ts.SourceFile, method: ArkMethod) {
    if (node) {
        return tsNode2Type(node, sourceFile, method);
    }
    else {
        return new UnknownType();
    }
}

export function tsNode2Type(typeNode: ts.TypeNode | ts.TypeParameterDeclaration, sourceFile: ts.SourceFile,
    arkInstance: ArkMethod | ArkClass | ArkField) {
    if (ts.isTypeReferenceNode(typeNode)) {
        let referenceNodeName = typeNode.typeName;
        if (ts.isQualifiedName(referenceNodeName)) {
            let parameterTypeStr = handleQualifiedName(referenceNodeName as ts.QualifiedName);
            return new UnclearReferenceType(parameterTypeStr);
        }
        else {
            let parameterTypeStr = referenceNodeName.text;
            return new UnclearReferenceType(parameterTypeStr);
        }
    }
    else if (ts.isUnionTypeNode(typeNode)) {
        let unionTypePara: Type[] = [];
        typeNode.types.forEach((tmpType) => {
            unionTypePara.push(tsNode2Type(tmpType, sourceFile, arkInstance));
        });
        return new UnionType(unionTypePara);
    }
    else if (ts.isLiteralTypeNode(typeNode)) {
        return buildTypeFromPreStr(ts.SyntaxKind[typeNode.literal.kind]);
    }
    else if (ts.isTypeLiteralNode(typeNode)) {
        let cls: ArkClass = new ArkClass();
        let declaringClass: ArkClass;

        if (arkInstance instanceof ArkMethod) {
            declaringClass = arkInstance.getDeclaringArkClass();
        }
        else if (arkInstance instanceof ArkField) {
            declaringClass = arkInstance.getDeclaringClass();
        }
        else {
            declaringClass = arkInstance;
        }
        if (declaringClass.getDeclaringArkNamespace()) {
            cls.setDeclaringArkNamespace(declaringClass.getDeclaringArkNamespace());
            cls.setDeclaringArkFile(declaringClass.getDeclaringArkFile());
        }
        else {
            cls.setDeclaringArkFile(declaringClass.getDeclaringArkFile());
        }
        buildNormalArkClassFromArkMethod(typeNode, cls, sourceFile);

        return new ClassType(cls.getSignature());
    }
    else if (ts.isFunctionTypeNode(typeNode)) {
        let mtd: ArkMethod = new ArkMethod();
        let cls: ArkClass;
        if (arkInstance instanceof ArkMethod) {
            cls = arkInstance.getDeclaringArkClass();
        }
        else if (arkInstance instanceof ArkClass) {
            cls = arkInstance;
        }
        else {
            cls = arkInstance.getDeclaringClass();
        }
        buildArkMethodFromArkClass(typeNode, cls, mtd, sourceFile);
        return new CallableType(mtd.getSignature());
    }
    else {
        return buildTypeFromPreStr(ts.SyntaxKind[typeNode.kind]);
    }
}

export function buildTypeFromPreStr(preStr: string) {
    let postStr = "";
    switch (preStr) {
        case 'BooleanKeyword':
            postStr = "boolean";
            break;
        case 'FalseKeyword':
            postStr = "boolean";
            break;
        case 'TrueKeyword':
            postStr = "boolean";
            break;
        case 'NumberKeyword':
            postStr = "number";
            break;
        case 'NumericLiteral':
            postStr = "number";
            break;
        case 'FirstLiteralToken':
            postStr = "number";
            break;
        case 'StringKeyword':
            postStr = "string";
            break;
        case 'StringLiteral':
            postStr = "string";
            break;
        case 'UndefinedKeyword':
            postStr = "undefined";
            break;
        case 'NullKeyword':
            postStr = "null";
            break;
        case 'AnyKeyword':
            postStr = "any";
            break;
        case 'VoidKeyword':
            postStr = "void";
            break;
        case 'NeverKeyword':
            postStr = "never";
            break;
        default:
            postStr = preStr;
    }
    return TypeInference.buildTypeFromStr(postStr);
}

export function tsNode2Value(node: ts.Node, sourceFile: ts.SourceFile, cls: ArkClass): Value {
    let nodeKind = ts.SyntaxKind[node.kind];
    if (nodeKind == 'NumericLiteral' ||
        nodeKind == 'StringLiteral' ||
        nodeKind == 'TrueKeyword' ||
        nodeKind == 'FalseKeyword' ||
        nodeKind == 'FirstLiteralToken') {
        let type = buildTypeFromPreStr(nodeKind);
        let value = node.getText(sourceFile);
        return new Constant(value, type);
    }
    else if (ts.isNewExpression(node)) {
        if (ts.isIdentifier(node.expression)) {
            let className = node.expression.escapedText.toString();
            let tmpTypes: Type[] = [];
            node.typeArguments?.forEach((type) => {
                tmpTypes.push(buildTypeFromPreStr(ts.SyntaxKind[type.kind]));
            });
            let typeArguments: UnionType = new UnionType(tmpTypes);
            let arrayArguments: Constant[] = [];
            node.arguments?.forEach((argument) => {
                let value = argument.getText(sourceFile);
                let type: Type = AnyType.getInstance();
                if (ts.SyntaxKind[argument.kind] != 'Identifier') {
                    type = buildTypeFromPreStr(ts.SyntaxKind[argument.kind]);
                }
                arrayArguments.push(new Constant(value, type));
            });
            if (className === 'Array') {
                if (arrayArguments.length == 1 && (arrayArguments[0].getType() instanceof NumberType)) {
                    return new ArkNewArrayExpr(typeArguments, arrayArguments[0]);
                }
                else if (arrayArguments.length == 1 && !(arrayArguments[0].getType() instanceof NumberType)) {
                    //TODO, Local number or others
                    logger.warn("TODO, Local number or others.");
                }
                else if (arrayArguments.length > 1) {
                    let newArrayExpr = new ArkNewArrayExpr(typeArguments, new Constant(arrayArguments.length.toString(), NumberType.getInstance()));
                    //TODO: add each value for this array
                    logger.warn("TODO, Local number or others.");
                    return newArrayExpr;
                }
            }
            else {
                let classSignature = new ClassSignature();
                classSignature.setClassName(className);
                const classType = new ClassType(classSignature);
                return new ArkNewExpr(classType);
            }
        }
        else {
            logger.warn("Other newExpr type found for ts node.");
        }

    }
    else if (ts.isArrayLiteralExpression(node)) {
        let elements: Value[] = [];
        node.elements.forEach((element) => {
            let value = tsNode2Value(element, sourceFile, cls);
            if (value == undefined) {
                elements.push(new Constant('', buildTypeFromPreStr('UndefinedKeyword')));
            }
            else {
                elements.push(value);
            }
        });
        let types: Type[] = [];
        elements.forEach((element) => {
            types.push(element.getType());
        });
        let type = new UnionType(types);
        return new ArrayLiteralExpr(elements, type);;
    }
    else if (ts.isBinaryExpression(node)) {
        let leftOp = tsNode2Value(node.left, sourceFile, cls);
        let rightOp = tsNode2Value(node.right, sourceFile, cls);
        let op = ts.tokenToString(node.operatorToken.kind) as string;
        return new ArkBinopExpr(leftOp, rightOp, op);
    }
    else if (ts.isPrefixUnaryExpression(node)) {
        let op = ts.SyntaxKind[node.operator];
        let value = tsNode2Value(node.operand, sourceFile, cls);
        return new ArkUnopExpr(value, op);
    }
    else if (ts.isIdentifier(node)) {
        let name = node.escapedText.toString();
        return new Local(name);
    }
    else if (ts.isPropertyAccessExpression(node)) {
        let fieldName = node.name.escapedText.toString();
        const fieldSignature = new FieldSignature();
        fieldSignature.setFieldName(fieldName);
        let base = tsNode2Value(node.expression, sourceFile, cls);
        //TODO: support question token?
        return new ArkInstanceFieldRef(base as Local, fieldSignature);
    }
    else if (ts.isCallExpression(node)) {
        let exprValue = tsNode2Value(node.expression, sourceFile, cls);
        let argumentParas: Value[] = [];
        node.arguments.forEach((argument) => {
            argumentParas.push(tsNode2Value(argument, sourceFile, cls));
        });
        //TODO: support typeArguments

        let classSignature = new ClassSignature();
        let methodSubSignature = new MethodSubSignature();
        let methodSignature = new MethodSignature();
        methodSignature.setDeclaringClassSignature(classSignature);
        methodSignature.setMethodSubSignature(methodSubSignature);

        if (exprValue instanceof ArkInstanceFieldRef) {
            let methodName = exprValue.getFieldName();
            let base = exprValue.getBase()
            methodSubSignature.setMethodName(methodName);
            return new ArkInstanceInvokeExpr(base, methodSignature, argumentParas);
        } else if (exprValue instanceof ArkStaticFieldRef) {
            methodSubSignature.setMethodName(exprValue.getFieldName());
            return new ArkStaticInvokeExpr(methodSignature, argumentParas);
        } else {
            methodSubSignature.setMethodName(node.getText(sourceFile));
            return new ArkStaticInvokeExpr(methodSignature, argumentParas);
        }
    }
    else if (ts.isObjectLiteralExpression(node)) {
        const declaringArkNamespace = cls.getDeclaringArkNamespace();
        const declaringArkFile = cls.getDeclaringArkFile();
        let arkClass: ArkClass = new ArkClass();
        if (declaringArkNamespace) {
            buildNormalArkClassFromArkNamespace(node, declaringArkNamespace, arkClass, sourceFile);
            declaringArkNamespace.addArkClass(arkClass);
        }
        else {
            buildNormalArkClassFromArkFile(node, declaringArkFile, arkClass, sourceFile);
            declaringArkFile.addArkClass(arkClass);
        }
        let classSig = arkClass.getSignature();
        const classType = new ClassType(classSig);
        return new ObjectLiteralExpr(arkClass, classType);
    }
    else {
        logger.warn("Other type found for ts node.");
    }
    return new Constant('', UnknownType.getInstance())
}
function buildTypeLiteralNode2ArkClassBak(typeNode: ts.TypeLiteralNode) {
    throw new Error("Function not implemented.");
}

