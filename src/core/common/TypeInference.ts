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
import { AbstractInvokeExpr, ArkBinopExpr, ArkInstanceInvokeExpr, ArkStaticInvokeExpr } from "../base/Expr";
import { Local } from "../base/Local";
import { AbstractFieldRef, ArkInstanceFieldRef, ArkParameterRef, ArkStaticFieldRef } from "../base/Ref";
import { ArkAssignStmt, ArkInvokeStmt, Stmt } from "../base/Stmt";
import {
    AnnotationNamespaceType,
    AnnotationType,
    AnyType,
    ArrayType,
    BooleanType,
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
import { ClassSignature } from "../model/ArkSignature";
import { ModelUtils } from "./ModelUtils";
import { ArkField } from '../model/ArkField';
import { ArkClass } from '../model/ArkClass';

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
        const exprs = stmt.getExprs();
        for (const expr of exprs) {
            const newExpr = expr.inferType(arkMethod);
            if (expr instanceof ArkInstanceInvokeExpr && newExpr instanceof ArkStaticInvokeExpr) {
                if (stmt.containsInvokeExpr()) {
                    if (stmt instanceof ArkAssignStmt && stmt.getRightOp() instanceof ArkInstanceInvokeExpr) {
                        stmt.setRightOp(newExpr)
                    } else if (stmt instanceof ArkInvokeStmt) {
                        stmt.replaceInvokeExpr(newExpr)
                    }
                    stmt.setText(stmt.toString().replace(/^instanceInvoke/, "staticinvoke"))
                }
            }
            if (newExpr instanceof AbstractInvokeExpr && stmt instanceof ArkAssignStmt) {
                const leftOp = stmt.getLeftOp()
                if (leftOp instanceof Local) {
                    leftOp.setType(newExpr.getMethodSignature().getMethodSubSignature().getReturnType());
                }
            }
        }

        for (const use of stmt.getUses()) {
            if (use instanceof ArkInstanceFieldRef) {
                let fieldType = this.handleClassField(use, arkMethod);
                if (stmt instanceof ArkAssignStmt && stmt.getLeftOp() instanceof Local && fieldType != undefined) {
                    if (stmt.getRightOp() instanceof ArkInstanceFieldRef) {
                        if (fieldType instanceof ArkField) {
                            if (fieldType.getModifiers().has("StaticKeyword")) {
                                stmt.setRightOp(new ArkStaticFieldRef(fieldType.getSignature()))
                            } else {
                                stmt.setRightOp(new ArkInstanceFieldRef(use.getBase(), fieldType.getSignature()));
                            }
                            (stmt.getLeftOp() as Local).setType(fieldType.getType())
                        } else if (fieldType instanceof ArkClass) {
                            (stmt.getLeftOp() as Local).setType(fieldType.getSignature())
                        }
                    } else {
                        if (fieldType instanceof ArkField) {
                            if (fieldType.getModifiers().has("StaticKeyword")) {
                                stmt.replaceUse(use, new ArkStaticFieldRef(fieldType.getSignature()));
                                stmt.setRightOp(stmt.getRightOp());
                            } else {
                                use.setFieldSignature(fieldType.getSignature());
                            }
                        }
                        (stmt.getLeftOp() as Local).setType(stmt.getRightOp().getType());
                    }

                }
            }
        }
        const stmtDef = stmt.getDef()
        if (stmtDef && stmtDef instanceof ArkInstanceFieldRef) {
            let fieldType = this.handleClassField(stmtDef, arkMethod);
            if (fieldType instanceof ArkField) {
                let fieldRef: AbstractFieldRef
                if (fieldType.getModifiers().has("StaticKeyword")) {
                    fieldRef = new ArkStaticFieldRef(fieldType.getSignature())
                } else {
                    fieldRef = new ArkInstanceFieldRef(stmtDef.getBase(), fieldType.getSignature())
                }
                stmt.setDef(fieldRef)
                if (stmt instanceof ArkAssignStmt) {
                    // not sure
                    stmt.setLeftOp(fieldRef)
                }
            } else if (fieldType instanceof ArkClass) {
                // nothing to do?
            }
        }
    }

    private static handleClassField(field: ArkInstanceFieldRef, arkMethod: ArkMethod): ArkClass | ArkField | null {
        const base = field.getBase()
        if (!(base instanceof Local)) {
            logger.warn("field ref base is not local")
            return null
        }
        const baseName = base.getName()
        const type = base.getType();
        const fieldName = field.getFieldName();
        let arkClass
        if (!(type instanceof ClassType)) {
            const typeSi = ModelUtils.getTypeSignatureInImportInfoWithName(baseName, arkMethod.getDeclaringArkFile());
            if (typeSi instanceof ClassSignature) {
                arkClass = arkMethod.getDeclaringArkFile().getScene().getClass(typeSi);
            }
        } else {
            arkClass = arkMethod.getDeclaringArkFile().getScene().getClass(type.getClassSignature());
        }
        if (!arkClass) {
            logger.warn(`class ${baseName} does not exist`);
            return null;
        }
        field.getFieldSignature().setDeclaringClassSignature(arkClass.getSignature());
        let arkField = arkClass.getFieldWithName(fieldName) ?? arkClass.getStaticFieldWithName(fieldName);
        if (arkField == null) {
            const tsField = arkClass.getDeclaringArkFile().getExportInfoBy(fieldName);
            if (tsField && tsField.getTypeSignature() instanceof ClassSignature) {
                field.getFieldSignature().setType(new ClassType(tsField.getTypeSignature() as ClassSignature));
            }
        } else {
            let fieldType = arkField.getType();
            if (fieldType instanceof UnclearReferenceType) {
                const fieldTypeName = fieldType.getName();
                const signature = ModelUtils.getClassWithName(fieldTypeName, arkMethod)?.getSignature()
                    ?? ModelUtils.getTypeSignatureInImportInfoWithName(fieldTypeName, arkMethod.getDeclaringArkFile());
                if (signature instanceof ClassSignature) {
                    fieldType = new ClassType(signature);
                }
                arkField.setType(fieldType);
            }
        }
        return arkField;
    }

    public static inferTypeInStmt(stmt: Stmt, arkMethod: ArkMethod): void {
        if (stmt instanceof ArkAssignStmt) {
            const leftOp = stmt.getLeftOp();
            if (leftOp instanceof Local) {
                const leftOpType = leftOp.getType();
                if (leftOpType instanceof AnnotationType) {
                    if (arkMethod === null) {
                        return
                    }
                    let leftOpTypeString = leftOpType.getOriginType()
                    if (leftOpType instanceof AnnotationNamespaceType) {
                        let classSignature = ModelUtils.getClassWithName(leftOpTypeString, arkMethod)?.getSignature()
                            ?? ModelUtils.getTypeSignatureInImportInfoWithName(leftOpTypeString, arkMethod.getDeclaringArkFile());
                        if (classSignature === undefined) {
                            leftOp.setType(stmt.getRightOp().getType());
                        } else if (classSignature instanceof ClassSignature) {
                            leftOp.setType(new ClassType(classSignature));
                        }
                    }
                } else if (leftOpType instanceof UnknownType) {
                    const rightOp = stmt.getRightOp();
                    if (rightOp instanceof ArkParameterRef) {
                        let rightOpType = rightOp.getType()
                        if (rightOpType instanceof UnclearReferenceType) {
                            if (arkMethod == null)
                                return
                            let classSignature = ModelUtils.getClassWithName(rightOpType.getName(), arkMethod)?.getSignature()
                                ?? ModelUtils.getTypeSignatureInImportInfoWithName(rightOpType.getName(), arkMethod.getDeclaringArkFile());
                            if (classSignature === undefined) {
                                leftOp.setType(stmt.getRightOp().getType());
                            } else if (classSignature instanceof ClassSignature) {
                                leftOp.setType(new ClassType(classSignature));
                            }
                        } else {
                            leftOp.setType(rightOpType)
                        }
                    } else {
                        leftOp.setType(rightOp.getType());
                    }
                } else if (leftOpType instanceof UnionType) {
                    const rightOp = stmt.getRightOp();
                    leftOpType.setCurrType(rightOp.getType());
                } else if (leftOpType instanceof UnclearReferenceType) {
                    if (stmt.containsInvokeExpr()) {
                    }
                } else if (leftOpType instanceof ArrayType) {
                    if (leftOpType.getBaseType() instanceof UnclearReferenceType) {
                        const baseType = leftOpType.getBaseType() as UnclearReferenceType;
                        const itemClass = ModelUtils.getClassWithName(baseType.getName(), arkMethod);
                        if (itemClass) {
                            leftOpType.setBaseType(new ClassType(itemClass.getSignature()));
                        } else {
                            const signature = ModelUtils.getTypeSignatureInImportInfoWithName(baseType.getName(), arkMethod.getDeclaringArkFile());
                            if (signature && signature instanceof ClassSignature) {
                                leftOpType.setBaseType(new ClassType(signature));
                            }
                        }
                    }
                }
            } else if (leftOp instanceof ArkInstanceFieldRef) {
                // 对应赋值语句左值进行了取属性操作
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
}