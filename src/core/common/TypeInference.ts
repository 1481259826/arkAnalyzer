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
                this.resolveSymbolInStmt(stmt, arkMethod);
                TypeInference.inferTypeInStmt(stmt, arkMethod);
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

    /** resolve symbol that is uncertain when build stmts, such as class' name and function's name */
    private static resolveSymbolInStmt(stmt: Stmt, arkMethod: ArkMethod): void {
        //method
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
        //field
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
        const stmtDef = stmt.getDef()
        if (stmtDef && stmtDef instanceof ArkInstanceFieldRef) {
            const fieldRef = this.handleClassField(stmtDef, arkMethod);
            if (fieldRef instanceof ArkStaticFieldRef) {
                stmt.setDef(fieldRef);
            }
        }
    }

    private static handleClassField(field: ArkInstanceFieldRef, arkMethod: ArkMethod): AbstractFieldRef {
        const base = field.getBase();
        if (!(base instanceof Local)) {
            logger.warn("field ref base is not local");
            return field;
        }
        //infer base type
        if (base.getType() instanceof UnknownType) {
            const type = TypeInference.inferBaseType(base.getName(), arkMethod);
            if (type) {
                base.setType(type);
            }
        }
        const fieldName = field.getFieldName();
        let inferType;
        const baseType = base.getType();
        if (baseType instanceof ClassType) {
            const signature = baseType.getClassSignature();
            field.getFieldSignature().setDeclaringSignature(signature);
            const arkClass = arkMethod.getDeclaringArkFile().getScene().getClass(signature);
            let arkField = arkClass?.getFieldWithName(fieldName) ?? arkClass?.getStaticFieldWithName(fieldName);
            if (arkField) {
                if (!arkField.getType() && arkField.getFieldType() === 'EnumMember') {
                    arkField.setType(baseType);
                    arkField.getSignature().setType(baseType);
                    inferType = baseType;
                } else if (arkField.getType() instanceof UnclearReferenceType) {
                    inferType = this.inferUnclearReferenceType((arkField.getType() as UnclearReferenceType).getName(), arkMethod);
                    if (inferType) {
                        arkField.setType(inferType);
                        arkField.getSignature().setType(inferType);
                    }
                } else {
                    inferType = arkField.getType();
                }
                if (inferType && !(inferType instanceof UnknownType)) {
                    field.getFieldSignature().setType(inferType);
                    if (arkField.getSignature().isStatic()) {
                        return new ArkStaticFieldRef(arkField.getSignature());
                    }
                    return field;
                }
                logger.warn('infer field type fail: ' + field.toString());
                return field;
            }
            inferType = this.parseSignature2Type(arkClass?.getDeclaringArkFile().getExportInfoBy(fieldName)?.getTypeSignature());
        } else if (baseType instanceof AnnotationNamespaceType) {
            const signature = baseType.getNamespaceSignature();
            field.getFieldSignature().setDeclaringSignature(signature);
            const arkClass = arkMethod.getDeclaringArkFile().getScene().getNamespace(signature)?.getClassWithName(fieldName);
            if (arkClass) {
                inferType = new ClassType(arkClass.getSignature());
            }
        }
        //infer field type
        if (inferType) {
            field.getFieldSignature().setType(inferType);
        } else {
            logger.warn('infer field type fail: ' + field.toString());
        }
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
            return signature.getType();
        }
    }

    /**
     * pass ArkAssignStmt right type to left
     * @param stmt
     * @param arkMethod
     */
    public static inferTypeInStmt(stmt: Stmt, arkMethod: ArkMethod): void {
        if (!(stmt instanceof ArkAssignStmt)) {
            return;
        }
        //从右到左
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
            let returnInstance = ModelUtils.getClassWithName(
                methodReturnType.getName(),
                method);
            if (returnInstance == null) {
                logger.warn("can not get method return value type: " +
                    method.getSignature().toString() + ": " + methodReturnType.getName());
            } else {
                method.setReturnType(new ClassType(returnInstance.getSignature()));
            }
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

    private static inferUnclearReferenceType(refName: string, arkMethod: ArkMethod) {
        let signature = ModelUtils.getClassWithName(refName, arkMethod)?.getSignature()
            ?? ModelUtils.getTypeSignatureInImportInfoWithName(refName, arkMethod.getDeclaringArkFile());
        return this.parseSignature2Type(signature);
    }

    public static inferBaseType(baseName: string, arkMethod: ArkMethod) {
        const field = arkMethod.getDeclaringArkFile().getDefaultClass().getFieldWithName(baseName);
        if (field) {
            return field.getType();
        }
        let signature: TypeSignature | undefined = ModelUtils.getClassWithName(baseName, arkMethod)?.getSignature()
            ?? ModelUtils.getNamespaceWithName(baseName, arkMethod)?.getSignature()
            ?? ModelUtils.getTypeSignatureInImportInfoWithName(baseName, arkMethod.getDeclaringArkFile());
        return this.parseSignature2Type(signature);
    }
}