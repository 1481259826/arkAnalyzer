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
import { ArkBinopExpr, ArkInstanceInvokeExpr, ArkStaticInvokeExpr } from "../base/Expr";
import { Local } from "../base/Local";
import { AbstractFieldRef, ArkInstanceFieldRef, ArkParameterRef, ArkStaticFieldRef } from "../base/Ref";
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

const logger = Logger.getLogger();


export class TypeInference {

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
    }

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
            const newExpr = expr.inferType(arkMethod);
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
            if (!(use instanceof ArkInstanceFieldRef)) {
                continue;
            }
            const fieldRef = this.handleClassField(use, arkMethod);
            if (stmt instanceof ArkAssignStmt && fieldRef instanceof ArkStaticFieldRef) {
                if (stmt.getRightOp() instanceof ArkInstanceFieldRef) {
                    stmt.setRightOp(fieldRef);
                } else {
                    stmt.replaceUse(use, fieldRef);
                    stmt.setRightOp(stmt.getRightOp());
                }
            }
        }
        const stmtDef = stmt.getDef();
        if (stmtDef && stmtDef instanceof ArkInstanceFieldRef) {
            const fieldRef = this.handleClassField(stmtDef, arkMethod);
            if (fieldRef instanceof ArkStaticFieldRef) {
                stmt.setDef(fieldRef);
            }
        }
    }

    private static inferArkFieldType(arkField: ArkField, arkMethod: ArkMethod): Type | null {
        let fieldType = arkField.getType();
        if (!fieldType && arkField.getFieldType() === 'EnumMember') {
            fieldType = new ClassType(arkField.getDeclaringClass().getSignature());
            arkField.setType(fieldType);
            arkField.getSignature().setType(fieldType);
        } else if (fieldType instanceof UnclearReferenceType) {
            const inferType = this.inferUnclearReferenceType(fieldType.getName(), arkMethod);
            if (inferType) {
                arkField.setType(inferType);
                arkField.getSignature().setType(inferType);
            }
        }
        fieldType = arkField.getType();
        if (fieldType instanceof UnknownType || fieldType instanceof UnclearReferenceType) {
            return null;
        }
        return arkField.getType();
    }

    private static handleClassField(field: ArkInstanceFieldRef, arkMethod: ArkMethod): AbstractFieldRef {
        const base = field.getBase();
        if (!(base instanceof Local)) {
            logger.warn("field ref base is not local." + field.toString());
            return field;
        }
        let baseType: Type | null = base.getType();
        if (baseType instanceof UnknownType) {
            baseType = this.inferBaseType(base.getName(), arkMethod);
        } else if (baseType instanceof UnclearReferenceType) {
            baseType = this.inferUnclearReferenceType(baseType.getName(), arkMethod);
        }
        if (!baseType) {
            logger.warn('infer field ref base type fail: ' + field.toString());
            return field;
        }
        base.setType(baseType);
        const fieldType = this.inferFieldType(baseType, field.getFieldName(), arkMethod);
        if (fieldType) {
            field.getFieldSignature().setType(fieldType);
        }
        if (baseType instanceof ClassType) {
            field.getFieldSignature().setDeclaringSignature(baseType.getClassSignature());
            if (arkMethod.getDeclaringArkFile().getScene().getClass(baseType.getClassSignature())
                ?.getStaticFieldWithName(field.getFieldName())) {
                return new ArkStaticFieldRef(field.getFieldSignature());
            }
            return field;
        } else if (baseType instanceof AnnotationNamespaceType) {
            field.getFieldSignature().setDeclaringSignature(baseType.getNamespaceSignature());
            return field;
        }
        logger.warn('infer field ref FieldSignature type fail: ' + field.toString());
        return field;
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
        if (rightOp.getType() instanceof UnclearReferenceType) {
            const type = this.inferUnclearReferenceType((rightOp.getType() as UnclearReferenceType).getName(), arkMethod);
            if (type && rightOp instanceof ArkParameterRef) {
                rightOp.setType(type);
            }
        }
        const leftOp = stmt.getLeftOp();
        if (leftOp instanceof Local) {
            if (leftOp.getType() instanceof UnknownType
                && !(stmt.getRightOp().getType() instanceof UnknownType || stmt.getRightOp().getType() instanceof UnclearReferenceType)) {
                leftOp.setType(stmt.getRightOp().getType());
                return;
            }
            const leftOpType = leftOp.getType();
            let type;
            if (leftOpType instanceof AnnotationNamespaceType) {
                type = this.inferUnclearReferenceType(leftOpType.getOriginType(), arkMethod);
            } else if (leftOpType instanceof UnionType) {
                for (const e of leftOpType.getTypes()) {
                    if (typeof e === typeof rightOp.getType()) {
                        leftOpType.setCurrType(rightOp.getType());
                        break;
                    }
                }
            } else if (leftOpType instanceof UnclearReferenceType) {
                type = this.inferUnclearReferenceType(leftOpType.getName(), arkMethod);
            } else if (leftOpType instanceof ArrayType && leftOpType.getBaseType() instanceof UnclearReferenceType) {
                let baseType = this.inferUnclearReferenceType((leftOpType.getBaseType() as UnclearReferenceType).getName(), arkMethod);
                if (baseType) {
                    leftOpType.setBaseType(baseType);
                }
            }
            if (type) {
                leftOp.setType(type);
            }
        } else if (leftOp instanceof ArkInstanceFieldRef) {
            const fieldRef = this.handleClassField(leftOp, arkMethod);
            if (fieldRef instanceof ArkStaticFieldRef) {
                stmt.setLeftOp(fieldRef);
            }
        }

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

    public static inferTypeOfBinopExpr(binopExpr: ArkBinopExpr): Type {
        const operator = binopExpr.getOperator();
        let op1Type = binopExpr.getOp1().getType();
        let op2Type = binopExpr.getOp2().getType();
        if (op1Type instanceof UnionType) {
            op1Type = op1Type.getCurrType();
        }
        if (op2Type instanceof UnionType) {
            op2Type = op2Type.getCurrType();
        }
        switch (operator) {
            case "+":
                if (op1Type === StringType.getInstance() || op2Type === StringType.getInstance()) {
                    return StringType.getInstance();
                }
                if (op1Type === NumberType.getInstance() && op2Type === NumberType.getInstance()) {
                    return NumberType.getInstance();
                }
                break;
            case "-":
            case "*":
            case "/":
            case "%":
                if (op1Type === NumberType.getInstance() && op2Type === NumberType.getInstance()) {
                    return NumberType.getInstance();
                }
                break;
            case "<":
            case "<=":
            case ">":
            case ">=":
            case "==":
            case "!=":
            case "===":
            case "!==":
            case "&&":
            case "||":
                return BooleanType.getInstance();
            case "&":
            case "|":
            case "^":
            case "<<":
            case ">>":
            case ">>>":
                if (op1Type === NumberType.getInstance() && op2Type === NumberType.getInstance()) {
                    return NumberType.getInstance();
                }
                break;
        }
        return UnknownType.getInstance();
    }

    public static inferMethodReturnType(method: ArkMethod) {
        let methodReturnType = method.getReturnType()
        if (methodReturnType instanceof UnclearReferenceType) {
            this.inferUnclearReferenceType(methodReturnType.getName(), method);
        }
    }

    public static getClass(method: ArkMethod, signature: ClassSignature): ArkClass | null {
        let cls = method.getDeclaringArkFile().getScene().getClass(signature);
        if (cls) {
            return cls;
        }

        let exportInfo = method.getDeclaringArkFile().getImportInfoBy(signature.getClassName())?.getLazyExportInfo();
        let typeSignature = exportInfo?.getTypeSignature();
        if (typeSignature instanceof ClassSignature) {
            let cls = method.getDeclaringArkFile().getScene().getClass(typeSignature);
            if (cls) {
                return cls;
            }
        }

        cls = method.getDeclaringArkClass().getDeclaringArkNamespace()?.getClassWithName(signature.getClassName());
        if (cls) {
            return cls;
        }

        for (const ns of method.getDeclaringArkFile().getAllNamespacesUnderThisFile()) {
            cls = ns.getClassWithName(signature.getClassName());
            if (cls) {
                return cls;
            }
        }

        return method.getDeclaringArkFile().getClassWithName(signature.getClassName());
    }

    public static inferUnclearReferenceType(refName: string, arkMethod: ArkMethod): Type | null {
        const singleNames = refName.replace(/<\w+>/, '').split('.');
        let type = this.inferBaseType(singleNames[0], arkMethod);
        for (let i = 1; i < singleNames.length; i++) {
            if (!type) {
                return null;
            }
            type = this.inferFieldType(type, singleNames[i], arkMethod);
        }
        return type;
    }

    private static inferFieldType(baseType: Type | null, fieldName: string, arkMethod: ArkMethod): Type | null {
        let type = null;
        if (!baseType) {
            return null;
        } else if (baseType instanceof ClassType) {
            const signature = baseType.getClassSignature();
            const arkClass = arkMethod.getDeclaringArkFile().getScene().getClass(signature);
            let arkField = arkClass?.getFieldWithName(fieldName) ?? arkClass?.getStaticFieldWithName(fieldName);
            if (arkField) {
                type = this.inferArkFieldType(arkField, arkMethod);
            } else {
                type = this.parseSignature2Type(arkClass?.getDeclaringArkFile().getExportInfoBy(fieldName)?.getTypeSignature());
            }
        } else if (baseType instanceof AnnotationNamespaceType) {
            const signature = baseType.getNamespaceSignature();
            const arkClass = arkMethod.getDeclaringArkFile().getScene().getNamespace(signature)?.getClassWithName(fieldName);
            if (arkClass) {
                type = new ClassType(arkClass.getSignature());
            }
        } else {
            logger.warn('infer unclear reference type fail: ' + fieldName);
            return null;
        }
        return type;
    }

    public static inferBaseType(baseName: string, arkMethod: ArkMethod): Type | null {
        const field = arkMethod.getDeclaringArkFile().getDefaultClass().getFieldWithName(baseName);
        if (field) {
            if (field.getType() instanceof UnknownType || field.getType() instanceof UnclearReferenceType) {
                return null;
            }
            return field.getType();
        }
        let signature: TypeSignature | undefined = ModelUtils.getClassWithName(baseName, arkMethod)?.getSignature()
            ?? ModelUtils.getNamespaceWithName(baseName, arkMethod)?.getSignature()
            ?? ModelUtils.getTypeSignatureInImportInfoWithName(baseName, arkMethod.getDeclaringArkFile());
        return this.parseSignature2Type(signature);
    }
}