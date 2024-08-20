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

import Logger from '../../utils/logger';
import { AbstractExpr, ArkInstanceInvokeExpr, ArkStaticInvokeExpr } from '../base/Expr';
import { Local } from '../base/Local';
import { AbstractRef, ArkArrayRef, ArkInstanceFieldRef, ArkParameterRef, ArkStaticFieldRef } from '../base/Ref';
import { ArkAssignStmt, ArkInvokeStmt, Stmt } from '../base/Stmt';
import {
    AliasType,
    AnnotationNamespaceType,
    AnyType,
    ArrayType,
    BooleanType,
    ClassType,
    FunctionType,
    NeverType,
    NullType,
    NumberType,
    StringType,
    Type,
    UnclearReferenceType,
    UndefinedType,
    UnionType,
    UnknownType,
    VoidType,
} from '../base/Type';
import { ArkMethod } from '../model/ArkMethod';
import { ClassSignature } from '../model/ArkSignature';
import { ModelUtils } from './ModelUtils';
import { ArkExport } from '../model/ArkExport';
import { ArkClass } from '../model/ArkClass';
import { ArkField } from '../model/ArkField';
import { Value } from '../base/Value';
import { Constant } from '../base/Constant';
import { ArkNamespace } from '../model/ArkNamespace';

const logger = Logger.getLogger();


export class TypeInference {

    public static inferTypeInArkField(arkField: ArkField): void {
        const arkClass = arkField.getDeclaringClass();
        const stmts = arkField.getInitializer();
        let rightType: Type | undefined;
        if (stmts) {
            for (const stmt of stmts) {
                this.resolveExprsInStmt(stmt, arkClass);
                this.resolveFieldRefsInStmt(stmt, arkClass);
                this.resolveArkAssignStmt(stmt, arkClass);
                stmt.updateText();
            }
            const lastStmt = stmts[stmts.length - 1];
            if (lastStmt instanceof ArkAssignStmt) {
                rightType = lastStmt.getLeftOp().getType();
            } else if (lastStmt instanceof ArkInvokeStmt) {
                rightType = lastStmt.getInvokeExpr().getType();
            }
        }

        const beforeType = arkField.getType();
        let fieldType;
        if (arkField.getFieldType() === 'EnumMember') {
            fieldType = new ClassType(arkClass.getSignature());
        } else if (beforeType) {
            fieldType = this.inferUnclearedType(beforeType, arkClass, rightType);
        }
        if (fieldType) {
            arkField.setType(fieldType);
            arkField.getSignature().setType(fieldType);
        } else if (rightType && this.isUnclearType(beforeType) && !this.isUnclearType(rightType)) {
            arkField.setType(rightType);
            arkField.getSignature().setType(rightType);
        }
    }

    public static inferUnclearedType(leftOpType: Type, declaringArkClass: ArkClass, rightType?: Type) {
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
                } else {
                    newType = optionType;
                }
                if (newType && newType != optionType) {
                    types[i] = newType;
                }
                if (rightType && newType && newType === rightType) {
                    leftOpType.setCurrType(rightType);
                    type = leftOpType;
                }
            }
        } else if (leftOpType instanceof ArrayType) {
            let baseType = this.inferUnclearedType(leftOpType.getBaseType(), declaringArkClass);
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

        const arkClass = arkMethod.getDeclaringArkClass();
        body.getAliasTypeMap()?.forEach((value, key) => {
            const newType = this.inferUnclearedType(value, arkClass);
            if (newType) {
                body.getAliasTypeMap().set(key, newType);
            }
        });
        const cfg = body.getCfg();
        for (const block of cfg.getBlocks()) {
            for (const stmt of block.getStmts()) {
                this.resolveExprsInStmt(stmt, arkClass);
                this.resolveFieldRefsInStmt(stmt, arkClass, arkMethod);
                this.resolveArkAssignStmt(stmt, arkClass);
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
    private static resolveExprsInStmt(stmt: Stmt, arkClass: ArkClass): void {
        const exprs = stmt.getExprs();
        for (const expr of exprs) {
            const newExpr = expr.inferType(arkClass);
            if (stmt.containsInvokeExpr() && expr instanceof ArkInstanceInvokeExpr && newExpr instanceof ArkStaticInvokeExpr) {
                if (stmt instanceof ArkAssignStmt && stmt.getRightOp() instanceof ArkInstanceInvokeExpr) {
                    stmt.setRightOp(newExpr);
                } else if (stmt instanceof ArkInvokeStmt) {
                    stmt.replaceInvokeExpr(newExpr);
                }
            }
        }
    }

    /**
     * infer type for fieldRefs in stmt.
     */
    private static resolveFieldRefsInStmt(stmt: Stmt, arkClass: ArkClass, arkMethod?: ArkMethod): void {
        for (const use of stmt.getUses()) {
            if (use instanceof AbstractRef) {
                const fieldRef = use.inferType(arkClass);
                if (fieldRef instanceof ArkStaticFieldRef && stmt instanceof ArkAssignStmt) {
                    if (stmt.getRightOp() instanceof ArkInstanceFieldRef) {
                        stmt.setRightOp(fieldRef);
                    } else {
                        stmt.replaceUse(use, fieldRef);
                        stmt.setRightOp(stmt.getRightOp());
                    }
                } else if (use instanceof ArkInstanceFieldRef && fieldRef instanceof ArkArrayRef && stmt instanceof ArkAssignStmt) {
                    const index = fieldRef.getIndex();
                    if (index instanceof Constant && index.getType() instanceof StringType) {
                        const local = arkMethod?.getBody()?.getLocals().get(index.getValue());
                        if (local) {
                            fieldRef.setIndex(local);
                        }
                    }
                    stmt.replaceUse(use, fieldRef);
                    stmt.setRightOp(stmt.getRightOp());
                }
            }
        }
        const stmtDef = stmt.getDef();
        if (stmtDef && stmtDef instanceof AbstractRef) {
            const fieldRef = stmtDef.inferType(arkClass);
            if (fieldRef instanceof ArkStaticFieldRef && stmt instanceof ArkAssignStmt) {
                stmt.setLeftOp(fieldRef);
            }
        }
    }

    public static parseArkExport2Type(arkExport: ArkExport | undefined): Type | null {
        if (!arkExport) {
            return null;
        }
        if (arkExport instanceof ArkClass) {
            return new ClassType(arkExport.getSignature());
        } else if (arkExport instanceof ArkNamespace) {
            let namespaceType = new AnnotationNamespaceType(arkExport.getName());
            namespaceType.setNamespaceSignature(arkExport.getSignature());
            return namespaceType;
        } else if (arkExport instanceof ArkMethod) {
            return new FunctionType(arkExport.getSignature());
        } else if (arkExport instanceof Local) {
            if (arkExport.getType() instanceof UnknownType || arkExport.getType() instanceof UnclearReferenceType) {
                return null;
            }
            return arkExport.getType();
        } else if (arkExport instanceof AliasType) {
            return arkExport;
        } else {
            return null;
        }
    }

    /**
     * infer and pass type for ArkAssignStmt right and left
     * @param stmt
     * @param arkClass
     */
    public static resolveArkAssignStmt(stmt: Stmt, arkClass: ArkClass): void {
        if (!(stmt instanceof ArkAssignStmt)) {
            return;
        }
        const rightOp = stmt.getRightOp();
        if (rightOp instanceof Local && rightOp.getType() instanceof UnknownType) {
            const type = this.inferUnclearReferenceType(rightOp.getName(), arkClass);
            if (type) {
                rightOp.setType(type);
            }
        } else if (rightOp.getType() instanceof UnclearReferenceType) {
            const type = this.inferUnclearReferenceType((rightOp.getType() as UnclearReferenceType).getName(), arkClass);
            if (type && rightOp instanceof ArkParameterRef) {
                rightOp.setType(type);
            }
        }
        const leftOp = stmt.getLeftOp();
        if (leftOp instanceof Local) {
            const leftOpType = leftOp.getType();
            let type = this.inferUnclearedType(leftOpType, arkClass, rightOp.getType());
            if (type) {
                leftOp.setType(type);
            } else if (this.isUnclearType(leftOpType) && !this.isUnclearType(stmt.getRightOp().getType())) {
                leftOp.setType(stmt.getRightOp().getType());
            }
        } else if (leftOp instanceof ArkInstanceFieldRef) {
            const fieldRef = leftOp.inferType(arkClass);
            if (this.isUnclearType(leftOp.getType()) && !this.isUnclearType(stmt.getRightOp().getType())) {
                leftOp.getFieldSignature().setType(stmt.getRightOp().getType());
            }
            if (fieldRef instanceof ArkStaticFieldRef) {
                stmt.setLeftOp(fieldRef);
            }

        }
    }

    public static isUnclearType(type: Type | null | undefined) {
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
        if (value instanceof AbstractRef || value instanceof AbstractExpr || value instanceof Local) {
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
        if (!refName) {
            return null;
        }
        const stdName = refName.replace(/<\w+>/, '');
        //import Reference
        const importSignature = ModelUtils.getArkExportInImportInfoWithName(stdName, arkClass.getDeclaringArkFile());
        const importType = this.parseArkExport2Type(importSignature);
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
                type = this.parseArkExport2Type(arkClass?.getDeclaringArkFile().getExportInfoBy(fieldName)?.getArkExport());
            }
        } else if (baseType instanceof AnnotationNamespaceType) {
            const namespace = declareClass.getDeclaringArkFile().getScene().getNamespace(baseType.getNamespaceSignature());
            const arkClass = namespace?.getClassWithName(fieldName);
            if (arkClass) {
                type = new ClassType(arkClass.getSignature());
            } else {
                const sub = namespace?.getNamespaceWithName(fieldName);
                if (sub) {
                    const ant = new AnnotationNamespaceType(fieldName);
                    ant.setNamespaceSignature(sub.getSignature());
                    type = ant;
                }
            }
        } else {
            logger.warn('infer unclear reference type fail: ' + fieldName);
            return null;
        }
        return type;
    }

    public static inferBaseType(baseName: string, arkClass: ArkClass): Type | null {
        const field = arkClass.getDeclaringArkFile().getDefaultClass().getDefaultArkMethod()
            ?.getBody()?.getLocals()?.get(baseName);
        if (field && !this.isUnclearType(field.getType())) {
            return field.getType();
        }
        let arkExport: ArkExport | undefined = ModelUtils.getClassWithName(baseName, arkClass)
            ?? ModelUtils.getNamespaceWithName(baseName, arkClass)
            ?? arkClass.getDeclaringArkFile().getDefaultClass().getMethodWithName(baseName)
            ?? ModelUtils.getArkExportInImportInfoWithName(baseName, arkClass.getDeclaringArkFile());
        return this.parseArkExport2Type(arkExport);
    }
}