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

import { TypeInference } from '../common/TypeInference';
import { BasicBlock } from '../graph/BasicBlock';
import { ArkClass } from '../model/ArkClass';
import { ClassSignature, MethodSignature, MethodSubSignature } from '../model/ArkSignature';
import { Local } from './Local';
import {
    AnnotationNamespaceType,
    ArrayType,
    BooleanType,
    CallableType,
    ClassType,
    NumberType,
    Type,
    UnknownType
} from './Type';
import { Value } from './Value';
import { AbstractFieldRef, ArkParameterRef } from './Ref';
import { ModelUtils } from "../common/ModelUtils";
import { ArkMethod } from "../model/ArkMethod";
import { ArkAssignStmt } from "./Stmt";
import Logger from "../../utils/logger";

const logger = Logger.getLogger();

/**
 * @category core/base/expr
 */
export abstract class AbstractExpr implements Value {
    abstract getUses(): Value[];

    abstract getType(): Type;

    abstract toString(): string;

    public inferType(arkMethod: ArkMethod): AbstractExpr {
        return this;
    }
}

export abstract class AbstractInvokeExpr extends AbstractExpr {
    private methodSignature: MethodSignature;
    private args: Value[];

    constructor(methodSignature: MethodSignature, args: Value[]) {
        super();
        this.methodSignature = methodSignature;
        this.args = args;
    }

    public getMethodSignature(): MethodSignature {
        return this.methodSignature;
    }

    public setMethodSignature(newMethodSignature: MethodSignature): void {
        this.methodSignature = newMethodSignature;
    }

    public getArg(index: number): Value {
        return this.args[index];
    }

    public getArgs(): Value[] {
        return this.args;
    }

    public setArgs(newArgs: Value[]): void {
        this.args = newArgs;
    }

    public getType(): Type {
        return this.methodSignature.getType();
    }

    public getUses(): Value[] {
        let uses: Value[] = [];
        uses.push(...this.args);
        for (const arg of this.args) {
            uses.push(...arg.getUses());
        }
        return uses;
    }
}

export class ArkInstanceInvokeExpr extends AbstractInvokeExpr {
    private base: Local;

    constructor(base: Local, methodSignature: MethodSignature, args: Value[]) {
        super(methodSignature, args);
        this.base = base;
    }

    public getBase(): Local {
        return this.base;
    }

    public setBase(newBase: Local): void {
        this.base = newBase;
    }

    public getUses(): Value[] {
        let uses: Value[] = [];
        uses.push(this.base);
        uses.push(...this.base.getUses());
        uses.push(...this.getArgs());
        for (const arg of this.getArgs()) {
            uses.push(...arg.getUses());
        }
        return uses;
    }

    public toString(): string {
        let strs: string[] = [];
        strs.push('instanceinvoke ');
        strs.push(this.base.toString());
        strs.push('.<');
        strs.push(this.getMethodSignature().toString());
        strs.push('>(');
        if (this.getArgs().length > 0) {
            for (const arg of this.getArgs()) {
                strs.push(arg.toString());
                strs.push(', ');
            }
            strs.pop();
        }
        strs.push(')');
        return strs.join('');
    }

    public inferType(arkMethod: ArkMethod): AbstractInvokeExpr {
        if (!(this.base instanceof Local)) {
            logger.warn("invoke expr base is not local")
            return this;
        }

        if (this.base.getType() instanceof UnknownType) {
            const signature = ModelUtils.getBaseSignatureWithName(this.base.getName(), arkMethod);
            const type = TypeInference.parseSignature2Type(signature);
            if (type) {
                this.base.setType(type);
            }
        }

        const methodName = this.getMethodSignature().getMethodSubSignature().getMethodName();
        const scene = arkMethod.getDeclaringArkFile().getScene();
        if ((methodName === 'forEach') && (this.base.getType() instanceof ArrayType)) {
            const arg = this.getArg(0);
            if (arg.getType() instanceof CallableType) {
                const baseType = this.base.getType() as ArrayType;
                const argMethodSignature = (arg.getType() as CallableType).getMethodSignature();
                const argMethod = scene.getMethod(argMethodSignature);
                if (argMethod != null) {
                    const firstStmt = argMethod.getBody().getCfg().getStmts()[0];
                    if ((firstStmt instanceof ArkAssignStmt) && (firstStmt.getRightOp() instanceof ArkParameterRef)) {
                        const parameterRef = firstStmt.getRightOp() as ArkParameterRef;
                        parameterRef.setType(baseType.getBaseType());
                    }
                    TypeInference.inferTypeInMethod(argMethod);
                }
            } else {
                logger.warn(`arg of forEach must be callable`);
            }
        }
        let type = this.base.getType();
        if (type instanceof ClassType) {
            const arkClass = scene.getClass(type.getClassSignature());
            let method = arkClass?.getMethodWithName(methodName) ?? arkClass?.getStaticMethodWithName(methodName);
            if (method) {
                TypeInference.inferMethodReturnType(method)
                this.setMethodSignature(method.getSignature());
                if (method.containsModifier('StaticKeyword')) {
                    return new ArkStaticInvokeExpr(method.getSignature(), this.getArgs());
                }
            } else if (methodName === 'constructor') { //隐式构造
                const subSignature = new MethodSubSignature();
                subSignature.setMethodName(methodName);
                subSignature.setReturnType(new ClassType(type.getClassSignature()));
                const defaultMethod = new MethodSignature();
                defaultMethod.setDeclaringClassSignature(type.getClassSignature());
                defaultMethod.setMethodSubSignature(subSignature);
                this.setMethodSignature(defaultMethod);
            } else {
                logger.warn(`class ${type.getClassSignature().getClassName()} method ${methodName} does not exist`);
            }
        } else if (type instanceof AnnotationNamespaceType) {
            const defaultClass = scene.getNamespace(type.getNamespaceSignature())?.getDefaultClass();
            let foundMethod = defaultClass?.getMethodWithName(methodName) ?? defaultClass?.getStaticMethodWithName(methodName);
            if (foundMethod) {
                TypeInference.inferMethodReturnType(foundMethod);
                this.setMethodSignature(foundMethod.getSignature());
                return new ArkStaticInvokeExpr(foundMethod.getSignature(), this.getArgs());
            }
        } else {
            logger.warn("invoke expr base type unknown:", type);
        }
        return this;
    }
}

export class ArkStaticInvokeExpr extends AbstractInvokeExpr {
    constructor(methodSignature: MethodSignature, args: Value[]) {
        super(methodSignature, args);
    }

    public toString(): string {
        let strs: string[] = [];
        strs.push('staticinvoke <');
        strs.push(this.getMethodSignature().toString());
        strs.push('>(');
        if (this.getArgs().length > 0) {
            for (const arg of this.getArgs()) {
                strs.push(arg.toString());
                strs.push(', ');
            }
            strs.pop();
        }
        strs.push(')');
        return strs.join('');
    }

    public inferType(arkMethod: ArkMethod): ArkStaticInvokeExpr {
        const methodName = this.getMethodSignature().getMethodSubSignature().getMethodName();
        let method = ModelUtils.getStaticMethodWithName(methodName, arkMethod);
        if (!method) {
            const type = ModelUtils.getTypeSignatureInImportInfoWithName(methodName, arkMethod.getDeclaringArkFile());
            if (type && type instanceof MethodSignature) {
                method = arkMethod.getDeclaringArkFile().getScene().getMethod(type);
            } else if (type && type instanceof ClassSignature) {
                method = arkMethod.getDeclaringArkFile().getScene().getClass(type)?.getMethodWithName('constructor') || null;
            }
        }
        if (method) {
            this.setMethodSignature(method.getSignature());
            TypeInference.inferMethodReturnType(method);
        }
        return this;
    }
}

export class ArkNewExpr extends AbstractExpr {
    private classType: ClassType;

    constructor(classType: ClassType) {
        super();
        this.classType = classType;
    }

    public getUses(): Value[] {
        let uses: Value[] = [];
        return uses;
    }

    public getType(): Type {
        return this.classType;
    }

    public toString(): string {
        return 'new ' + this.classType;
    }

    public inferType(arkMethod: ArkMethod): ArkNewExpr {
        const className = this.classType.getClassSignature().getClassName();
        const arkClass = ModelUtils.getClassWithName(className, arkMethod);
        if (arkClass) {
            this.classType.setClassSignature(arkClass.getSignature());
            return this;
        }
        const type = ModelUtils.getTypeSignatureInImportInfoWithName(className, arkMethod.getDeclaringArkFile());
        if (type && type instanceof ClassSignature) {
            this.classType.setClassSignature(type);
        }
        return this;
    }
}

export class ArkNewArrayExpr extends AbstractExpr {
    private baseType: Type;
    private size: Value;

    constructor(baseType: Type, size: Value) {
        super();
        this.baseType = baseType;
        this.size = size;
    }

    public getSize(): Value {
        return this.size;
    }

    public setSize(newSize: Value): void {
        this.size = newSize;
    }

    public getType(): ArrayType {
        // TODO: support multi-dimension array
        return new ArrayType(this.baseType, 1);
    }

    public getBaseType(): Type {
        return this.baseType;
    }

    public setBaseType(newType: Type): void {
        this.baseType = newType;
    }

    public getUses(): Value[] {
        let uses: Value[] = [this.size];
        uses.push(...this.size.getUses());
        return uses;
    }

    public toString(): string {
        return 'newarray (' + this.baseType + ')[' + this.size + ']';
    }
}

export class ArkDeleteExpr extends AbstractExpr {
    private field: AbstractFieldRef;

    constructor(field: AbstractFieldRef) {
        super();
        this.field = field;
    }

    public getField(): AbstractFieldRef {
        return this.field;
    }

    public setField(newField: AbstractFieldRef): void {
        this.field = newField;
    }

    public getType(): Type {
        return BooleanType.getInstance();
    }

    public getUses(): Value[] {
        const uses: Value[] = [];
        uses.push(this.field);
        uses.push(...this.field.getUses());
        return uses;
    }

    public toString(): string {
        const str = 'delete ' + this.field;
        return str;
    }

}

// 二元运算表达式
export class ArkBinopExpr extends AbstractExpr {
    private op1: Value;
    private op2: Value;
    private operator: string;

    constructor(op1: Value, op2: Value, operator: string) {
        super();
        this.op1 = op1;
        this.op2 = op2;
        this.operator = operator;
    }

    public getOp1(): Value {
        return this.op1;
    }

    public setOp1(newOp1: Value): void {
        this.op1 = newOp1;
    }

    public getOp2(): Value {
        return this.op2;
    }

    public setOp2(newOp2: Value): void {
        this.op2 = newOp2;
    }

    public getOperator(): string {
        return this.operator;
    }

    public getType(): Type {
        return TypeInference.inferTypeOfBinopExpr(this);
    }

    public getUses(): Value[] {
        let uses: Value[] = [];
        uses.push(this.op1);
        uses.push(...this.op1.getUses());
        uses.push(this.op2);
        uses.push(...this.op2.getUses());
        return uses;
    }

    public toString(): string {
        return this.op1 + ' ' + this.operator + ' ' + this.op2;
    }
}

export class ArkConditionExpr extends ArkBinopExpr {
    constructor(op1: Value, op2: Value, operator: string) {
        super(op1, op2, operator);
    }
}

export class ArkTypeOfExpr extends AbstractExpr {
    private op: Value;

    constructor(op: Value) {
        super();
        this.op = op;
    }

    public getOp(): Value {
        return this.op;
    }

    public setOp(newOp: Value): void {
        this.op = newOp;
    }

    public getUses(): Value[] {
        let uses: Value[] = [];
        uses.push(this.op);
        uses.push(...this.op.getUses());
        return uses;
    }

    public getType(): Type {
        return this.op.getType();
    }

    public toString(): string {
        return 'typeof ' + this.op;
    }
}

export class ArkInstanceOfExpr extends AbstractExpr {
    private op: Value;
    private checkType: string;

    constructor(op: Value, checkType: string) {
        super();
        this.op = op;
        this.checkType = checkType;
    }

    public getOp(): Value {
        return this.op;
    }

    public setOp(newOp: Value): void {
        this.op = newOp;
    }

    public getType(): Type {
        return BooleanType.getInstance();
    }

    public getUses(): Value[] {
        let uses: Value[] = [];
        uses.push(this.op);
        uses.push(...this.op.getUses());
        return uses;
    }

    public toString(): string {
        return this.op + ' instanceof ' + this.checkType;
    }
}

export class ArkLengthExpr extends AbstractExpr {
    private op: Value;

    constructor(op: Value) {
        super();
        this.op = op;
    }

    public getOp(): Value {
        return this.op;
    }

    public setOp(newOp: Value): void {
        this.op = newOp;
    }

    public getType(): Type {
        return NumberType.getInstance();
    }

    public getUses(): Value[] {
        let uses: Value[] = [];
        uses.push(this.op);
        uses.push(...this.op.getUses());
        return uses;
    }

    public toString(): string {
        return 'lengthof ' + this.op;
    }
}

// 类型转换
export class ArkCastExpr extends AbstractExpr {
    private op: Value;
    private type: Type;

    constructor(op: Value, type: Type) {
        super();
        this.op = op;
        this.type = type;
    }

    public getOp(): Value {
        return this.op;
    }

    public setOp(newOp: Value): void {
        this.op = newOp;
    }

    public getUses(): Value[] {
        let uses: Value[] = [];
        uses.push(this.op);
        uses.push(...this.op.getUses());
        return uses;
    }

    public getType(): Type {
        return this.type;
    }

    public toString(): string {
        return '<' + this.type + '>' + this.op;
    }
}

export class ArkPhiExpr extends AbstractExpr {
    private args: Local[];
    private blockToArg: Map<BasicBlock, Local>;
    private argToBlock: Map<Local, BasicBlock>;

    // private type:Type;

    constructor() {
        super();
        this.args = [];
        this.blockToArg = new Map();
        this.argToBlock = new Map();
    }

    public getUses(): Value[] {
        let uses: Value[] = [];
        uses.push(...this.args);
        return uses;
    }

    public getArgs(): Local[] {
        return this.args;
    }

    public setArgs(args: Local[]): void {
        this.args = args;
    }

    public getArgToBlock(): Map<Local, BasicBlock> {
        return this.argToBlock;
    }

    public setArgToBlock(argToBlock: Map<Local, BasicBlock>): void {
        this.argToBlock = argToBlock;
    }

    public getType(): Type {
        return this.args[0].getType();
    }

    public toString(): string {
        let strs: string[] = [];
        strs.push('phi(');
        if (this.args.length > 0) {
            for (const arg of this.args) {
                strs.push(arg.toString());
                strs.push(', ');
            }
            strs.pop();
        }
        strs.push(')');
        return strs.join('');
    }
}

// unary operation expression
export class ArkUnopExpr extends AbstractExpr {
    private op: Value;
    private operator: string;

    constructor(op: Value, operator: string) {
        super();
        this.op = op;
        this.operator = operator;
    }

    public getUses(): Value[] {
        let uses: Value[] = [];
        uses.push(this.op);
        uses.push(...this.op.getUses());
        return uses;
    }

    public getType(): Type {
        return this.op.getType();
    }

    public getOperator(): string {
        return this.operator;
    }

    public toString(): string {
        return this.operator + this.op;
    }
}

export class ArrayLiteralExpr extends AbstractExpr {
    private elements: Value[] = [];
    private type: Type;

    constructor(elements: Value[], type: Type) {
        super();
        this.elements = elements;
        this.type = type;
    }

    public getUses(): Value[] {
        let uses: Value[] = [];
        uses.push();
        return uses;
    }

    public getType(): Type {
        return this.type;
    }

    public toString(): string {
        //TODO
        return '';
    }
}

export class ObjectLiteralExpr extends AbstractExpr {
    private anonymousClass: ArkClass;
    private type: Type;

    constructor(anonymousClass: ArkClass, type: Type = ClassType) {
        super();
        this.anonymousClass = anonymousClass;
        this.type = type;
    }

    public getAnonymousClass() {
        return this.anonymousClass;
    }

    public getUses(): Value[] {
        let uses: Value[] = [];
        uses.push();
        return uses;
    }

    public getType(): Type {
        return this.type;
    }

    public toString(): string {
        //TODO: Fixed the bug where getSignature() return undefined
        return this.anonymousClass.getSignature()?.toString();
    }
}