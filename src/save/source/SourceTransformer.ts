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
    ArkBinopExpr,
    ArkCastExpr,
    ArkInstanceInvokeExpr,
    ArkLengthExpr,
    ArkNewArrayExpr,
    ArkNewExpr,
    ArkStaticInvokeExpr,
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
import { ArkArrayRef, ArkInstanceFieldRef } from '../../core/base/Ref';
import { ArkFile } from '../../core/model/ArkFile';

const logger = Logger.getLogger();

export interface TransformerContext {
    getArkFile(): ArkFile;
    getMethod(signature: MethodSignature): ArkMethod | null;
    getClass(signature: ClassSignature): ArkClass | null;
    getPrinter(): ArkCodeBuffer;
    transTemp2Code(temp: Local): string;
}

export class SourceTransformer {
    protected context: TransformerContext;

    constructor(context: TransformerContext) {
        this.context = context;
    }

    public instanceInvokeExprToString(
        invokeExpr: ArkInstanceInvokeExpr
    ): string {
        let methodName = invokeExpr
            .getMethodSignature()
            .getMethodSubSignature()
            .getMethodName();
        let args: string[] = [];
        invokeExpr.getArgs().forEach((v) => {
            args.push(this.valueToString(v));
        });

        return `${this.valueToString(
            invokeExpr.getBase()
        )}.${methodName}(${args.join(', ')})`;
    }

    public staticInvokeExprToString(invokeExpr: ArkStaticInvokeExpr): string {
        let methodSignature = invokeExpr.getMethodSignature();
        let method = this.context.getMethod(methodSignature);
        if (method && SourceUtils.isAnonymousMethod(method.getName())) {
            let body = new SourceMethod(
                method,
                this.context.getPrinter().getIndent()
            ).dump();
            return body.substring(this.context.getPrinter().getIndent().length);
        }

        let className = invokeExpr
            .getMethodSignature()
            .getDeclaringClassSignature()
            .getClassName();
        let methodName = invokeExpr
            .getMethodSignature()
            .getMethodSubSignature()
            .getMethodName();
        let args: string[] = [];
        invokeExpr.getArgs().forEach((v) => {
            args.push(this.valueToString(v));
        });
        if (
            className &&
            className.length > 0 &&
            !SourceUtils.isDefaultClass(className)
        ) {
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
            if (
                value.getValue().startsWith("'") ||
                value.getValue().startsWith('"')
            ) {
                return `${value.getValue()}`;
            } else {
                return `'${value.getValue()}'`;
            }
        } else {
            return value.getValue();
        }
    }

    public valueToString(value: Value): string {
        if (value instanceof Constant) {
            return SourceTransformer.constToString(value);
        }

        if (value instanceof Local) {
            if (SourceUtils.isAnonymousMethod(value.getName())) {
                let methodSignature = (
                    value.getType() as CallableType
                ).getMethodSignature();
                let anonymousMethod = this.context.getMethod(methodSignature);
                if (anonymousMethod) {
                    let body = new SourceMethod(
                        anonymousMethod,
                        this.context.getPrinter().getIndent()
                    ).dump();
                    return body.substring(
                        this.context.getPrinter().getIndent().length
                    );
                }
            }
            if (SourceUtils.isAnonymousClass(value.getName())) {
                let clsSignature = (
                    value.getType() as ClassType
                ).getClassSignature();
                let cls = this.context.getClass(clsSignature);
                if (cls) {
                    return new SourceClass(cls).dump();
                }
            }

            return this.context.transTemp2Code(value);
        }

        if (value instanceof ArkInstanceInvokeExpr) {
            return `${this.instanceInvokeExprToString(value)}`;
        }

        if (value instanceof ArkStaticInvokeExpr) {
            return `${this.staticInvokeExprToString(value)}`;
        }

        if (value instanceof ArkBinopExpr) {
            let op1: Value = value.getOp1();
            let op2: Value = value.getOp2();
            let operator: string = value.getOperator();

            return `${this.valueToString(op1)} ${operator} ${this.valueToString(
                op2
            )}`;
        }

        if (value instanceof ArkInstanceFieldRef) {
            return `${this.valueToString(
                value.getBase()
            )}.${value.getFieldName()}`;
        }

        if (value instanceof ArkCastExpr) {
            let baseOp = value.getOp();
            return `${this.valueToString(baseOp)}} as ${this.typeToString(
                value.getType()
            )}`;
        }

        if (value instanceof ArkNewArrayExpr) {
            return `new Array<${this.typeToString(
                value.getBaseType()
            )}>(${value.getSize()})`;
        }

        if (value instanceof ArkArrayRef) {
            return `${this.valueToString(value.getBase())}[${this.valueToString(
                value.getIndex()
            )}]`;
        }

        if (value instanceof ArkLengthExpr) {
            return `${value.getOp()}.length`;
        }

        if (value instanceof ObjectLiteralExpr) {
            return new SourceClass(value.getAnonymousClass()).dump();
        }

        if (value instanceof ArrayLiteralExpr) {
            let elements: string[] = [];
            value.getElements().forEach((element) => {
                elements.push(this.valueToString(element));
            });
            return `[${elements.join(', ')}]`;
        }

        if (value instanceof ArkNewExpr) {
            return `new ${this.typeToString(value.getType())}()`;
        }

        return `${value}`;
    }

    public typeToString(type: Type): string {
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

        if (type instanceof LiteralType) {
            let literalName = type.getliteralName() as string;
            return literalName
                .substring(0, literalName.length - 'Keyword'.length)
                .toLowerCase();
        }

        if (type instanceof UnknownType) {
            return 'any';
        }

        if (type instanceof ClassType) {
            let name = type.getClassSignature().getClassName();
            if (SourceUtils.isDefaultClass(name)) {
                return 'any';
            }
            let cls = this.context.getClass(type.getClassSignature());
            if (
                cls?.getOriginType() == 'Object' ||
                cls?.getOriginType() == 'TypeLiteral'
            ) {
            }
            if (SourceUtils.isAnonymousClass(name)) {
                let cls = this.context.getClass(type.getClassSignature());
                if (cls) {
                    return new SourceClass(cls).dump();
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
