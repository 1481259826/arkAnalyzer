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

import path from 'path';
import { transfer2UnixPath } from '../../utils/pathTransfer';
import { ClassType, Type, UnknownType } from '../base/Type';
import { MethodParameter } from './builder/ArkMethodBuilder';
import Logger from "../../utils/logger";

export type Signature = FileSignature | NamespaceSignature | ClassSignature | MethodSignature | FieldSignature;

const logger = Logger.getLogger();

export interface ArkSignature {
    getSignature(): Signature;
}

/**
 * @category core/model
 */
export class FileSignature {
    private projectName: string = "_UnkownProjectName";
    private fileName: string = "_UnkownFileName";

    constructor() {
    }

    public getProjectName() {
        return this.projectName;
    }

    public setProjectName(projectName: string) {
        this.projectName = projectName;
    }

    public getFileName() {
        return this.fileName;
    }

    public setFileName(fileName: string) {
        this.fileName = fileName;
    }

    public toString(): string {
        let tmpSig = transfer2UnixPath(this.fileName);
        tmpSig = tmpSig.replace(/\.d\.ts|\.ts|\.ets$/, '');
        tmpSig = '@' + this.projectName + '/' + tmpSig + ': ';
        return tmpSig;
    }
}

export class NamespaceSignature {
    private namespaceName: string = "";
    private declaringFileSignature: FileSignature = new FileSignature();
    private declaringNamespaceSignature: NamespaceSignature | null = null;

    constructor() {
    }

    public getNamespaceName() {
        return this.namespaceName;
    }

    public setNamespaceName(namespaceName: string) {
        this.namespaceName = namespaceName;
    }

    public getDeclaringFileSignature() {
        return this.declaringFileSignature;
    }

    public setDeclaringFileSignature(declaringFileSignature: FileSignature) {
        this.declaringFileSignature = declaringFileSignature;
    }

    public getDeclaringNamespaceSignature() {
        return this.declaringNamespaceSignature;
    }

    public setDeclaringNamespaceSignature(declaringNamespaceSignature: NamespaceSignature) {
        this.declaringNamespaceSignature = declaringNamespaceSignature;
    }

    public toString(): string {
        if (this.declaringNamespaceSignature) {
            return this.declaringNamespaceSignature.toString() + '.' + this.namespaceName;
        } else {
            return this.declaringFileSignature.toString() + this.namespaceName;
        }
    }
}

export class ClassSignature {
    private declaringFileSignature: FileSignature = new FileSignature();
    private declaringNamespaceSignature: NamespaceSignature | null = null;
    private className: string = "";

    public getDeclaringFileSignature() {
        return this.declaringFileSignature;
    }

    public setDeclaringFileSignature(declaringFileSignature: FileSignature) {
        this.declaringFileSignature = declaringFileSignature;
    }

    public getDeclaringNamespaceSignature() {
        return this.declaringNamespaceSignature;
    }

    public setDeclaringNamespaceSignature(declaringNamespaceSignature: NamespaceSignature) {
        this.declaringNamespaceSignature = declaringNamespaceSignature;
    }

    public getClassName() {
        return this.className;
    }

    public setClassName(className: string) {
        this.className = className;
    }

    public getType(): ClassType {
        return new ClassType(this);
    }

    constructor() {
    }

    public toString(): string {
        if (this.declaringNamespaceSignature) {
            return this.declaringNamespaceSignature.toString() + '.' + this.className;
        } else {
            return this.declaringFileSignature.toString() + this.className;
        }
    }
}

export class FieldSignature {
    private declaringClassSignature: ClassSignature = new ClassSignature();
    private fieldName: string = '';
    private type: Type = UnknownType.getInstance();
    private static: boolean = false;

    public getDeclaringClassSignature() {
        return this.declaringClassSignature;
    }

    public setDeclaringClassSignature(declaringClassSignature: ClassSignature) {
        this.declaringClassSignature = declaringClassSignature;
    }

    public getFieldName() {
        return this.fieldName;
    }

    public setFieldName(fieldName: string) {
        this.fieldName = fieldName;
    }

    public setType(newType: Type): void {
        this.type = newType;
    }

    public getType(): Type {
        return this.type;
    }

    public setStatic() {
        this.static = true;
    }

    public isStatic() {
        return this.static;
    }

    constructor() {
    }

    public toString(): string {
        let tmpSig = this.fieldName;
        if (this.isStatic()) {
            tmpSig = '[static]' + tmpSig;
        }
        return this.getDeclaringClassSignature().toString() + '.' + tmpSig;
    }
}

export class MethodSubSignature {
    private methodName: string = '';
    private parameters: MethodParameter[] = [];
    private parameterTypes: Set<Type> = new Set<Type>();
    private returnType: Type = UnknownType.getInstance();
    private static: boolean = false;

    public getMethodName() {
        return this.methodName;
    }

    public setMethodName(methodName: string) {
        this.methodName = methodName;
    }

    public getParameters() {
        return this.parameters;
    }

    public getParameterTypes() {
        return this.parameterTypes;
    }

    public setParameters(parameter: MethodParameter[]) {
        this.parameters = parameter;
        parameter.forEach((value) => {
            this.parameterTypes.add(value.getType());
        });
    }

    public getReturnType() {
        return this.returnType;
    }

    public setReturnType(returnType: Type) {
        this.returnType = returnType;
    }

    public setStatic() {
        this.static = true;
    }

    public isStatic() {
        return this.static;
    }

    constructor() {
    }

    public toString(): string {
        let paraStr = "";
        this.parameterTypes.forEach((parameterType) => {
            paraStr += parameterType.toString() + ", ";
        });
        paraStr = paraStr.replace(/, $/, '');
        let tmpSig =  `${this.getMethodName()}(${paraStr})`;
        if (this.isStatic()) {
            tmpSig = '[static]' + tmpSig;
        }
        return tmpSig;
    }
}

/**
 * @category core/model
 */
export class MethodSignature {
    private declaringClassSignature: ClassSignature = new ClassSignature();
    private methodSubSignature: MethodSubSignature = new MethodSubSignature();

    public getDeclaringClassSignature() {
        return this.declaringClassSignature;
    }

    public setDeclaringClassSignature(declaringClassSignature: ClassSignature) {
        this.declaringClassSignature = declaringClassSignature;
    }

    public getMethodSubSignature() {
        return this.methodSubSignature;
    }

    public setMethodSubSignature(methodSubSig: MethodSubSignature) {
        this.methodSubSignature = methodSubSig;
    }

    public getType(): Type {
        return this.methodSubSignature.getReturnType();
    }

    constructor() {
    }

    public toString(): string {
        return this.declaringClassSignature.toString() + '.' + this.methodSubSignature.toString();
    }
}

export class InterfaceSignature {
    private arkFile: string = '';
    private interfaceName: string = '';
    private arkFileWithoutExt: string = '';

    public getArkFile() {
        return this.arkFile;
    }

    public setArkFile(arkFile: string) {
        this.arkFile = arkFile;
    }

    public getInterfaceName() {
        return this.interfaceName;
    }

    public setInterfaceName(interfaceName: string) {
        this.interfaceName = interfaceName;
    }

    constructor() {
    }

    public build(arkFile: string, interfaceName: string) {
        this.setArkFile(arkFile);
        this.setInterfaceName(interfaceName);
        this.arkFileWithoutExt = path.dirname(arkFile) + '/' + path.basename(arkFile, path.extname(arkFile));
    }

    public toString(): string {
        return `<${this.getArkFile()}>.<#Interface#>.<${this.getInterfaceName()}>`
    }
}

//TODO, reconstruct
export function fieldSignatureCompare(leftSig: FieldSignature, rightSig: FieldSignature): boolean {
    if (classSignatureCompare(leftSig.getDeclaringClassSignature(), rightSig.getDeclaringClassSignature()) &&
        (leftSig.getFieldName() == rightSig.getFieldName())) {
        return true;
    }
    return false;
}

export function methodSignatureCompare(leftSig: MethodSignature, rightSig: MethodSignature): boolean {
    if (classSignatureCompare(leftSig.getDeclaringClassSignature(), rightSig.getDeclaringClassSignature()) &&
        methodSubSignatureCompare(leftSig.getMethodSubSignature(), rightSig.getMethodSubSignature())) {
        return true;
    }
    return false;
}

export function methodSubSignatureCompare(leftSig: MethodSubSignature, rightSig: MethodSubSignature): boolean {
    if ((leftSig.getMethodName() == rightSig.getMethodName()) && setCompare(leftSig.getParameterTypes(),
        rightSig.getParameterTypes()) && leftSig.getReturnType() == rightSig.getReturnType()) {
        return true;
    }
    return false;
}

export function classSignatureCompare(leftSig: ClassSignature, rightSig: ClassSignature): boolean {
    if ((fileSignatureCompare(leftSig.getDeclaringFileSignature(), rightSig.getDeclaringFileSignature())) &&
        (leftSig.getClassName() == rightSig.getClassName())) {
        return true;
    }
    return false;
}

export function fileSignatureCompare(leftSig: FileSignature, rightSig: FileSignature): boolean {
    if ((leftSig.getFileName() == rightSig.getFileName()) && (leftSig.getProjectName() == rightSig.getProjectName())) {
        return true;
    }
    return false;
}

function arrayCompare(leftArray: any[], rightArray: any[]) {
    if (leftArray.length != rightArray.length) {
        return false;
    }
    for (let i = 0; i < leftArray.length; i++) {
        if (leftArray[i] != rightArray[i]) {
            return false;
        }
    }
    return true;
}

function setCompare(leftSet: Set<Type>, rightSet: Set<Type>) {
    const arr1 = Array.from(leftSet);
    const arr2 = Array.from(rightSet);
    return arrayCompare(arr1, arr2);
}

function undateFilePath(filePath: string) {
    let reg = /\//g;
    let unixArkFilePath = path.posix.join(...filePath.split(/\\/));
    return unixArkFilePath.replace(reg, '.');
}

export function genSignature4ImportClause(arkFileName: string, importClauseName: string): string {
    return `<${arkFileName}>.<${importClauseName}>`;
}