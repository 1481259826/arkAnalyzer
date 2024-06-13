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

import * as ts from "ohos-typescript";
import path from 'path';
import fs from 'fs';
import { transfer2UnixPath } from "../../utils/pathTransfer";
import { ArkFile } from "./ArkFile";
import { FileSignature } from "./ArkSignature";
import { Scene } from "../../Scene";
import { LineColPosition } from "../base/Position";
import { getOriginPath } from "./builder/ArkImportBuilder";
import { Decorator } from "../base/Decorator";

var sdkPathMap: Map<string, string> = new Map();

export function updateSdkConfigPrefix(sdkName: string, sdkRelativePath: string) {
    sdkPathMap.set(sdkName, transfer2UnixPath(sdkRelativePath));
}

export class ImportInfo {
    private importClauseName: string;
    private importType: string;
    private importFrom: string;
    private nameBeforeAs: string | undefined;
    private clauseType: string = "";
    private modifiers: Set<string | Decorator> = new Set<string | Decorator>();

    private declaringArkFile: ArkFile;

    private importFromSignature: string | FileSignature = "";
    private importProjectType: string = "ThirdPartPackage";
    private declaringFilePath: string;
    private projectPath: string;

    private originTsPosition: LineColPosition;
    private tsSourceCode: string;

    constructor() {
    }

    public build(importClauseName: string, importType: string, importFrom: string, originTsPosition: LineColPosition,
        modifiers: Set<string | Decorator>, nameBeforeAs?: string) {
        this.setImportClauseName(importClauseName);
        this.setImportType(importType);
        this.setImportFrom(importFrom);
        this.setOriginTsPosition(originTsPosition);
        modifiers.forEach((modifier) => {
            this.addModifier(modifier);
        });
        this.setNameBeforeAs(nameBeforeAs);
    }

    public getImportFromSignature() {
        return this.importFromSignature;
    }

    public getImportProjectType() {
        return this.importProjectType;
    }

    public setImportProjectType(importProjectType: string) {
        this.importProjectType = importProjectType;
    }

    public setDeclaringFilePath(declaringFilePath: string) {
        this.declaringFilePath = declaringFilePath;
    }

    public setDeclaringArkFile(declaringArkFile: ArkFile) {
        this.declaringArkFile = declaringArkFile;
    }

    public setProjectPath(projectPath: string) {
        this.projectPath = projectPath;
    }

    public setImportFromSignature() {
        let importFromSignature = new FileSignature();

        // project internal imports
        const pathReg1 = new RegExp("^(\\.\\.\\/\|\\.\\/)");
        if (pathReg1.test(this.importFrom)) {
            this.setImportProjectType("TargetProject");
            //get real target path of importfrom
            let realImportFromPath = path.resolve(path.dirname(this.declaringFilePath), this.importFrom);
            //get relative path from project dir to real target path of importfrom
            let tmpSig1 = path.relative(this.projectPath, realImportFromPath);
            //tmpSig1 = tmpSig1.replace(/^\.\//, '');
            importFromSignature.setFileName(tmpSig1);
            importFromSignature.setProjectName(this.declaringArkFile.getProjectName());
            this.importFromSignature = importFromSignature;
            return;
        }

        // sdk imports, e.g. @ohos., @kit.
        const pathReg2 = new RegExp(`@ohos\\.`);
        const pathReg3 = new RegExp(`@kit\\.`);
        let tmpSig = '';
        if (pathReg2.test(this.importFrom)) {
            tmpSig = '@etsSdk/api/' + this.importFrom + ': ';
        } else if (pathReg3.test(this.importFrom)) {
            tmpSig = '@etsSdk/kits/' + this.importFrom + ': ';
        }
        if (tmpSig !== '') {
            this.setImportProjectType("SDKProject");
            this.importFromSignature = tmpSig;
            return;
        }

        // path map defined in oh-package.json5
        let originImportPath: string = getOriginPath(this.importFrom, this.declaringArkFile);
        if (originImportPath != '') {
            this.setImportProjectType("TargetProject");
            const relativeImportPath: string = path.relative(this.projectPath, originImportPath);
            importFromSignature.setFileName(relativeImportPath);
            importFromSignature.setProjectName(this.declaringArkFile.getProjectName());
            this.importFromSignature = importFromSignature.toString();
            return;
        }

        // project sdk or module sdk
        //module
        const moduleSdkMap = this.declaringArkFile.getScene().getModuleSdkMap();
        const moduleScene = this.declaringArkFile.getModuleScene();
        if (moduleScene) {
            const moduleSdks = moduleSdkMap.get(moduleScene.getModuleName());
            moduleSdks?.forEach((moduleSdk) => {
                if (this.importFrom === moduleSdk.name) {
                    this.setImportProjectType("SDKProject");
                    // TODO: get files like index.ts and gen import signature (consider ets, .d.ets, ts, .d.ts, js)
                    //this.importFromSignature = this.importFrom + ': ';
                }
            });
        }
        //project
        const projectSdkMap = this.declaringArkFile.getScene().getProjectSdkMap();
        const sdk = projectSdkMap.get(this.importFrom);
        if (sdk) {
            this.setImportProjectType("SDKProject");
            // TODO: get files like index.ts and gen import signature (consider ets, .d.ets, ts, .d.ts, js)
            //this.importFromSignature = this.importFrom + ': ';
        }
    }

    public getImportClauseName() {
        return this.importClauseName;
    }

    public setImportClauseName(importClauseName: string) {
        this.importClauseName = importClauseName;
    }

    public getImportType() {
        return this.importType;
    }

    public setImportType(importType: string) {
        this.importType = importType;
    }

    public getImportFrom() {
        return this.importFrom;
    }

    public setImportFrom(importFrom: string) {
        this.importFrom = importFrom;
    }

    public getNameBeforeAs() {
        return this.nameBeforeAs;
    }

    public setNameBeforeAs(nameBeforeAs: string | undefined) {
        this.nameBeforeAs = nameBeforeAs;
    }

    public getClauseType() {
        return this.clauseType;
    }

    public setClauseType(clauseType: string) {
        this.clauseType = clauseType;
    }

    public getModifiers() {
        return this.modifiers;
    }

    public addModifier(name: string | Decorator) {
        this.modifiers.add(name);
    }

    private transfer2UnixPath(path2Do: string) {
        return path.posix.join(...path2Do.split(/\\/));
    }

    public setOriginTsPosition(originTsPosition: LineColPosition): void {
        this.originTsPosition = originTsPosition;
    }

    public getOriginTsPosition(): LineColPosition {
        return this.originTsPosition;
    }

    public setTsSourceCode(tsSourceCode: string): void {
        this.tsSourceCode = tsSourceCode;
    }

    public getTsSourceCode(): string {
        return this.tsSourceCode;
    }
}
