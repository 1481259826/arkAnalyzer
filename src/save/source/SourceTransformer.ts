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

import { Constant } from '../../core/base/Constant';
import {
    AbstractExpr,
    ArkBinopExpr,
    ArkCastExpr,
    ArkDeleteExpr,
    ArkInstanceInvokeExpr,
    ArkInstanceOfExpr,
    ArkLengthExpr,
    ArkNewArrayExpr,
    ArkNewExpr,
    ArkStaticInvokeExpr,
    ArkTypeOfExpr,
    ArkUnopExpr,
    ArrayLiteralExpr,
    ObjectLiteralExpr,
} from '../../core/base/Expr';
import { Local } from '../../core/base/Local';
import { ArkClass } from '../../core/model/ArkClass';
import { ArkMethod } from '../../core/model/ArkMethod';
import { ClassSignature, MethodSignature } from '../../core/model/ArkSignature';
import { ArkCodeBuffer } from '../ArkStream';
import Logger from '../../utils/logger';
import { SourceUtils } from './SourceUtils';
import { SourceMethod } from './SourceMethod';
import {
    ArrayType,
    CallableType,
    ClassType,
    LiteralType,
    PrimitiveType,
    Type,
    TypeLiteralType,
    UnknownType,
} from '../../core/base/Type';
import { SourceClass } from './SourceClass';
import { Value } from '../../core/base/Value';
import { AbstractRef, ArkArrayRef, ArkInstanceFieldRef, ArkStaticFieldRef, ArkThisRef } from '../../core/base/Ref';
import { ArkFile } from '../../core/model/ArkFile';
import {
    COMPONENT_CREATE_FUNCTION,
    COMPONENT_CUSTOMVIEW,
    COMPONENT_IF,
    COMPONENT_POP_FUNCTION,
} from '../../core/common/EtsConst';

const logger = Logger.getLogger();

export interface TransformerContext {
    getArkFile(): ArkFile;

    getMethod(signature: MethodSignature): ArkMethod | null;

    getClass(signature: ClassSignature): ArkClass | null;

    getPrinter(): ArkCodeBuffer;

    transTemp2Code(temp: Local): string;

    isInBuilderMethod(): boolean;
}

export class SourceTransformer {
    protected context: TransformerContext;

    constructor(context: TransformerContext) {
        this.context = context;
    }

    private anonymousMethodToString(method: ArkMethod): string {
        let mtdPrinter = new SourceMethod(method, this.context.getPrinter().getIndent());
        mtdPrinter.setInBuilder(this.context.isInBuilderMethod());
        let body = mtdPrinter.dump();
        return body.substring(this.context.getPrinter().getIndent().length);
    }

    private anonymousClassToString(cls: ArkClass): string {
        let clsPrinter = new SourceClass(cls);
        return clsPrinter.dump();
    }

    public instanceInvokeExprToString(invokeExpr: ArkInstanceInvokeExpr): string {
        let methodName = invokeExpr.getMethodSignature().getMethodSubSignature().getMethodName();
        let args: string[] = [];
        invokeExpr.getArgs().forEach((v) => {
            args.push(this.valueToString(v));
        });

        if (SourceUtils.isComponentAttributeInvoke(invokeExpr) && this.context.isInBuilderMethod()) {
            return `.${methodName}(${args.join(', ')})`;
        }

        return `${this.valueToString(invokeExpr.getBase())}.${methodName}(${args.join(', ')})`;
    }

    public staticInvokeExprToString(invokeExpr: ArkStaticInvokeExpr): string {
        let methodSignature = invokeExpr.getMethodSignature();
        let method = this.context.getMethod(methodSignature);
        if (method && SourceUtils.isAnonymousMethod(method.getName())) {
            return this.anonymousMethodToString(method);
        }

        let className = invokeExpr.getMethodSignature().getDeclaringClassSignature().getClassName();
        let methodName = invokeExpr.getMethodSignature().getMethodSubSignature().getMethodName();
        let args: string[] = [];
        invokeExpr.getArgs().forEach((v) => {
            args.push(this.valueToString(v));
        });

        if (this.context.isInBuilderMethod()) {
            if (className == COMPONENT_CUSTOMVIEW) {
                if (methodName == COMPONENT_CREATE_FUNCTION) {
                    // Anonymous @Builder method
                    if (args.length > 1) {
                        args[1] = args[1].substring('() => '.length);
                    }
                    return `${args.join(' ')}`;
                }
                if (methodName == COMPONENT_POP_FUNCTION) {
                    return '';
                }
            }

            if (SourceUtils.isComponentCreate(invokeExpr)) {
                if (className == COMPONENT_IF) {
                    return `if (${args.join(', ')})`;
                }
                return `${className}(${args.join(', ')})`;
            }

            if (SourceUtils.isComponentIfBranchInvoke(invokeExpr)) {
                let arg0 = invokeExpr.getArg(0) as Constant;
                if (arg0.getValue() == '0') {
                    return ``;
                } else {
                    return '} else {';
                }
            }

            if (SourceUtils.isComponentPop(invokeExpr)) {
                return '}';
            }
        }

        if (className && className.length > 0 && !SourceUtils.isDefaultClass(className)) {
            return `${className}.${methodName}(${args.join(', ')})`;
        }
        return `${methodName}(${args.join(', ')})`;
    }

    public typeArrayToString(types: Type[], split: string = ', '): string {
        let typesStr: string[] = [];
        types.forEach((t) => {
            typesStr.push(this.typeToString(t));
        });

        return typesStr.join(split);
    }

    public static constToString(value: Constant): string {
        if (value.getType() == 'string') {
            if (value.getValue().startsWith("'") || value.getValue().startsWith('"')) {
                return `${value.getValue()}`;
            } else {
                return `'${value.getValue()}'`;
            }
        } else {
            return value.getValue();
        }
    }

    public exprToString(expr: AbstractExpr): string {
        if (expr instanceof ArkInstanceInvokeExpr) {
            return `${this.instanceInvokeExprToString(expr)}`;
        }

        if (expr instanceof ArkStaticInvokeExpr) {
            return `${this.staticInvokeExprToString(expr)}`;
        }

        if (expr instanceof ArkNewArrayExpr) {
            return `new Array<${this.typeToString(expr.getBaseType())}>(${expr.getSize()})`;
        }

        if (expr instanceof ArkNewExpr) {
            return `new ${this.typeToString(expr.getType())}()`;
        }

        if (expr instanceof ArkDeleteExpr) {
            return `delete ${this.valueToString(expr.getField())}`;
        }

        if (expr instanceof ArkBinopExpr) {
            let op1: Value = expr.getOp1();
            let op2: Value = expr.getOp2();
            let operator: string = expr.getOperator();

            return `${this.valueToString(op1)} ${operator} ${this.valueToString(op2)}`;
        }

        if (expr instanceof ArkTypeOfExpr) {
            return `typeof(${this.valueToString(expr.getOp())})`;
        }

        if (expr instanceof ArkInstanceOfExpr) {
            return `${this.valueToString(expr.getOp())} instanceof ${this.typeToString(expr.getType())}`;
        }

        if (expr instanceof ArkLengthExpr) {
            return `${this.valueToString(expr.getOp())}.length`;
        }

        if (expr instanceof ArkCastExpr) {
            let baseOp = expr.getOp();
            return `${this.valueToString(baseOp)} as ${this.typeToString(expr.getType())}`;
        }

        if (expr instanceof ArkUnopExpr) {
            return `${expr.getOperator()}${this.valueToString(expr.getOp())}`;
        }

        if (expr instanceof ArrayLiteralExpr) {
            let elements: string[] = [];
            expr.getElements().forEach((element) => {
                elements.push(this.valueToString(element));
            });
            return `[${elements.join(', ')}]`;
        }

        if (expr instanceof ObjectLiteralExpr) {
            return this.anonymousClassToString(expr.getAnonymousClass());
        }

        // ArkPhiExpr
        return `${expr}`;
    }

    public refToString(value: AbstractRef): string {
        if (value instanceof ArkInstanceFieldRef) {
            return `${this.valueToString(value.getBase())}.${value.getFieldName()}`;
        }

        if (value instanceof ArkStaticFieldRef) {
            return `${value.getFieldSignature().getBaseName()}.${value.getFieldName()}`;
        }

        if (value instanceof ArkArrayRef) {
            return `${this.valueToString(value.getBase())}[${this.valueToString(value.getIndex())}]`;
        }

        if (value instanceof ArkThisRef) {
            return 'this';
        }

        // ArkCaughtExceptionRef
        return `${value}`;
    }

    public valueToString(value: Value): string {
        if (value instanceof AbstractExpr) {
            return this.exprToString(value);
        }

        if (value instanceof AbstractRef) {
            return this.refToString(value);
        }

        if (value instanceof Constant) {
            return SourceTransformer.constToString(value);
        }

        if (value instanceof Local) {
            if (SourceUtils.isAnonymousMethod(value.getName())) {
                let methodSignature = (value.getType() as CallableType).getMethodSignature();
                let anonymousMethod = this.context.getMethod(methodSignature);
                if (anonymousMethod) {
                    return this.anonymousMethodToString(anonymousMethod);
                }
            }
            if (SourceUtils.isAnonymousClass(value.getName())) {
                let clsSignature = (value.getType() as ClassType).getClassSignature();
                let cls = this.context.getClass(clsSignature);
                if (cls) {
                    return this.anonymousClassToString(cls);
                }
            }

            return this.context.transTemp2Code(value);
        }

        return `${value}`;
    }

    public typeToString(type: Type): string {
        if (type instanceof LiteralType) {
            let literalName = type.getliteralName() as string;
            return literalName.substring(0, literalName.length - 'Keyword'.length).toLowerCase();
        }

        if (type instanceof PrimitiveType) {
            return type.getName();
        }

        if (type instanceof TypeLiteralType) {
            let typesStr: string[] = [];
            for (const member of type.getMembers()) {
                typesStr.push(member.getName() + ':' + member.getType());
            }
            return `{${typesStr.join(',')}}`;
        }

        if (type instanceof Array) {
            let typesStr: string[] = [];
            for (const member of type) {
                typesStr.push(this.typeToString(member));
            }
            return typesStr.join(' | ');
        }

        if (type instanceof UnknownType) {
            return 'any';
        }

        if (type instanceof ClassType) {
            let name = type.getClassSignature().getClassName();
            if (SourceUtils.isDefaultClass(name)) {
                return 'any';
            }
            if (SourceUtils.isAnonymousClass(name)) {
                let cls = this.context.getClass(type.getClassSignature());
                if (cls) {
                    return this.anonymousClassToString(cls);
                }
                return 'any';
            }
            return name;
        }
        if (type instanceof ArrayType) {
            let baseType = type.getBaseType();
            if (baseType instanceof UnknownType) {
                const strs: string[] = [];
                strs.push('(any)');
                for (let i = 0; i < type.getDimension(); i++) {
                    strs.push('[]');
                }
                return strs.join('');
            } else if (baseType instanceof PrimitiveType) {
                const strs: string[] = [];
                strs.push(`${baseType.getName()}`);
                for (let i = 0; i < type.getDimension(); i++) {
                    strs.push('[]');
                }
                return strs.join('');
            } else {
                return type.toString();
            }
        }

        if (type instanceof CallableType) {
            let methodSignature = type.getMethodSignature();
            let method = this.context.getMethod(methodSignature);
            if (method && SourceUtils.isAnonymousMethod(method.getName())) {
                return new SourceMethod(method).toArrowFunctionTypeString();
            }
        }

        if (!type) {
            return 'any';
        }

        return type.toString();
    }
}
