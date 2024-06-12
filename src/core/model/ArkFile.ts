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

import { ModuleScene, Scene } from '../../Scene';
import { ExportInfo } from './ArkExport';
import { ImportInfo } from './ArkImport';
import { ArkClass } from "./ArkClass";
import { ArkNamespace } from "./ArkNamespace";
import { ClassSignature, FileSignature, NamespaceSignature } from "./ArkSignature";

export const notStmtOrExprKind = ['ModuleDeclaration', 'ClassDeclaration', 'InterfaceDeclaration', 'EnumDeclaration', 'ExportDeclaration',
    'ExportAssignment', 'MethodDeclaration', 'Constructor', 'FunctionDeclaration', 'GetAccessor', 'SetAccessor', 'ArrowFunction',
    'FunctionExpression', 'MethodSignature', 'ConstructSignature', 'CallSignature'];

/**
 *
 */
export class ArkFile {

    private name: string; //name also means the relative path
    private absoluteFilePath: string;
    private projectDir: string;
    private projectName: string = "";
    private code: string;

    private defaultClass: ArkClass;

    // name to model
    private namespaces: Map<string, ArkNamespace> = new Map<string, ArkNamespace>(); // don't contain nested namespaces
    private classes: Map<string, ArkClass> = new Map<string, ArkClass>(); // don't contain class in namespace

    private importInfos: ImportInfo[] = [];
    private exportInfos: ExportInfo[] = [];

    private scene: Scene;
    private moduleScene: ModuleScene;

    private fileSignature: FileSignature;

    private ohPackageJson5Path: string[] = [];

    private anonymousClassNumber: number = 0;

    constructor() {
    }

    public setName(name: string) {
        this.name = name;
    }

    public getName() {
        return this.name;
    }

    public setScene(scene: Scene) {
        this.scene = scene;
    }

    public getScene() {
        return this.scene;
    }

    public getModuleScene() {
        return this.moduleScene;
    }

    public setModuleScene(moduleScene: ModuleScene) {
        this.moduleScene = moduleScene;
    }

    public setProjectDir(projectDir: string) {
        this.projectDir = projectDir;
    }

    public getProjectDir(): string {
        return this.projectDir;
    }

    public getFilePath(): string {
        return this.absoluteFilePath;
    }

    public setFilePath(absoluteFilePath: string) {
        this.absoluteFilePath = absoluteFilePath;
    }

    public setCode(code: string) {
        this.code = code;
    }

    public getCode() {
        return this.code;
    }

    public addArkClass(arkClass: ArkClass) {
        this.classes.set(arkClass.getName(), arkClass);
    }

    public getDefaultClass() {
        return this.defaultClass;
    }

    public setDefaultClass(defaultClass: ArkClass) {
        this.defaultClass = defaultClass;
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

    public addNamespace(namespace: ArkNamespace) {
        this.namespaces.set(namespace.getName(), namespace);
    }

    public getImportInfos(): ImportInfo[] {
        return this.importInfos;
    }

    public addImportInfos(importInfo: ImportInfo) {
        this.importInfos.push(importInfo);
    }

    public getExportInfos(): ExportInfo[] {
        return this.exportInfos;
    }

    public addExportInfos(exportInfo: ExportInfo) {
        this.exportInfos.push(exportInfo);
    }

    public setProjectName(projectName: string) {
        this.projectName = projectName;
    }

    public getProjectName() {
        return this.projectName;
    }

    public getModuleName() {
        return this.moduleScene.getModuleName();;
    }

    public setOhPackageJson5Path(ohPackageJson5Path: string[]) {
        this.ohPackageJson5Path = ohPackageJson5Path;
    }

    public getOhPackageJson5Path() {
        return this.ohPackageJson5Path;
    }

    public genFileSignature() {
        let fileSignature = new FileSignature();
        fileSignature.setFileName(this.name);
        fileSignature.setProjectName(this.projectName);
        this.fileSignature = fileSignature;
    }

    public getFileSignature() {
        return this.fileSignature;
    }

    public getAllNamespacesUnderThisFile(): ArkNamespace[] {
        let namespaces: ArkNamespace[] = [];
        namespaces.push(...this.namespaces.values());
        this.namespaces.forEach((ns) => {
            namespaces.push(...ns.getAllNamespacesUnderThisNamespace());
        });
        return namespaces;
    }

    public getAnonymousClassNumber() {
        return this.anonymousClassNumber++;
    }
}