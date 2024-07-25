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

import Logger from "../../utils/logger";
import { AbstractExpr, ArkInstanceInvokeExpr, ArkStaticInvokeExpr } from "../base/Expr";
import { Local } from "../base/Local";
import { AbstractRef, ArkArrayRef, ArkInstanceFieldRef, ArkParameterRef, ArkStaticFieldRef } from "../base/Ref";
import { ArkAssignStmt, ArkInvokeStmt, Stmt } from "../base/Stmt";
import {
    AnnotationNamespaceType,
    AnyType,
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
    VoidType
} from "../base/Type";
import { ArkMethod } from "../model/ArkMethod";
import { ClassSignature, MethodSignature, NamespaceSignature } from "../model/ArkSignature";
import { ModelUtils } from "./ModelUtils";
import { TypeSignature } from "../model/ArkExport";
import { ArkClass } from "../model/ArkClass";
import { ArkField } from "../model/ArkField";
import { Value } from "../base/Value";
import { Constant } from "../base/Constant";

const logger = Logger.getLogger();


export class TypeInference {

    public static inferTypeInArkField(arkField: ArkField): void {
        if (arkField.getInitializer()) {
            this.inferValueType(arkField.getInitializer(), arkField.getDeclaringClass());
        }
        const beforeType = arkField.getType();
        let fieldType;
        if (!beforeType && arkField.getFieldType() === 'EnumMember') {
            fieldType = new ClassType(arkField.getDeclaringClass().getSignature());
        } else {
            fieldType = this.inferUnclearedType(beforeType, arkField.getDeclaringClass(), arkField.getInitializer());
        }
        if (fieldType) {
            arkField.setType(fieldType);
            arkField.getSignature().setType(fieldType);
        } else if (this.isUnclearType(beforeType) && !this.isUnclearType(arkField.getInitializer()?.getType())) {
            fieldType = arkField.getInitializer().getType();
            arkField.setType(fieldType);
            arkField.getSignature().setType(fieldType);
        }
    }

    public static inferUnclearedType(leftOpType: Type, declaringArkClass: ArkClass, rightOp?: Value) {
        let type;
        if (leftOpType instanceof UnclearReferenceType) {
            type = this.inferUnclearReferenceType(leftOpType.getName(), declaringArkClass);
        } else if (leftOpType instanceof ClassType
            && leftOpType.getClassSignature().getDeclaringFileSignature().getFileName() === '_UnknownFileName') {
            type = TypeInference.inferUnclearReferenceType(leftOpType.getClassSignature().getClassName(), declaringArkClass);
        } else if (leftOpType instanceof UnionType) {
            let types = leftOpType.getTypes();
            for (let i = 0; i < types.length; i++) {
                let optionType = types[i];
                let newType;
                if (optionType instanceof ClassType) {
                    newType = TypeInference.inferUnclearReferenceType(optionType.getClassSignature().getClassName(), declaringArkClass);
                } else if (optionType instanceof UnclearReferenceType) {
                    newType = TypeInference.inferUnclearReferenceType(optionType.getName(), declaringArkClass);
                }
                if (newType) {
                    types[i] = newType;
                }
                if (rightOp && typeof newType === typeof rightOp.getType()) {
                    leftOpType.setCurrType(rightOp.getType());
                    type = leftOpType;
                }
            }
        } else if (leftOpType instanceof ArrayType && leftOpType.getBaseType() instanceof UnclearReferenceType) {
            let baseType = this.inferUnclearReferenceType((leftOpType.getBaseType() as UnclearReferenceType).getName(), declaringArkClass);
            if (baseType) {
                leftOpType.setBaseType(baseType);
                type = leftOpType;
            }
        } else if (leftOpType instanceof AnnotationNamespaceType) {
            type = this.inferUnclearReferenceType(leftOpType.getOriginType(), declaringArkClass);
        }
        return type;
    }

    public static inferTypeInMethod(arkMethod: ArkMethod): void {
        const body = arkMethod.getBody();
        if (!body) {
            logger.warn('empty body');
            return;
        }
        const cfg = body.getCfg();
        for (const block of cfg.getBlocks()) {
            for (const stmt of block.getStmts()) {
                this.resolveExprsInStmt(stmt, arkMethod);
                this.resolveFieldRefsInStmt(stmt, arkMethod);
                this.resolveArkAssignStmt(stmt, arkMethod);
                stmt.updateText();
            }
        }
        this.inferMethodReturnType(arkMethod);
    }

    /**
     * @Deprecated
     * @param arkMethod
     */
    public static inferSimpleTypeInMethod(arkMethod: ArkMethod): void {
        const body = arkMethod.getBody();
        if (!body) {
            logger.warn('empty body');
            return;
        }
        const cfg = body.getCfg();
        for (const block of cfg.getBlocks()) {
            for (const stmt of block.getStmts()) {
                TypeInference.inferSimpleTypeInStmt(stmt);
            }
        }
    }

    /**
     * infer type for Exprs in stmt which invoke method.
     * such as ArkInstanceInvokeExpr ArkStaticInvokeExpr ArkNewExpr
     */
    private static resolveExprsInStmt(stmt: Stmt, arkMethod: ArkMethod): void {
        const exprs = stmt.getExprs();
        for (const expr of exprs) {
            const newExpr = expr.inferType(arkMethod.getDeclaringArkClass());
            if (stmt.containsInvokeExpr() && expr instanceof ArkInstanceInvokeExpr && newExpr instanceof ArkStaticInvokeExpr) {
                if (stmt instanceof ArkAssignStmt && stmt.getRightOp() instanceof ArkInstanceInvokeExpr) {
                    stmt.setRightOp(newExpr)
                } else if (stmt instanceof ArkInvokeStmt) {
                    stmt.replaceInvokeExpr(newExpr)
                }
            }
        }
    }

    /**
     * infer type for fieldRefs in stmt.
     */
    private static resolveFieldRefsInStmt(stmt: Stmt, arkMethod: ArkMethod): void {
        for (const use of stmt.getUses()) {
            if (use instanceof AbstractRef) {
                const fieldRef = use.inferType(arkMethod.getDeclaringArkClass());
                if (stmt instanceof ArkAssignStmt) {
                    if (stmt.getRightOp() instanceof ArkInstanceFieldRef && fieldRef instanceof ArkStaticFieldRef) {
                        stmt.setRightOp(fieldRef);
                    } else {
                        if (fieldRef instanceof ArkArrayRef && fieldRef.getIndex() instanceof Constant) {
                            const value = (fieldRef.getIndex() as Constant).getValue();
                            const local = arkMethod.getBody()?.getLocals().get(value);
                            if (local) {
                                fieldRef.setIndex(local);
                            }
                        }
                        stmt.replaceUse(use, fieldRef);
                        stmt.setRightOp(stmt.getRightOp());
                    }
                }
            }
        }
        const stmtDef = stmt.getDef();
        if (stmtDef && stmtDef instanceof AbstractRef) {
            const fieldRef = stmtDef.inferType(arkMethod.getDeclaringArkClass());
            if (fieldRef instanceof ArkStaticFieldRef) {
                stmt.setDef(fieldRef);
            }
        }
    }

    public static parseSignature2Type(signature: TypeSignature | undefined): Type | null {
        if (!signature) {
            return null;
        }
        if (signature instanceof ClassSignature) {
            return new ClassType(signature);
        } else if (signature instanceof NamespaceSignature) {
            let namespaceType = new AnnotationNamespaceType(signature.getNamespaceName());
            namespaceType.setNamespaceSignature(signature);
            return namespaceType;
        } else if (signature instanceof MethodSignature) {
            return new CallableType(signature);
        } else {
            if (signature.getType() instanceof UnknownType || signature.getType() instanceof UnclearReferenceType) {
                return null;
            }
            return signature.getType();
        }
    }

    /**
     * infer and pass type for ArkAssignStmt right and left
     * @param stmt
     * @param arkMethod
     */
    public static resolveArkAssignStmt(stmt: Stmt, arkMethod: ArkMethod): void {
        if (!(stmt instanceof ArkAssignStmt)) {
            return;
        }
        const rightOp = stmt.getRightOp();
        const declaringArkClass = arkMethod.getDeclaringArkClass();
        if (rightOp.getType() instanceof UnclearReferenceType) {
            const type = this.inferUnclearReferenceType((rightOp.getType() as UnclearReferenceType).getName(), declaringArkClass);
            if (type && rightOp instanceof ArkParameterRef) {
                rightOp.setType(type);
            }
        }
        const leftOp = stmt.getLeftOp();
        if (leftOp instanceof Local) {
            const leftOpType = leftOp.getType();
            let type = this.inferUnclearedType(leftOpType, declaringArkClass, rightOp);
            if (type) {
                leftOp.setType(type);
            } else if (this.isUnclearType(leftOpType) && !this.isUnclearType(stmt.getRightOp().getType())) {
                leftOp.setType(stmt.getRightOp().getType());
            }
        } else if (leftOp instanceof ArkInstanceFieldRef) {
            const fieldRef = leftOp.inferType(arkMethod.getDeclaringArkClass());
            if (fieldRef instanceof ArkStaticFieldRef) {
                stmt.setLeftOp(fieldRef);
            }
        }
    }

    private static isUnclearType(type: Type | null | undefined) {
        if (!type || type instanceof UnknownType || type instanceof UnclearReferenceType) {
            return true;
        } else if (type instanceof ClassType
            && type.getClassSignature().getDeclaringFileSignature().getFileName() === '_UnknownFileName') {
            return true;
        }
        return false;
    }

    public static inferSimpleTypeInStmt(stmt: Stmt): void {
        if (stmt instanceof ArkAssignStmt) {
            const leftOp = stmt.getLeftOp();
            if (leftOp instanceof Local) {
                const leftOpType = leftOp.getType();
                if (leftOpType instanceof UnknownType) {
                    const rightOp = stmt.getRightOp();
                    leftOp.setType(rightOp.getType());
                }
            }
        }
    }

    // Deal only with simple situations
    public static buildTypeFromStr(typeStr: string): Type {
        switch (typeStr) {
            case 'boolean':
                return BooleanType.getInstance();
            case 'number':
                return NumberType.getInstance();
            case 'string':
                return StringType.getInstance();
            case 'undefined':
                return UndefinedType.getInstance();
            case 'null':
                return NullType.getInstance();
            case 'any':
                return AnyType.getInstance();
            case 'void':
                return VoidType.getInstance();
            case 'never':
                return NeverType.getInstance();
            case 'RegularExpression':
                const classSignature = new ClassSignature();
                classSignature.setClassName('RegExp');
                return new ClassType(classSignature);
            default:
                return new UnclearReferenceType(typeStr);
        }
    }

    public static inferValueType(value: Value, arkClass: ArkClass): Type | null {
        if (value instanceof ArkInstanceFieldRef || value instanceof ArkInstanceInvokeExpr) {
            this.inferValueType(value.getBase(), arkClass);
        }
        if (value instanceof AbstractRef || value instanceof AbstractExpr) {
            value.inferType(arkClass);
        }
        return value.getType();
    }

    public static inferMethodReturnType(method: ArkMethod) {
        if (method.getName() === 'constructor') {
            method.setReturnType(new ClassType(method.getDeclaringArkClass().getSignature()));
            return;
        }
        const returnType = method.getReturnType();
        let inferType;
        if (returnType instanceof UnclearReferenceType) {
            inferType = this.inferUnclearReferenceType(returnType.getName(), method.getDeclaringArkClass());
        }
        if (inferType) {
            method.setReturnType(inferType);
        }
    }

    public static inferUnclearReferenceType(refName: string, arkClass: ArkClass): Type | null {
        const stdName = refName.replace(/<\w+>/, '');
        //import Reference
        const importSignature = ModelUtils.getTypeSignatureInImportInfoWithName(stdName, arkClass.getDeclaringArkFile());
        const importType = this.parseSignature2Type(importSignature);
        if (importType) {
            return importType;
        }
        //split and iterate to infer each type
        const singleNames = stdName.split('.');
        let type = this.inferBaseType(singleNames[0], arkClass);
        for (let i = 1; i < singleNames.length; i++) {
            if (!type) {
                return null;
            }
            type = this.inferFieldType(type, singleNames[i], arkClass);
        }
        return type;
    }

    public static inferFieldType(baseType: Type | null, fieldName: string, declareClass: ArkClass): Type | null {
        let type = null;
        if (!baseType) {
            return null;
        } else if (baseType instanceof ClassType) {
            const signature = baseType.getClassSignature();
            const arkClass = declareClass.getDeclaringArkFile().getScene().getClass(signature);
            let arkField = arkClass?.getFieldWithName(fieldName) ?? arkClass?.getStaticFieldWithName(fieldName);
            if (arkField) {
                type = arkField.getType();
            } else {
                type = this.parseSignature2Type(arkClass?.getDeclaringArkFile().getExportInfoBy(fieldName)?.getTypeSignature());
            }
        } else if (baseType instanceof AnnotationNamespaceType) {
            const signature = baseType.getNamespaceSignature();
            const arkClass = declareClass.getDeclaringArkFile().getScene().getNamespace(signature)?.getClassWithName(fieldName);
            if (arkClass) {
                type = new ClassType(arkClass.getSignature());
            }
        } else {
            logger.warn('infer unclear reference type fail: ' + fieldName);
            return null;
        }
        return type;
    }

    public static inferBaseType(baseName: string, arkClass: ArkClass): Type | null {
        const field = arkClass.getDeclaringArkFile().getDefaultClass().getFieldWithName(baseName);
        if (field) {
            if (field.getType() instanceof UnknownType || field.getType() instanceof UnclearReferenceType) {
                return null;
            }
            return field.getType();
        }
        let signature: TypeSignature | undefined = ModelUtils.getClassWithName(baseName, arkClass)?.getSignature()
            ?? ModelUtils.getNamespaceWithName(baseName, arkClass)?.getSignature()
            ?? ModelUtils.getTypeSignatureInImportInfoWithName(baseName, arkClass.getDeclaringArkFile());
        return this.parseSignature2Type(signature);
    }
}