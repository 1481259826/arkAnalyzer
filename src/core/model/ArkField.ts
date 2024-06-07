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

import { Decorator } from "../base/Decorator";
import { LineColPosition } from "../base/Position";
import { Type } from "../base/Type";
import { Value } from "../base/Value";
import { ArkClass } from "./ArkClass";
import { FieldSignature, MethodSignature } from "./ArkSignature";
import { MethodParameter } from "./builder/ArkMethodBuilder";

const COMPONENT_MEMBER_DECORATORS: Set<string> = new Set([
    'State', 'Prop', 'Link', 'StorageProp', 'StorageLink',
    'Provide', 'Consume', 'ObjectLink', 
    'LocalStorageLink', 'LocalStorageProp', 
    'Local', 'Param', 'Event', 'Provider', 'Consumer'
])

export class ArkField {
    private name: string = "";
    private code: string = "";
    private fieldType: string = "";

    private declaringClass: ArkClass;

    private type: Type;
    private parameters: MethodParameter[] = [];
    private typeParameters: Type[] = [];
    private modifiers: Set<string | Decorator> = new Set<string | Decorator>();
    private questionToken: boolean = false;
    private exclamationToken: boolean = false;

    private fieldSignature: FieldSignature;
    private originPosition: LineColPosition;

    private arkMethodSignature: MethodSignature;

    private initializer: Value;

    constructor() { }

    public getDeclaringClass() {
        return this.declaringClass;
    }

    public setDeclaringClass(declaringClass: ArkClass) {
        this.declaringClass = declaringClass;
    }

    public getCode() {
        return this.code;
    }

    public setCode(code: string) {
        this.code = code;
    }

    public getFieldType() {
        return this.fieldType;
    }

    public setFieldType(fieldType: string) {
        this.fieldType = fieldType;
    }

    public getName() {
        return this.name;
    }

    public setName(name: string) {
        this.name = name;
    }

    public getType() {
        return this.type;
    }

    public setType(type: Type) {
        this.type = type;
    }

    public getParameters() {
        return this.parameters;
    }

    public setParameters(parameters: MethodParameter[]) {
        this.parameters = parameters;
    }

    public addParameter(parameter: MethodParameter) {
        this.typeParameters.push(parameter);
    }

    public getTypeParameters() {
        return this.typeParameters;
    }

    public setTypeParameters(typeParameters: Type[]) {
        this.typeParameters = typeParameters;
    }

    public addTypeParameters(typeParameter: Type) {
        this.typeParameters.push(typeParameter);
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

    public genSignature() {
        let fieldSig = new FieldSignature();
        fieldSig.setType(this.type);
        fieldSig.setDeclaringClassSignature(this.declaringClass.getSignature());
        fieldSig.setFieldName(this.name);
        this.setSignature(fieldSig);
    }

    public getInitializer() {
        return this.initializer;
    }

    public setInitializer(initializer: Value) {
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
        return this.originPosition;
    }

    public setArkMethodSignature(methodSignature: MethodSignature) {
        this.arkMethodSignature = methodSignature;
    }

    public getArkMethodSignature() {
        return this.arkMethodSignature;
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
}