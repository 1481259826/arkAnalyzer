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
import { ArkExport, ExportInfo, ExportType } from "./ArkExport";
import { ArkClass } from "./ArkClass";
import { ArkFile } from "./ArkFile";
import { ArkMethod } from "./ArkMethod";
import { ClassSignature, NamespaceSignature } from "./ArkSignature";

/**
 * @category core/model
 */
export class ArkNamespace implements ArkExport {
    private name: string;
    private code: string
    private line: number = -1;
    private column: number = -1;

    private declaringArkFile: ArkFile;
    private declaringArkNamespace: ArkNamespace | null = null;

    private declaringInstance: ArkFile | ArkNamespace;
    private declaringType: string;

    private modifiers: Set<string | Decorator> = new Set<string | Decorator>();
    private exportInfos: Map<string, ExportInfo> = new Map<string, ExportInfo>();

    private defaultClass: ArkClass;

    // name to model
    private namespaces: Map<string, ArkNamespace> = new Map<string, ArkNamespace>(); // don't contain nested namespace
    private classes: Map<string, ArkClass> = new Map<string, ArkClass>();

    private namespaceSignature: NamespaceSignature;

    private anonymousClassNumber: number = 0;

    constructor() {
    }

    public addNamespace(namespace: ArkNamespace) {
        this.namespaces.set(namespace.getName(), namespace);
    }

    public getNamespace(namespaceSignature: NamespaceSignature): ArkNamespace | null {
        const namespaceName = namespaceSignature.getNamespaceName();
        return this.getNamespaceWithName(namespaceName);
    }

    public getNamespaceWithName(namespaceName: string): ArkNamespace | null {
        return this.namespaces.get(namespaceName) || null;
    }

    public getNamespaces(): ArkNamespace[] {
        return Array.from(this.namespaces.values());
    }

    public genNamespaceSignature() {
        let namespaceSignature = new NamespaceSignature();
        namespaceSignature.setNamespaceName(this.name);
        namespaceSignature.setDeclaringFileSignature(this.declaringArkFile.getFileSignature());
        if (this.declaringArkNamespace) {
            namespaceSignature.setDeclaringNamespaceSignature(this.declaringArkNamespace.getNamespaceSignature());
        }
        this.namespaceSignature = namespaceSignature;
    }

    public getSignature() {
        return this.namespaceSignature;
    }

    public getNamespaceSignature() {
        return this.namespaceSignature;
    }

    public getName() {
        return this.name;
    }

    public setName(name: string) {
        this.name = name;
    }

    public getCode() {
        return this.code;
    }

    public setCode(code: string) {
        this.code = code;
    }

    public getLine() {
        return this.line;
    }

    public setLine(line: number) {
        this.line = line;
    }

    public getColumn() {
        return this.column;
    }

    public setColumn(column: number) {
        this.column = column;
    }

    public setDeclaringType(declaringType: string) {
        this.declaringType = declaringType;
    }

    public getDeclaringType() {
        return this.declaringType;
    }

    public getDeclaringInstance() {
        return this.declaringInstance;
    }

    public setDeclaringInstance(declaringInstance: ArkFile | ArkNamespace) {
        this.declaringInstance = declaringInstance;
    }

    public getDeclaringArkFile() {
        return this.declaringArkFile;
    }

    public setDeclaringArkFile(declaringArkFile: ArkFile) {
        this.declaringArkFile = declaringArkFile;
    }

    public getDeclaringArkNamespace() {
        return this.declaringArkNamespace;
    }

    public setDeclaringArkNamespace(declaringArkNamespace: ArkNamespace) {
        this.declaringArkNamespace = declaringArkNamespace;
    }

    public getModifiers() {
        return this.modifiers;
    }

    public addModifier(name: string | Decorator) {
        this.modifiers.add(name);
    }

    public containsModifier(name: string) {
        return this.modifiers.has(name);
    }

    public getClass(classSignature: ClassSignature): ArkClass | null {
        const className = classSignature.getClassName();
        return this.getClassWithName(className);
    }

    public getClassWithName(Class: string): ArkClass | null {
        return this.classes.get(Class) || null;
    }

    public getClasses(): ArkClass[] {
        return Array.from(this.classes.values());
    }

    public addArkClass(arkClass: ArkClass) {
        this.classes.set(arkClass.getName(), arkClass);
    }

    public isExported(): boolean {
        return this.containsModifier('ExportKeyword');
    }

    public getExportInfos(): ExportInfo[] {
        return Array.from(this.exportInfos.values());
    }

    public getExportInfosMap(): Map<string, ExportInfo> {
        return this.exportInfos;
    }

    public addExportInfo(exportInfo: ExportInfo) {
        this.exportInfos.set(exportInfo.getExportClauseName(), exportInfo);
    }

    public getDefaultClass() {
        return this.defaultClass;
    }

    public setDefaultClass(defaultClass: ArkClass) {
        this.defaultClass = defaultClass;
    }

    public getAllMethodsUnderThisNamespace(): ArkMethod[] {
        let methods: ArkMethod[] = [];
        this.classes.forEach((cls) => {
            methods.push(...cls.getMethods());
        });
        this.namespaces.forEach((ns) => {
            methods.push(...ns.getAllMethodsUnderThisNamespace());
        });
        return methods;
    }

    public getAllClassesUnderThisNamespace(): ArkClass[] {
        let classes: ArkClass[] = [];
        classes.push(...this.classes.values());
        this.namespaces.forEach((ns) => {
            classes.push(...ns.getAllClassesUnderThisNamespace());
        });
        return classes;
    }

    public getAllNamespacesUnderThisNamespace(): ArkNamespace[] {
        let namespaces: ArkNamespace[] = [];
        namespaces.push(...this.namespaces.values());
        this.namespaces.forEach((ns) => {
            namespaces.push(...ns.getAllNamespacesUnderThisNamespace());
        });
        return namespaces;
    }

    public getDecorators(): Decorator[] {
        return Array.from(this.modifiers).filter((item) => {
            return item instanceof Decorator;
        }) as Decorator[];
    }

    public getAnonymousClassNumber() {
        return this.anonymousClassNumber++;
    }

    getExportType(): ExportType {
        return ExportType.NAME_SPACE;
    }
}

