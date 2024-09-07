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

import Logger, { LOG_MODULE_TYPE } from '../../utils/logger';
import { BaseSignature, FieldSignature } from '../model/ArkSignature';
import { Local } from './Local';
import { AnnotationNamespaceType, ArrayType, ClassType, Type, UnclearReferenceType, UnknownType, } from './Type';
import { Value } from './Value';
import { ArkClass } from '../model/ArkClass';
import { TypeInference } from '../common/TypeInference';
import { ValueUtil } from '../common/ValueUtil';
import { CLASS_ORIGIN_TYPE_OBJECT } from "../common/Const";

const logger = Logger.getLogger(LOG_MODULE_TYPE.ARKANALYZER, 'Ref');

/**
 * @category core/base/ref
 */
export abstract class AbstractRef implements Value {
    abstract getUses(): Value[];

    abstract getType(): Type;

    public inferType(arkClass: ArkClass): AbstractRef {
        return this;
    }
}

export class ArkArrayRef extends AbstractRef {
    private base: Local;  // 数组变量
    private index: Value; // 索引

    constructor(base: Local, index: Value) {
        super();
        this.base = base;
        this.index = index;
    }

    public getBase(): Local {
        return this.base;
    }

    public setBase(newBase: Local): void {
        this.base = newBase;
    }

    public getIndex(): Value {
        return this.index;
    }

    public setIndex(newIndex: Value): void {
        this.index = newIndex;
    }

    public getType(): Type {
        const baseType = this.base.getType();
        if (baseType instanceof ArrayType) {
            return baseType.getBaseType();
        } else {
            logger.warn(`the type of base in ArrayRef is not ArrayType`);
            return UnknownType.getInstance();
        }
    }

    public getUses(): Value[] {
        let uses: Value[] = [];
        uses.push(this.base);
        uses.push(...this.base.getUses());
        uses.push(this.index);
        uses.push(...this.index.getUses());
        return uses;
    }

    public toString(): string {
        return this.base + '[' + this.index + ']';
    }
}

export abstract class AbstractFieldRef extends AbstractRef {
    private fieldSignature: FieldSignature;

    constructor(fieldSignature: FieldSignature) {
        super();
        this.fieldSignature = fieldSignature;
    }

    public getFieldName(): string {
        return this.fieldSignature.getFieldName();
    }

    public getFieldSignature(): FieldSignature {
        return this.fieldSignature;
    }

    public setFieldSignature(newFieldSignature: FieldSignature): void {
        this.fieldSignature = newFieldSignature;
    }

    public getType(): Type {
        return this.fieldSignature.getType();
    }
}

export class ArkInstanceFieldRef extends AbstractFieldRef {
    private base: Local;       // which obj this field belong to

    constructor(base: Local, fieldSignature: FieldSignature) {
        super(fieldSignature);
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
        return uses;
    }

    public toString(): string {
        return this.base.toString() + '.<' + this.getFieldSignature() + '>';
    }

    public inferType(arkClass: ArkClass): AbstractRef {
        let baseType: Type | null = this.base.getType();
        if (this.base instanceof Local && baseType instanceof UnknownType) {
            baseType = TypeInference.inferBaseType(this.base.getName(), arkClass);
            if (!baseType && (arkClass.hasComponentDecorator() || arkClass.getOriginType() === CLASS_ORIGIN_TYPE_OBJECT)) {
                const global = arkClass.getDeclaringArkFile().getScene().getSdkGlobal(this.base.getName());
                baseType = TypeInference.parseArkExport2Type(global);
            }
        } else if (baseType instanceof UnclearReferenceType) {
            baseType = TypeInference.inferUnclearReferenceType(baseType.getName(), arkClass);
        }
        if (!baseType) {
            logger.warn('infer field ref base type fail: ' + this.toString());
            return this;
        }
        if (this.base instanceof Local) {
            this.base.setType(baseType);
        }

        if (baseType instanceof ArrayType && this.getFieldName() !== 'length') {
            return new ArkArrayRef(this.base, ValueUtil.createConst(this.getFieldName()));
        }

        const oldFieldSignature = this.getFieldSignature();
        let fieldNewType = oldFieldSignature.getType();
        const fieldType = TypeInference.inferFieldType(baseType, this.getFieldName(), arkClass);
        if (fieldType) {
            fieldNewType = fieldType;
        }

        let newDeclaringSignatureOfField: BaseSignature;
        if (baseType instanceof ClassType) {
            newDeclaringSignatureOfField = baseType.getClassSignature();
            const cls = arkClass.getDeclaringArkFile().getScene().getClass(baseType.getClassSignature());
            if (cls?.getStaticFieldWithName(this.getFieldName()) || cls?.getStaticMethodWithName(this.getFieldName())) {
                return new ArkStaticFieldRef(
                    new FieldSignature(oldFieldSignature.getFieldName(), newDeclaringSignatureOfField, fieldNewType,
                        oldFieldSignature.isStatic()));
            }

            this.setFieldSignature(
                new FieldSignature(oldFieldSignature.getFieldName(), newDeclaringSignatureOfField, fieldNewType,
                    oldFieldSignature.isStatic()));
            return this;
        } else if (baseType instanceof AnnotationNamespaceType) {
            newDeclaringSignatureOfField = baseType.getNamespaceSignature();
            return new ArkStaticFieldRef(
                new FieldSignature(oldFieldSignature.getFieldName(), newDeclaringSignatureOfField, fieldNewType,
                    oldFieldSignature.isStatic()));
        }
        logger.warn('infer field ref FieldSignature type fail: ' + this.toString());
        this.setFieldSignature(
            new FieldSignature(oldFieldSignature.getFieldName(), oldFieldSignature.getDeclaringSignature(), fieldNewType,
                oldFieldSignature.isStatic()));
        return this;
    }
}

export class ArkStaticFieldRef extends AbstractFieldRef {
    constructor(fieldSignature: FieldSignature) {
        super(fieldSignature);
    }

    public getUses(): Value[] {
        let uses: Value[] = [];
        return uses;
    }

    public toString(): string {
        return this.getFieldSignature().toString();
    }
}

export class ArkParameterRef extends AbstractRef {
    private index: number;
    private paramType: Type;

    constructor(index: number, paramType: Type) {
        super();
        this.index = index;
        this.paramType = paramType;
    }

    public getIndex(): number {
        return this.index;
    }

    public getType(): Type {
        return this.paramType;
    }

    public setType(newType: Type): void {
        this.paramType = newType;
    }

    public getUses(): Value[] {
        let uses: Value[] = [];
        return uses;
    }

    public toString(): string {
        return 'parameter' + this.index + ': ' + this.paramType;
    }
}


export class ArkThisRef extends AbstractRef {
    private type: ClassType;

    constructor(type: ClassType) {
        super();
        this.type = type;
    }

    public getType(): ClassType {
        return this.type;
    }

    public getUses(): Value[] {
        let uses: Value[] = [];
        return uses;
    }

    public toString(): string {
        return 'this: ' + this.type;
    }
}

export class ArkCaughtExceptionRef extends AbstractRef {
    private type: Type;

    constructor(type: Type) {
        super();
        this.type = type;
    }

    public getType(): Type {
        return this.type;
    }

    public getUses(): Value[] {
        let uses: Value[] = [];
        return uses;
    }

    public toString(): string {
        return 'caughtexception: ' + this.type;
    }
}