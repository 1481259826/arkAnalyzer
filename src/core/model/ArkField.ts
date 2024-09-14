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

import { Decorator } from '../base/Decorator';
import { LineColPosition } from '../base/Position';
import { Stmt } from '../base/Stmt';
import { BUILDER_PARAM_DECORATOR } from '../common/EtsConst';
import { ArkClass } from './ArkClass';
import { FieldSignature } from './ArkSignature';
import { Type } from '../base/Type';

const COMPONENT_MEMBER_DECORATORS: Set<string> = new Set([
    'State', 'Prop', 'Link', 'StorageProp', 'StorageLink',
    'Provide', 'Consume', 'ObjectLink',
    'LocalStorageLink', 'LocalStorageProp',
    'Local', 'Param', 'Event', 'Provider', 'Consumer'
])

export enum FieldCategory {
    PROPERTY_DECLARATION = 0,
    PROPERTY_ASSIGNMENT = 1,
    SHORT_HAND_PROPERTY_ASSIGNMENT = 2,
    SPREAD_ASSIGNMENT = 3,
    PROPERTY_SIGNATURE = 4,
    ENUM_MEMBER = 5,
    INDEX_SIGNATURE = 6,
    GET_ACCESSOR = 7,
}

/**
 * @category core/model
 */
export class ArkField {
    private code: string = "";
    private category!: FieldCategory;

    private declaringClass!: ArkClass;

    private modifiers: Set<string | Decorator> = new Set<string | Decorator>();
    private questionToken: boolean = false;
    private exclamationToken: boolean = false;

    private fieldSignature!: FieldSignature;
    private originPosition?: LineColPosition;

    private initializer: Stmt[] = [];

    constructor() {
    }

    public getDeclaringArkClass() {
        return this.declaringClass;
    }

    public setDeclaringArkClass(declaringClass: ArkClass) {
        this.declaringClass = declaringClass;
    }

    public getCode() {
        return this.code;
    }

    public setCode(code: string) {
        this.code = code;
    }

    public getCategory(): FieldCategory {
        return this.category;
    }

    public setCategory(category: FieldCategory): void {
        this.category = category;
    }

    public getName() {
        return this.fieldSignature.getFieldName();
    }

    public getType():Type {
        return this.fieldSignature.getType();
    }

    public getModifiers() {
        return this.modifiers;
    }

    public addModifier(modifier: string | Decorator) {
        this.modifiers.add(modifier);
    }

    public getSignature(): FieldSignature {
        return this.fieldSignature;
    }

    public setSignature(fieldSig: FieldSignature) {
        this.fieldSignature = fieldSig;
    }

    public getInitializer(): Stmt[] {
        return this.initializer;
    }

    public setInitializer(initializer: Stmt[]) {
        this.initializer = initializer;
    }

    public isStatic(): boolean {
        if (this.modifiers.has("StaticKeyword")) {
            return true;
        }
        return false;
    }

    public isProtected(): boolean {
        if (this.modifiers.has("ProtectedKeyword")) {
            return true;
        }
        return false;
    }

    public isPrivate(): boolean {
        if (this.modifiers.has("PrivateKeyword")) {
            return true;
        }
        return false;
    }

    public isPublic(): boolean {
        if (this.modifiers.has("PublicKeyword")) {
            return true;
        }
        return false;
    }

    public isReadonly(): boolean {
        if (this.modifiers.has("ReadonlyKeyword")) {
            return true;
        }
        return false;
    }

    public setQuestionToken(questionToken: boolean) {
        this.questionToken = questionToken;
    }

    public setExclamationToken(exclamationToken: boolean) {
        this.exclamationToken = exclamationToken;
    }

    public getQuestionToken() {
        return this.questionToken;
    }

    public getExclamationToken() {
        return this.exclamationToken;
    }

    public setOriginPosition(position: LineColPosition) {
        this.originPosition = position;
    }

    public getOriginPosition(): LineColPosition {
        return this.originPosition ?? LineColPosition.DEFAULT;
    }

    public getDecorators(): Decorator[] {
        return Array.from(this.modifiers).filter((item) => {
            return item instanceof Decorator;
        }) as Decorator[];
    }

    public getStateDecorators(): Decorator[] {
        return Array.from(this.modifiers).filter((item) => {
            return (item instanceof Decorator) && (COMPONENT_MEMBER_DECORATORS.has(item.getKind()));
        }) as Decorator[];
    }

    public hasBuilderParamDecorator(): boolean {
        let decorators = this.getDecorators();
        return decorators.filter((value) => {
            return value.getKind() == BUILDER_PARAM_DECORATOR;
        }).length != 0;
    }
}