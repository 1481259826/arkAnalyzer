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

import fs from 'fs';
import path from 'path';

import { SceneConfig, Sdk } from './Config';
import { AbstractCallGraph } from './callgraph/AbstractCallGraphAlgorithm';
import { ClassHierarchyAnalysisAlgorithm } from './callgraph/ClassHierarchyAnalysisAlgorithm';
import { RapidTypeAnalysisAlgorithm } from './callgraph/RapidTypeAnalysisAlgorithm';
import { VariablePointerAnalysisAlogorithm } from './callgraph/VariablePointerAnalysisAlgorithm';
import { ImportInfo } from './core/model/ArkImport';
import { ModelUtils } from './core/common/ModelUtils';
import { TypeInference } from './core/common/TypeInference';
import { VisibleValue } from './core/common/VisibleValue';
import { ArkClass } from './core/model/ArkClass';
import { ArkFile } from './core/model/ArkFile';
import { ArkMethod } from './core/model/ArkMethod';
import { ArkNamespace } from './core/model/ArkNamespace';
import { ClassSignature, FileSignature, MethodSignature, NamespaceSignature } from './core/model/ArkSignature';
import Logger from './utils/logger';
import { Local } from './core/base/Local';
import { buildArkFileFromFile } from './core/model/builder/ArkFileBuilder';
import { fetchDependenciesFromFile, parseJsonText } from './utils/json5parser';
import { getAllFiles } from './utils/getAllFiles';
import { getFileRecursively } from './utils/FileUtils';
import { ExportType } from './core/model/ArkExport';
import { generateDefaultClassField, StaticInitMethodName } from './core/model/builder/ArkClassBuilder';
import { CallableType, ClassType } from './core/base/Type';
import { addInitInConstructor, buildDefaultConstructor } from './core/model/builder/ArkMethodBuilder';
import { CALLBACK_METHOD_NAME, getAbilities, getCallbackMethodFromStmt, LIFECYCLE_METHOD_NAME } from './utils/entryMethodUtils';

const logger = Logger.getLogger();

enum SceneBuildStage {
    BUILD_INIT,
    CLASS_DONE,
    METHOD_DONE,
};

/**
 * The Scene class includes everything in the analyzed project.
 * We should be able to re-generate the project's code based on this class.
 */
export class Scene {
    private projectName: string = '';
    private projectFiles: string[] = [];
    private realProjectDir: string;

    private moduleScenesMap: Map<string, ModuleScene> = new Map();
    private modulePath2NameMap: Map<string, string> = new Map<string, string>();

    private extendedClasses: Map<string, ArkClass[]> = new Map();
    private globalImportInfos: ImportInfo[] = [];

    private moduleSdkMap: Map<string, Sdk[]> = new Map();
    private projectSdkMap: Map<string, Sdk> = new Map();

    private sdkFilesProjectMap: Map<string[], string> = new Map<string[], string>();

    // values that are visible in curr scope
    private visibleValue: VisibleValue = new VisibleValue();

    // signature string to model
    private filesMap: Map<string, ArkFile> = new Map();
    private namespacesMap: Map<string, ArkNamespace> = new Map();
    private classesMap: Map<string, ArkClass> = new Map();
    private methodsMap: Map<string, ArkMethod> = new Map();
    // TODO: type of key should be signature object
    private sdkArkFilesMap: Map<string, ArkFile> = new Map<string, ArkFile>();

    private ohPkgContentMap: Map<string, { [k: string]: unknown }> = new Map<string, { [k: string]: unknown }>();
    private ohPkgFilePath: string = '';
    private ohPkgContent: { [k: string]: unknown } = {};

    private buildStage: SceneBuildStage = SceneBuildStage.BUILD_INIT;

    constructor() {
    }

    public getStage(): SceneBuildStage {
        return this.buildStage;
    }

    public buildSceneFromProjectDir(sceneConfig: SceneConfig) {
        this.buildBasicInfo(sceneConfig);
        this.genArkFiles();
        this.collectProjectImportInfos();
    }

    public buildBasicInfo(sceneConfig: SceneConfig) {
        this.projectName = sceneConfig.getTargetProjectName();
        this.realProjectDir = fs.realpathSync(sceneConfig.getTargetProjectDirectory());
        this.projectFiles = sceneConfig.getProjectFiles();

        const buildProfile = path.join(this.realProjectDir, './build-profile.json5');
        if (fs.existsSync(buildProfile)) {
            const buildProfileJson = parseJsonText(fs.readFileSync(buildProfile, 'utf-8'));
            const modules = buildProfileJson.modules;
            if (modules instanceof Array) {
                modules.forEach((module) => {
                    this.modulePath2NameMap.set(path.resolve(this.realProjectDir, path.join(module.srcPath)), module.name);
                });
            }
        } else {
            logger.warn('There is no build-profile.json5 for this project.');
        }

        const OhPkgFilePath = path.join(this.realProjectDir, './oh-package.json5');
        if (fs.existsSync(OhPkgFilePath)) {
            this.ohPkgFilePath = OhPkgFilePath;
            this.ohPkgContent = fetchDependenciesFromFile(this.ohPkgFilePath);
            this.ohPkgContentMap.set(OhPkgFilePath, this.ohPkgContent);
        } else {
            logger.warn('This project has no oh-package.json5!');
        }

        // handle sdks
        sceneConfig.getSdksObj()?.forEach((sdk) => {
            if (!sdk.moduleName) {
                this.buildSdk(sdk.name, sdk.path);
                this.projectSdkMap.set(sdk.name, sdk);
            } else {
                let moduleSdks = this.moduleSdkMap.get(sdk.moduleName);
                if (moduleSdks) {
                    moduleSdks.push(sdk);
                } else {
                    this.moduleSdkMap.set(sdk.moduleName, [sdk]);
                }
            }
        });
    }

    private addDefaultConstructors(): void {
        for (const file of this.getFiles()) {
            for (const cls of ModelUtils.getAllClassesInFile(file)) {
                buildDefaultConstructor(cls);
                addInitInConstructor(cls);
            }
        }
    }

    private buildAllMethodBody() {
        this.buildStage = SceneBuildStage.CLASS_DONE;
        for (const file of this.getFiles()) {
            for (const cls of file.getClasses()) {
                for (const method of cls.getMethods(true)) {
                    method.buildBody();
                }
            }
        }
        for (const namespace of this.getNamespacesMap().values()) {
            for (const cls of namespace.getClasses()) {
                for (const method of cls.getMethods(true)) {
                    method.buildBody();
                }
            }
        }

        this.buildStage = SceneBuildStage.METHOD_DONE;
    }

    private genArkFiles() {
        this.projectFiles.forEach((file) => {
            logger.info('=== parse file:', file);
            let arkFile: ArkFile = new ArkFile();
            arkFile.setScene(this);
            arkFile.setProjectName(this.projectName);
            buildArkFileFromFile(file, this.realProjectDir, arkFile);
            this.filesMap.set(arkFile.getFileSignature().toString(), arkFile);
        });
        this.buildAllMethodBody();
        this.genExtendedClasses();
        this.addDefaultConstructors();
    }

    private buildSdk(sdkName: string, sdkPath: string) {
        const allFiles = getAllFiles(sdkPath, ['.ets', '.ts']);
        allFiles.forEach((file) => {
            logger.info('=== parse sdk file:', file);
            let arkFile: ArkFile = new ArkFile();
            arkFile.setScene(this);
            arkFile.setProjectName(sdkName);
            buildArkFileFromFile(file, path.normalize(sdkPath), arkFile);
            const fileSig = arkFile.getFileSignature().toString();
            this.sdkArkFilesMap.set(fileSig, arkFile);
        });
    }

    public buildScene4HarmonyProject() {
        this.modulePath2NameMap.forEach((value, key) => {
            const moduleOhPkgFilePath = path.resolve(key, './oh-package.json5');
            if (fs.existsSync(moduleOhPkgFilePath)) {
                const moduleOhPkgContent = fetchDependenciesFromFile(moduleOhPkgFilePath);
                this.ohPkgContentMap.set(moduleOhPkgFilePath, moduleOhPkgContent);
            }

            let moduleScene = new ModuleScene();
            moduleScene.ModuleScenBuilder(value, key, this);
            this.moduleScenesMap.set(value, moduleScene);
        });

        this.buildAllMethodBody();
        this.genExtendedClasses();
        this.addDefaultConstructors();
    }

    public buildModuleScene(moduleName: string, modulePath: string) {
        if (this.moduleScenesMap.get(moduleName)) {
            return;
        }

        // get oh-package.json5
        const moduleOhPkgFilePath = path.resolve(this.realProjectDir, path.join(modulePath, './oh-package.json5'));
        if (fs.existsSync(moduleOhPkgFilePath)) {
            const moduleOhPkgContent = fetchDependenciesFromFile(moduleOhPkgFilePath);
            this.ohPkgContentMap.set(moduleOhPkgFilePath, moduleOhPkgContent);
        } else {
            logger.warn('Module: ', moduleName, 'has no oh-package.json5.');
        }

        // parse moduleOhPkgContent, get dependencies and build dependent module
        const moduleOhPkgContent = this.ohPkgContentMap.get(moduleOhPkgFilePath);
        if (moduleOhPkgContent) {
            if (moduleOhPkgContent.dependencies instanceof Object) {
                Object.entries(moduleOhPkgContent.dependencies).forEach(([k, v]) => {
                    const pattern = new RegExp('^(\\.\\.\\/\|\\.\\/)');
                    if (typeof (v) === 'string') {
                        let dependencyModulePath: string = '';
                        if (pattern.test(v)) {
                            dependencyModulePath = path.join(moduleOhPkgFilePath, v);
                        } else if (v.startsWith('file:')) {
                            const dependencyFilePath = path.join(moduleOhPkgFilePath, v.replace(/^file:/, ''));
                            const dependencyOhPkgPath = getFileRecursively(path.dirname(dependencyFilePath), 'oh-package.json5');
                            dependencyModulePath = path.dirname(dependencyOhPkgPath);
                        }
                        logger.info('Dependency path: ', dependencyModulePath);
                        const dependencyModuleName = this.modulePath2NameMap.get(dependencyModulePath);
                        if (dependencyModuleName) {
                            this.buildModuleScene(dependencyModuleName, dependencyModulePath);
                        }
                    }
                });
            }
        }

        let moduleScene = new ModuleScene();
        moduleScene.ModuleScenBuilder(moduleName, modulePath, this);
        this.moduleScenesMap.set(moduleName, moduleScene);

        this.buildAllMethodBody();
    }

    public getRealProjectDir(): string {
        return this.realProjectDir;
    }

    public getProjectName(): string {
        return this.projectName;
    }

    public getProjectFiles() {
        return this.projectFiles;
    }

    public getFile(fileSignature: FileSignature): ArkFile | null {
        if (this.projectName === fileSignature.getProjectName()) {
            return this.filesMap.get(fileSignature.toString()) || null;
        } else {
            return this.sdkArkFilesMap.get(fileSignature.toString()) || null;
        }
    }

    public getFiles(): ArkFile[] {
        return Array.from(this.filesMap.values());
    }

    public getSdkArkFilesMap() {
        return this.sdkArkFilesMap;
    }

    public getModuleSdkMap() {
        return this.moduleSdkMap;
    }

    public getProjectSdkMap() {
        return this.projectSdkMap;
    }

    public getFilesMap() {
        return this.filesMap;
    }

    public getNamespace(namespaceSignature: NamespaceSignature): ArkNamespace | null {
        if (this.projectName === namespaceSignature.getDeclaringFileSignature().getProjectName()) {
            return this.getNamespacesMap().get(namespaceSignature.toString()) || null;
        } else {
            const arkFile = this.sdkArkFilesMap.get(namespaceSignature.getDeclaringFileSignature().toString());
            return arkFile?.getNamespace(namespaceSignature) || null;
        }
    }

    private getNamespacesMap(): Map<string, ArkNamespace> {
        if (this.namespacesMap.size == 0) {
            for (const file of this.getFiles()) {
                ModelUtils.getAllNamespacesInFile(file).forEach((namespace) => {
                    this.namespacesMap.set(namespace.getNamespaceSignature().toString(), namespace);
                });
            }
        }
        return this.namespacesMap;
    }

    public getNamespaces(): ArkNamespace[] {
        return Array.from(this.getNamespacesMap().values());
    }

    public getClass(classSignature: ClassSignature): ArkClass | null {
        if (this.projectName === classSignature.getDeclaringFileSignature().getProjectName()) {
            return this.getClassesMap().get(classSignature.toString()) || null;
        } else {
            const arkFile = this.sdkArkFilesMap.get(classSignature.getDeclaringFileSignature().toString());
            const namespaceSignature = classSignature.getDeclaringNamespaceSignature();
            if (namespaceSignature) {
                return arkFile?.getNamespace(namespaceSignature)?.getClass(classSignature) || null;
            }
            return arkFile?.getClass(classSignature) || null;
        }
    }

    private getClassesMap(refresh?: boolean): Map<string, ArkClass> {
        if (refresh || this.buildStage >= SceneBuildStage.CLASS_DONE) {
            for (const file of this.getFiles()) {
                for (const cls of file.getClasses()) {
                    this.classesMap.set(cls.getSignature().toString(), cls);
                }
            }
            for (const namespace of this.getNamespacesMap().values()) {
                for (const cls of namespace.getClasses()) {
                    this.classesMap.set(cls.getSignature().toString(), cls);
                }
            }
        }
        return this.classesMap;
    }

    public getClasses(): ArkClass[] {
        return Array.from(this.getClassesMap().values());
    }

    public getMethod(methodSignature: MethodSignature): ArkMethod | null {
        if (this.projectName === methodSignature.getDeclaringClassSignature().getDeclaringFileSignature().getProjectName()) {
            return this.getMethodsMap().get(methodSignature.toString()) || null;
        } else {
            return this.getClass(methodSignature.getDeclaringClassSignature())?.getMethod(methodSignature) || null;
        }
    }

    private getMethodsMap(refresh?: boolean): Map<string, ArkMethod> {
        if (refresh || this.buildStage >= SceneBuildStage.CLASS_DONE) {
            for (const cls of this.getClassesMap().values()) {
                for (const method of cls.getMethods(true)) {
                    this.methodsMap.set(method.getSignature().toString(), method);
                }
            }
        }
        return this.methodsMap;
    }

    public getMethods(): ArkMethod[] {
        return Array.from(this.getMethodsMap().values());
    }

    public hasMainMethod(): boolean {
        return false;
    }

    //Get the set of entry points that are used to build the call graph.
    public getEntryPoints() {
        return [];
    }

    /** get values that is visible in curr scope */
    public getVisibleValue(): VisibleValue {
        return this.visibleValue;
    }

    public getOhPkgContent() {
        return this.ohPkgContent;
    }

    public getOhPkgContentMap() {
        return this.ohPkgContentMap;
    }

    public getOhPkgFilePath() {
        return this.ohPkgFilePath;
    }

    public makeCallGraphCHA(entryPoints: MethodSignature[]): AbstractCallGraph {
        let callGraphCHA: AbstractCallGraph;
        callGraphCHA = new ClassHierarchyAnalysisAlgorithm(this);
        callGraphCHA.loadCallGraph(entryPoints);
        return callGraphCHA;
    }

    public makeCallGraphRTA(entryPoints: MethodSignature[]): AbstractCallGraph {
        let callGraphRTA: AbstractCallGraph;
        callGraphRTA = new RapidTypeAnalysisAlgorithm(this);
        callGraphRTA.loadCallGraph(entryPoints);
        return callGraphRTA;
    }

    public makeCallGraphVPA(entryPoints: MethodSignature[]): AbstractCallGraph {
        // WIP context-insensitive 上下文不敏感
        let callGraphVPA: AbstractCallGraph;
        callGraphVPA = new VariablePointerAnalysisAlogorithm(this);
        callGraphVPA.loadCallGraph(entryPoints);
        return callGraphVPA;
    }

    /**
     * inference type for each non-default method
     * because default method was finished
     */
    public inferTypes() {
        this.getClassesMap().forEach(arkClass => {
            if (arkClass.isDefaultArkClass()) {
                generateDefaultClassField(arkClass);
            }
            arkClass.getFields().forEach(arkField => TypeInference.inferTypeInArkField(arkField));
        });
        this.getMethodsMap().forEach(arkMethod => {
            if (!arkMethod.isDefaultArkMethod()) {
                TypeInference.inferTypeInMethod(arkMethod);
            }
        });
    }

    /**
     * @Deprecated
     */
    public inferSimpleTypes() {

        for (let arkFile of this.getFiles()) {
            for (let arkClass of arkFile.getClasses()) {
                for (let arkMethod of arkClass.getMethods()) {
                    TypeInference.inferSimpleTypeInMethod(arkMethod);
                }
            }
        }
    }

    public collectProjectImportInfos() {
        this.getFiles().forEach((arkFile) => {
            arkFile.getImportInfos().forEach((importInfo) => {
                this.globalImportInfos.push(importInfo);
            });
        });
    }

    private genExtendedClasses() {
        this.getClassesMap().forEach((cls) => {
            if (cls.getSuperClassName() !== '') {
                const type = TypeInference.inferUnclearReferenceType(cls.getSuperClassName(), cls);
                let superClass;
                if (type && type instanceof ClassType) {
                    superClass = cls.getDeclaringArkFile().getScene().getClass(type.getClassSignature());
                }
                if (superClass) {
                    cls.setSuperClass(superClass);
                    superClass.addExtendedClass(cls);
                }
            }
        });
    }

    public getClassMap(): Map<FileSignature | NamespaceSignature, ArkClass[]> {
        const classMap: Map<FileSignature | NamespaceSignature, ArkClass[]> = new Map();
        for (const file of this.getFiles()) {
            const fileClass: ArkClass[] = [];
            const namespaceStack: ArkNamespace[] = [];
            const parentMap: Map<ArkNamespace, ArkNamespace | ArkFile> = new Map();
            const finalNamespaces: ArkNamespace[] = [];
            for (const arkClass of file.getClasses()) {
                fileClass.push(arkClass);
            }
            for (const ns of file.getNamespaces()) {
                namespaceStack.push(ns);
                parentMap.set(ns, file);
            }

            classMap.set(file.getFileSignature(), fileClass);
            const stack = [...namespaceStack];
            // 第一轮遍历，加上每个namespace自己的class
            while (namespaceStack.length > 0) {
                const ns = namespaceStack.shift()!;
                const nsClass: ArkClass[] = [];
                for (const arkClass of ns.getClasses()) {
                    nsClass.push(arkClass);
                }
                classMap.set(ns.getNamespaceSignature(), nsClass);
                if (ns.getNamespaces().length == 0) {
                    finalNamespaces.push(ns);
                } else {
                    for (const nsns of ns.getNamespaces()) {
                        namespaceStack.push(nsns);
                        parentMap.set(nsns, ns);
                    }
                }
            }
            // 第二轮遍历，父节点加上子节点的export的class
            while (finalNamespaces.length > 0) {
                const finalNS = finalNamespaces.shift()!;
                const exportClass = [];
                for (const arkClass of finalNS.getClasses()) {
                    if (arkClass.isExported()) {
                        exportClass.push(arkClass);
                    }
                }
                const parent = parentMap.get(finalNS)!;
                if (parent instanceof ArkNamespace) {
                    classMap.get(parent.getNamespaceSignature())?.push(...exportClass);
                } else if (parent instanceof ArkFile) {
                    classMap.get(parent.getFileSignature())?.push(...exportClass);
                }
                let p = finalNS;
                while (!(parentMap.get(p) instanceof ArkFile) && p.isExported()) {
                    const grandParent = parentMap.get(parentMap.get(p)! as ArkNamespace);
                    if (grandParent instanceof ArkNamespace) {
                        classMap.get(grandParent.getNamespaceSignature())?.push(...exportClass);
                        p = parentMap.get(p)! as ArkNamespace;
                    } else if (grandParent instanceof ArkFile) {
                        classMap.get(grandParent.getFileSignature())?.push(...exportClass);
                        break;
                    }
                }
                if (parent instanceof ArkNamespace && !finalNamespaces.includes(parent)) {
                    finalNamespaces.push(parent);
                }
            }
        }

        for (const file of this.getFiles()) {
            // 文件加上import的class，包括ns的
            const importClasses: ArkClass[] = [];
            const importNameSpaces: ArkNamespace[] = [];
            for (const importInfo of file.getImportInfos()) {
                const importClass = ModelUtils.getClassInImportInfoWithName(importInfo.getImportClauseName(), file);
                if (importClass && !importClasses.includes(importClass)) {
                    importClasses.push(importClass);
                    continue;
                }
                const importNameSpace = ModelUtils.getNamespaceInImportInfoWithName(importInfo.getImportClauseName(), file);
                if (importNameSpace && !importNameSpaces.includes(importNameSpace)) {
                    try {
                        // 遗留问题：只统计了项目文件的namespace，没统计sdk文件内部的引入
                        const importNameSpaceClasses = classMap.get(importNameSpace.getNamespaceSignature())!;
                        importClasses.push(...importNameSpaceClasses.filter(c => !importClasses.includes(c) && c.getName() != '_DEFAULT_ARK_CLASS'));
                    } catch {
                        // logger.log(importNameSpace)
                    }

                }
            }
            const fileClasses = classMap.get(file.getFileSignature())!;
            fileClasses.push(...importClasses.filter(c => !fileClasses.includes(c)));
            // 子节点加上父节点的class
            const namespaceStack = [...file.getNamespaces()];
            for (const ns of namespaceStack) {
                const nsClasses = classMap.get(ns.getNamespaceSignature())!;
                nsClasses.push(...fileClasses.filter(c => !nsClasses.includes(c) && c.getName() != '_DEFAULT_ARK_CLASS'));
            }
            while (namespaceStack.length > 0) {
                const ns = namespaceStack.shift()!;
                const nsClasses = classMap.get(ns.getNamespaceSignature())!;
                for (const nsns of ns.getNamespaces()) {
                    const nsnsClasses = classMap.get(nsns.getNamespaceSignature())!;
                    nsnsClasses.push(...nsClasses.filter(c => !nsnsClasses.includes(c) && c.getName() != '_DEFAULT_ARK_CLASS'));
                    namespaceStack.push(nsns);
                }
            }
        }
        return classMap;
    }

    public getGlobalVariableMap(): Map<FileSignature | NamespaceSignature, Local[]> {
        const globalVariableMap: Map<FileSignature | NamespaceSignature, Local[]> = new Map();
        for (const file of this.getFiles()) {
            const namespaceStack: ArkNamespace[] = [];
            const parentMap: Map<ArkNamespace, ArkNamespace | ArkFile> = new Map();
            const finalNamespaces: ArkNamespace[] = [];
            const globalLocals: Local[] = [];
            file.getDefaultClass()?.getDefaultArkMethod()!.getBody()?.getLocals().forEach(local => {
                if (local.getDeclaringStmt() && local.getName() != 'this' && local.getName()[0] != '$') {
                    globalLocals.push(local);
                }
            });
            globalVariableMap.set(file.getFileSignature(), globalLocals);
            for (const ns of file.getNamespaces()) {
                namespaceStack.push(ns);
                parentMap.set(ns, file);
            }
            const stack = [...namespaceStack];
            // 第一轮遍历，加上每个namespace自己的local
            while (namespaceStack.length > 0) {
                const ns = namespaceStack.shift()!;
                const nsGlobalLocals: Local[] = [];
                ns.getDefaultClass().getDefaultArkMethod()!.getBody()?.getLocals().forEach(local => {
                    if (local.getDeclaringStmt() && local.getName() != 'this' && local.getName()[0] != '$') {
                        nsGlobalLocals.push(local);
                    }
                });
                globalVariableMap.set(ns.getNamespaceSignature(), nsGlobalLocals);
                if (ns.getNamespaces().length == 0) {
                    finalNamespaces.push(ns);
                } else {
                    for (const nsns of ns.getNamespaces()) {
                        namespaceStack.push(nsns);
                        parentMap.set(nsns, ns);
                    }
                }
            }
            // 第二轮遍历，父节点加上子节点的export的local
            while (finalNamespaces.length > 0) {
                const finalNS = finalNamespaces.shift()!;
                const exportLocal = [];
                for (const exportInfo of finalNS.getExportInfos()) {
                    if (exportInfo.getExportClauseType() === ExportType.LOCAL && exportInfo.getTypeSignature()) {
                        exportLocal.push(exportInfo.getTypeSignature() as Local);
                    }
                }
                const parent = parentMap.get(finalNS)!;
                if (parent instanceof ArkNamespace) {
                    globalVariableMap.get(parent.getNamespaceSignature())?.push(...exportLocal);
                } else if (parent instanceof ArkFile) {
                    globalVariableMap.get(parent.getFileSignature())?.push(...exportLocal);
                }
                let p = finalNS;
                while (!(parentMap.get(p) instanceof ArkFile) && p.isExported()) {
                    const grandParent = parentMap.get(parentMap.get(p)! as ArkNamespace);
                    if (grandParent instanceof ArkNamespace) {
                        globalVariableMap.get(grandParent.getNamespaceSignature())?.push(...exportLocal);
                        p = parentMap.get(p)! as ArkNamespace;
                    } else if (grandParent instanceof ArkFile) {
                        globalVariableMap.get(grandParent.getFileSignature())?.push(...exportLocal);
                        break;
                    }
                }
                if (parent instanceof ArkNamespace && !finalNamespaces.includes(parent)) {
                    finalNamespaces.push(parent);
                }
            }
        }

        for (const file of this.getFiles()) {
            // 文件加上import的local，包括ns的
            const importLocals: Local[] = [];
            const importNameSpaces: ArkNamespace[] = [];
            for (const importInfo of file.getImportInfos()) {
                const importLocal = ModelUtils.getLocalInImportInfoWithName(importInfo.getImportClauseName(), file);
                if (importLocal && !importLocals.includes(importLocal)) {
                    importLocals.push(importLocal);
                }
                const importNameSpace = ModelUtils.getNamespaceInImportInfoWithName(importInfo.getImportClauseName(), file);
                if (importNameSpace && !importNameSpaces.includes(importNameSpace)) {
                    try {
                        // 遗留问题：只统计了项目文件，没统计sdk文件内部的引入
                        const importNameSpaceClasses = globalVariableMap.get(importNameSpace.getNamespaceSignature())!;
                        importLocals.push(...importNameSpaceClasses.filter(c => !importLocals.includes(c) && c.getName() != '_DEFAULT_ARK_CLASS'));
                    } catch {
                        // logger.log(importNameSpace)
                    }

                }
            }
            const fileLocals = globalVariableMap.get(file.getFileSignature())!;
            fileLocals.push(...importLocals.filter(c => !fileLocals.includes(c)));
            // 子节点加上父节点的local
            const namespaceStack = [...file.getNamespaces()];
            for (const ns of namespaceStack) {
                const nsLocals = globalVariableMap.get(ns.getNamespaceSignature())!;
                const nsLocalNameSet = new Set<string>(nsLocals.map(item => item.getName()));
                for (const local of fileLocals) {
                    if (!nsLocalNameSet.has(local.getName())) {
                        nsLocals.push(local);
                    }
                }
            }
            while (namespaceStack.length > 0) {
                const ns = namespaceStack.shift()!;
                const nsLocals = globalVariableMap.get(ns.getNamespaceSignature())!;
                for (const nsns of ns.getNamespaces()) {
                    const nsnsLocals = globalVariableMap.get(nsns.getNamespaceSignature())!;
                    const nsnsLocalNameSet = new Set<string>(nsnsLocals.map(item => item.getName()));
                    for (const local of nsLocals) {
                        if (!nsnsLocalNameSet.has(local.getName())) {
                            nsnsLocals.push(local);
                        }
                    }
                    namespaceStack.push(nsns);
                }
            }
        }
        return globalVariableMap;
    }

    public getEntryMethodsFromModuleJson5(): ArkMethod[] {
        const projectDir = this.getRealProjectDir();
        const buildProfile = path.join(projectDir, 'build-profile.json5');
        if (!fs.existsSync(buildProfile)) {
            logger.error(`${buildProfile} is not exists.`);
            return [];
        }

        const abilities: ArkClass[] = [];
        const buildProfileConfig = fetchDependenciesFromFile(buildProfile);
        let modules: Array<any> | undefined;
        if (buildProfileConfig instanceof Object) {
            Object.entries(buildProfileConfig).forEach(([k, v]) => {
                if (k == 'modules' && Array.isArray(v)) {
                    modules = v;
                    return;
                }
            });
        }
        if (Array.isArray(modules)) {
            for (const module of modules) {
                try {
                    const moduleProfile = path.join(projectDir, module.srcPath, '/src/main/module.json5');
                    const config = fetchDependenciesFromFile(moduleProfile);
                    const configModule = config.module;
                    if (configModule instanceof Object) {
                        Object.entries(configModule).forEach(([k, v]) => {
                            if (k == 'abilities') {
                                abilities.push(...getAbilities(v, path.join(projectDir, module.srcPath), this));
                            } else if (k == 'extensionAbilities') {
                                abilities.push(...getAbilities(v, path.join(projectDir, module.srcPath), this));
                            }
                        });
                    }
                } catch (err) {
                    logger.error(err);
                }
            }
        }

        const entryMethods: ArkMethod[] = [];
        for (const ability of abilities) {
            const abilityEntryMethods: ArkMethod[] = [];
            let cls = ability;
            // 遍历父类，加入子类中没有的method
            while (cls) {
                for (const method of cls.getMethods()) {
                    for (const modifier of method.getModifiers()) {
                        if (modifier == 'private') {
                            continue;
                        }
                    }
                    for (const mtd of abilityEntryMethods) {
                        if (mtd.getName() == method.getName()) {
                            continue;
                        }
                    }
                    if (LIFECYCLE_METHOD_NAME.includes(method.getName()) && !entryMethods.includes(method)) {
                        abilityEntryMethods.push(method);
                    }
                }
                cls = cls.getSuperClass();
            }
            entryMethods.push(...abilityEntryMethods);
        }
        return entryMethods;
    }

    getCallbackMethods(): ArkMethod[] {
        const callbackMethods: ArkMethod[] = [];
        this.getMethods().forEach(method => {
            if (!method.getCfg()) {
                return;
            }
            method.getCfg()!.getBlocks().forEach(block => {
                block.getStmts().forEach(stmt => {
                    const cbMethod = getCallbackMethodFromStmt(stmt, this);
                    if (cbMethod && !callbackMethods.includes(cbMethod)) {
                        callbackMethods.push(cbMethod);
                    }
                });
            });
        });
        return callbackMethods;
    }

    public getStaticInitMethods(): ArkMethod[] {
        const staticInitMethods: ArkMethod[] = []
        for (const method of Array.from(this.getMethodsMap(true).values())) {
            if (method.getName() == StaticInitMethodName) {
                staticInitMethods.push(method);
            }
        }
        return staticInitMethods;
    }

    public buildClassDone(): boolean {
        return this.buildStage >= SceneBuildStage.CLASS_DONE;
    }

    public getModuleScene(moduleName: string) {
        return this.moduleScenesMap.get(moduleName);
    }

    public getModuleSceneMap(): Map<string, ModuleScene> {
        return this.moduleScenesMap;
    }
}

export class ModuleScene {
    private projectScene: Scene;
    private moduleName: string = '';
    private modulePath: string = '';

    private moduleOhPkgFilePath: string = '';

    private otherSdkMap: Map<string, string> = new Map();
    private ohPkgContent: { [k: string]: unknown } = {};

    private moduleImportInfos: ImportInfo[] = [];

    private filesMap: Map<string, ArkFile> = new Map();
    private namespacesMap: Map<string, ArkNamespace> = new Map();
    private classesMap: Map<string, ArkClass> = new Map();
    private methodsMap: Map<string, ArkMethod> = new Map();

    constructor() {
    }

    public ModuleScenBuilder(moduleName: string, modulePath: string, projectScene: Scene, recursively: boolean = false) {
        this.moduleName = moduleName;
        this.modulePath = modulePath;
        this.projectScene = projectScene;

        this.getModuleOhPkgFilePath();

        if (this.moduleOhPkgFilePath) {
            this.ohPkgContent = fetchDependenciesFromFile(this.moduleOhPkgFilePath);
        } else {
            logger.warn('This module has no oh-package.json5!');
        }

        this.genArkFiles();
    }

    /**
     * get oh-package.json5
     */
    private getModuleOhPkgFilePath() {
        const moduleOhPkgFilePath = path.resolve(this.projectScene.getRealProjectDir(), path.join(this.modulePath, './oh-package.json5'));
        if (fs.existsSync(moduleOhPkgFilePath)) {
            this.moduleOhPkgFilePath = moduleOhPkgFilePath;
        }
    }

    /**
     * get nodule name
     * @returns return module name
     */
    public getModuleName(): string {
        return this.moduleName;
    }

    public getModulePath(): string {
        return this.modulePath;
    }

    public getOhPkgFilePath() {
        return this.moduleOhPkgFilePath;
    }

    public getOhPkgContent() {
        return this.ohPkgContent;
    }

    private genArkFiles() {
        getAllFiles(this.modulePath, ['.ets', '.ts']).forEach((file) => {
            logger.info('=== parse file:', file);
            let arkFile: ArkFile = new ArkFile();
            arkFile.setScene(this.projectScene);
            arkFile.setModuleScene(this);
            arkFile.setProjectName(this.projectScene.getProjectName());
            buildArkFileFromFile(file, this.projectScene.getRealProjectDir(), arkFile);
            const fileSig = arkFile.getFileSignature().toString();
            this.filesMap.set(fileSig, arkFile);
            this.projectScene.getFilesMap().set(fileSig, arkFile);
        });
    }
}