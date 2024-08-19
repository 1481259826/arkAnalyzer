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

import { ArkField } from '../model/ArkField';
import { ClassSignature, MethodSignature, NamespaceSignature } from '../model/ArkSignature';

/**
 * @category core/base/type
 */
export abstract class Type {
    abstract toString(): string;
}

/**
 * any type
 * @category core/base/type
 */
export class AnyType extends Type {
    private static readonly INSTANCE = new AnyType();

    public static getInstance(): AnyType {
        return this.INSTANCE;
    }

    constructor() {
        super();
    }

    public toString(): string {
        return 'any';
    }
}

/**
 * unknown type
 * @category core/base/type
 */
export class UnknownType extends Type {
    private static readonly INSTANCE = new UnknownType();

    public static getInstance(): UnknownType {
        return this.INSTANCE;
    }

    constructor() {
        super();
    }

    public toString(): string {
        return 'unknown';
    }
}

/**
 * typeParameter type
 * @category core/base/type
 */
export class TypeParameterType extends Type {
    private name: string;
    private type: Type;

    constructor(name: string, type: Type = UnknownType.getInstance()) {
        super();
        this.name = name;
        this.type = type;
    }

    public getName() {
        return this.name;
    }

    public getType() {
        return this.type;
    }

    public toString() {
        return this.name;
    }
}


/**
 * unclear type
 * @category core/base/type
 */
export class UnclearReferenceType extends Type {
    private name: string;
    private genericTypes: Type[];

    constructor(name: string, genericTypes: Type[] = []) {
        super();
        this.name = name;
        this.genericTypes = genericTypes;
    }

    public getName() {
        return this.name;
    }

    public getGenericTypes(): Type[] {
        return this.genericTypes;
    }

    public toString() {
        let str = this.name;
        if (this.genericTypes.length > 0) {
            str += '<' + this.genericTypes.join(',') + '>';
        }
        return str;
    }
}

/**
 * primitive type
 * @category core/base/type
 */
export abstract class PrimitiveType extends Type {
    private name: string;

    constructor(name: string) {
        super();
        this.name = name;
    }

    public getName() {
        return this.name;
    }

    public toString() {
        return this.name;
    }
}

export class BooleanType extends PrimitiveType {
    private static readonly INSTANCE = new BooleanType();

    constructor() {
        super('boolean');
    }

    public static getInstance() {
        return this.INSTANCE;
    }
}

export class NumberType extends PrimitiveType {
    private static readonly INSTANCE = new NumberType();

    constructor() {
        super('number');
    }

    public static getInstance() {
        return this.INSTANCE;
    }
}

export class StringType extends PrimitiveType {
    private static readonly INSTANCE = new StringType();

    constructor() {
        super('string');
    }

    public static getInstance() {
        return this.INSTANCE;
    }
}

/**
 * null type
 * @category core/base/type
 */
export class NullType extends PrimitiveType {
    private static readonly INSTANCE = new NullType();

    public static getInstance(): NullType {
        return this.INSTANCE;
    }

    constructor() {
        super('null');
    }
}

/**
 * undefined type
 * @category core/base/type
 */
export class UndefinedType extends PrimitiveType {
    private static readonly INSTANCE = new UndefinedType();

    public static getInstance(): UndefinedType {
        return this.INSTANCE;
    }

    constructor() {
        super('undefined');
    }
}

/**
 * literal type
 * @category core/base/type
 */
export class LiteralType extends PrimitiveType {
    private literalName: string | number;

    constructor(literalName: string | number) {
        super('literal');
        this.literalName = literalName;
    }

    public getliteralName(): string | number {
        return this.literalName;
    }

    public toString(): string {
        return this.getName() + ': ' + this.literalName;
    }
}

/**
 * union type
 * @category core/base/type
 */
export class UnionType extends Type {
    private types: Type[];
    private currType: Type;  // The true type of the value at this time  
    constructor(types: Type[], currType: Type = UnknownType.getInstance()) {
        super();
        this.types = [...types];
        this.currType = currType;
    }

    public getTypes(): Type[] {
        return this.types;
    }

    public getCurrType(): Type {
        return this.currType;
    }

    public setCurrType(newType: Type): void {
        this.currType = newType;
    }

    public toString(): string {
        let typeStr = this.types.join('|');
        if (!(this.currType instanceof UnknownType) && this.currType != this) {
            typeStr += '-' + this.currType;
        }
        return typeStr;
    }
}

/**
 * types for function void return type
 * @category core/base/type
 */
export class VoidType extends Type {
    private static readonly INSTANCE = new VoidType();

    public static getInstance(): VoidType {
        return this.INSTANCE;
    }

    constructor() {
        super();
    }

    public toString(): string {
        return 'void';
    }
}

export class NeverType extends Type {
    private static readonly INSTANCE = new NeverType();

    public static getInstance(): NeverType {
        return this.INSTANCE;
    }

    constructor() {
        super();
    }

    public toString(): string {
        return 'never';
    }
}

/**
 * function type
 * @category core/base/type
 */
export class FunctionType extends Type {
    private methodSignature: MethodSignature;

    constructor(methodSignature: MethodSignature) {
        super();
        this.methodSignature = methodSignature;
    }

    public getMethodSignature(): MethodSignature {
        return this.methodSignature;
    }

    public toString(): string {
        return this.methodSignature.toString();
    }
}

/**
 * type of an object
 * @category core/base/type
 */
export class ClassType extends Type {
    private classSignature: ClassSignature;

    constructor(classSignature: ClassSignature) {
        super();
        this.classSignature = classSignature;
    }

    public getClassSignature(): ClassSignature {
        return this.classSignature;
    }

    public setClassSignature(newClassSignature: ClassSignature): void {
        this.classSignature = newClassSignature;
    }

    public toString(): string {
        return this.classSignature.toString();
    }
}

export class ArrayType extends Type {
    private baseType: Type;
    private dimension: number;

    constructor(baseType: Type, dimension: number) {
        super();
        this.baseType = baseType;
        this.dimension = dimension;
    }

    public getBaseType(): Type {
        return this.baseType;
    }

    public setBaseType(newType: Type): void {
        this.baseType = newType;
    }

    public getDimension(): number {
        return this.dimension;
    }

    public toString(): string {
        const strs: string[] = [];
        if (this.baseType instanceof UnionType) {
            strs.push('(' + this.baseType.toString() + ')');
        } else if (this.baseType) {
            strs.push(this.baseType.toString());
        }
        for (let i = 0; i < this.dimension; i++) {
            strs.push('[]');
        }
        return strs.join('');
    }
}

export class ArrayObjectType extends ArrayType {
    constructor(baseType: Type, dimension: number) {
        super(baseType, dimension);
    }

    public toString(): string {
        return 'Array<' + this.getBaseType() + '>[]';
    }
}

export class TupleType extends Type {
    private types: Type[];

    constructor(types: Type[]) {
        super();
        this.types = types;
    }

    public getTypes(): Type[] {
        return this.types;
    }

    public toString(): string {
        return '[' + this.types.join(', ') + ']';
    }
}

export class AliasType extends Type {
    private originalType: Type;

    constructor(originalType: Type) {
        super();
        this.originalType = originalType;
    }

    public getOriginalType(): Type {
        return this.originalType;
    }

    public toString(): string {
        return 'alias: ' + this.originalType;
    }
}

/**
 * type of the type alias for the class
 * @category core/base/type
 */
export class ClassAliasType extends AliasType {
    constructor(classType: ClassType) {
        super(classType);
    }
}

export class TypeLiteralType extends Type {
    private members: ArkField[] = [];

    constructor() {
        super();
    }

    public getMembers() {
        return this.members;
    }

    public setMembers(members: ArkField[]) {
        this.members = members;
    }

    public addMember(member: ArkField) {
        this.members.push(member);
    }

    public toString() {
        let strMembers: string[] = [];
        this.members.forEach((member) => {
            strMembers.push(member.getName().toString());
        });
        return '[' + strMembers.join(', ') + ']';
    }

}

export abstract class AnnotationType extends Type {
    private originType: string;

    protected constructor(originType: string) {
        super();
        this.originType = originType;
    }

    public getOriginType(): string {
        return this.originType;
    }

    public toString() {
        return this.originType;
    }
}

export class AnnotationNamespaceType extends AnnotationType {
    private namespaceSignature: NamespaceSignature;

    public static getInstance(signature: NamespaceSignature): AnnotationNamespaceType {
        const type = new AnnotationNamespaceType(signature.getNamespaceName());
        type.setNamespaceSignature(signature);
        return type;
    }

    public getNamespaceSignature(): NamespaceSignature {
        return this.namespaceSignature;
    }

    public setNamespaceSignature(signature: NamespaceSignature): void {
        this.namespaceSignature = signature;
    }

    constructor(originType: string) {
        super(originType);
    }

    public getOriginType(): string {
        return super.getOriginType();
    }
}

export class AnnotationTypeQueryType extends AnnotationType {
    constructor(originType: string) {
        super(originType);
    }
}
