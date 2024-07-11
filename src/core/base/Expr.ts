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
    AnyType,
    ArrayObjectType,
    ArrayType,
    BooleanType,
    CallableType,
    ClassType,
    NullType,
    NumberType,
    StringType,
    Type,
    UnclearReferenceType,
    UndefinedType,
    UnionType,
    UnknownType
} from './Type';
import { Value } from './Value';
import { AbstractFieldRef, AbstractRef, ArkParameterRef } from './Ref';
import { ModelUtils } from "../common/ModelUtils";
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

    public inferType(arkClass: ArkClass): AbstractExpr {
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

    public inferType(arkClass: ArkClass): AbstractInvokeExpr {
        let baseType: Type | null = this.base.getType();
        if (this.base instanceof Local && baseType instanceof UnknownType) {
            baseType = TypeInference.inferBaseType(this.base.getName(), arkClass);
        } else if (baseType instanceof UnclearReferenceType) {
            baseType = TypeInference.inferUnclearReferenceType(baseType.getName(), arkClass);
        }
        if (!baseType) {
            logger.warn('infer ArkInstanceInvokeExpr base type fail: ' + this.toString());
            return this;
        }
        if (this.base instanceof Local) {
            this.base.setType(baseType);
        }
        const methodName = this.getMethodSignature().getMethodSubSignature().getMethodName();
        const scene = arkClass.getDeclaringArkFile().getScene();
        if ((methodName === 'forEach') && (baseType instanceof ArrayType)) {
            const arg = this.getArg(0);
            if (arg.getType() instanceof CallableType) {
                const argMethodSignature = (arg.getType() as CallableType).getMethodSignature();
                const argMethod = scene.getMethod(argMethodSignature);
                if (argMethod != null) {
                    const firstStmt = argMethod.getBody().getCfg().getStmts()[0];
                    if ((firstStmt instanceof ArkAssignStmt) && (firstStmt.getRightOp() instanceof ArkParameterRef)) {
                        const parameterRef = firstStmt.getRightOp() as ArkParameterRef;
                        parameterRef.setType((baseType as ArrayType).getBaseType());
                    }
                    TypeInference.inferTypeInMethod(argMethod);
                }
            } else {
                logger.warn(`arg of forEach must be callable`);
            }
        }

        if (baseType instanceof ClassType) {
            const arkClass = scene.getClass(baseType.getClassSignature());
            let method = arkClass?.getMethodWithName(methodName) ?? arkClass?.getStaticMethodWithName(methodName);
            if (method) {
                TypeInference.inferMethodReturnType(method)
                this.setMethodSignature(method.getSignature());
                if (method.isStatic()) {
                    return new ArkStaticInvokeExpr(method.getSignature(), this.getArgs());
                }
                return this;
            } else if (methodName === 'constructor') { //隐式构造
                const subSignature = new MethodSubSignature();
                subSignature.setMethodName(methodName);
                subSignature.setReturnType(new ClassType(baseType.getClassSignature()));
                const defaultMethod = new MethodSignature();
                defaultMethod.setDeclaringClassSignature(baseType.getClassSignature());
                defaultMethod.setMethodSubSignature(subSignature);
                this.setMethodSignature(defaultMethod);
                return this;
            }
        } else if (baseType instanceof AnnotationNamespaceType) {
            const defaultClass = scene.getNamespace(baseType.getNamespaceSignature())?.getDefaultClass();
            let foundMethod = defaultClass?.getMethodWithName(methodName) ?? defaultClass?.getStaticMethodWithName(methodName);
            if (foundMethod) {
                TypeInference.inferMethodReturnType(foundMethod);
                this.setMethodSignature(foundMethod.getSignature());
                return new ArkStaticInvokeExpr(foundMethod.getSignature(), this.getArgs());
            }
        } else {
            logger.warn("invoke ArkInstanceInvokeExpr base type unknown:", this.toString());
        }
        logger.warn("invoke ArkInstanceInvokeExpr MethodSignature type fail: ", this.toString());
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

    public inferType(arkClass: ArkClass): ArkStaticInvokeExpr {
        const methodName = this.getMethodSignature().getMethodSubSignature().getMethodName();
        let method = ModelUtils.getStaticMethodWithName(methodName, arkClass);
        if (!method) {
            let arkFile = arkClass.getDeclaringArkFile();
            const type = ModelUtils.getTypeSignatureInImportInfoWithName(methodName, arkFile);
            if (type && type instanceof MethodSignature) {
                method = arkFile.getScene().getMethod(type);
            } else if (type && type instanceof ClassSignature) {
                method = arkFile.getScene().getClass(type)?.getMethodWithName('constructor') || null;
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
        return [];
    }

    public getType(): Type {
        return this.classType;
    }

    public toString(): string {
        return 'new ' + this.classType;
    }

    public inferType(arkClass: ArkClass): ArkNewExpr {
        const className = this.classType.getClassSignature().getClassName();
        const type = TypeInference.inferUnclearReferenceType(className, arkClass);
        if (type && type instanceof ClassType) {
            this.classType = type;
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
        return new ArrayType(this.baseType, 1);
    }

    public getBaseType(): Type {
        return this.baseType;
    }

    public setBaseType(newType: Type): void {
        this.baseType = newType;
    }

    public inferType(arkClass: ArkClass): ArkNewArrayExpr {
        if (this.baseType instanceof UnionType) {
            const types = this.baseType.getTypes();
            for (let i = 1; i < types.length; i++) {
                if (types[0] !== types[i]) {
                    this.baseType = AnyType.getInstance();
                    break;
                }
            }
            if (this.baseType instanceof UnionType) {
                if (types[0] instanceof ClassType) {
                    const type = TypeInference.inferUnclearReferenceType(types[0].getClassSignature().getClassName(), arkClass);
                    if (type) {
                        this.baseType = type;
                    }
                } else {
                    this.baseType = types[0];
                }
            }
        } else if (this.baseType instanceof UnclearReferenceType) {
            const referenceType = TypeInference.inferUnclearReferenceType(this.baseType.getName(), arkClass);
            if (referenceType) {
                this.baseType = referenceType;
            }
        }
        return this;
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
        return 'delete ' + this.field;
    }

}

// 二元运算表达式
export class ArkBinopExpr extends AbstractExpr {
    private op1: Value;
    private op2: Value;
    private operator: string;

    private type: Type;

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
        return this.type;
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

    private inferOpType(op: Value, arkClass: ArkClass) {
        if (op instanceof AbstractExpr || op instanceof AbstractRef) {
            TypeInference.inferValueType(op, arkClass);
        }
    }

    private setType() {
        let op1Type = this.op1.getType();
        let op2Type = this.op2.getType();
        if (op1Type instanceof UnionType) {
            op1Type = op1Type.getCurrType();
        }
        if (op2Type instanceof UnionType) {
            op2Type = op2Type.getCurrType();
        }
        let type = UnknownType.getInstance();
        switch (this.operator) {
            case "+":
                if (op1Type === StringType.getInstance() || op2Type === StringType.getInstance()) {
                    type = StringType.getInstance();
                }
                if (op1Type === NumberType.getInstance() && op2Type === NumberType.getInstance()) {
                    type = NumberType.getInstance();
                }
                break;
            case "-":
            case "*":
            case "/":
            case "%":
                if (op1Type === NumberType.getInstance() && op2Type === NumberType.getInstance()) {
                    type = NumberType.getInstance();
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
                type = BooleanType.getInstance();
                break;
            case "&":
            case "|":
            case "^":
            case "<<":
            case ">>":
            case ">>>":
                if (op1Type === NumberType.getInstance() && op2Type === NumberType.getInstance()) {
                    type = NumberType.getInstance();
                }
                break;
            case "??":
                if (op1Type === UnknownType.getInstance() || op1Type === UndefinedType.getInstance()
                    || op1Type === NullType.getInstance()) {
                    type = op2Type;
                } else {
                    type = op1Type;
                }
                break;
        }
        this.type = type;
    }

    public inferType(arkClass: ArkClass): ArkBinopExpr {
        this.inferOpType(this.op1, arkClass);
        this.inferOpType(this.op2, arkClass);
        this.setType();
        return this;
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
        return StringType.getInstance();
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

    public getOp(): Value {
        return this.op;
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
    private readonly elements: Value[] = [];
    private type: Type;

    constructor(elements: Value[], type: Type) {
        super();
        this.elements = elements;
        this.type = type;
    }

    public getElements(): Value[] {
        return this.elements;
    }

    public getUses(): Value[] {
        let uses: Value[] = [];
        uses.push();
        return uses;
    }

    public inferType(arkClass: ArkClass): ArrayLiteralExpr {
        if (this.type instanceof UnionType) {
            const types = this.type.getTypes();
            for (let i = 1; i < types.length; i++) {
                if (types[0] !== types[i]) {
                    this.type = new ArrayType(AnyType.getInstance(), 1);
                    break;
                }
            }
            if (this.type instanceof UnionType) {
                if (types[0] instanceof ClassType) {
                    const type = TypeInference.inferUnclearReferenceType(types[0].getClassSignature().getClassName(), arkClass);
                    if (type) {
                        this.type = new ArrayObjectType(type, 1);
                    }
                } else {
                    this.type = new ArrayType(types[0], 1);
                }
            }
        }
        return this;
    }

    public getType(): Type {
        return this.type;
    }

    public toString(): string {
        return '[' + this.elements.join() + ']';
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