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
import {ArkFile} from "./ArkFile";
import {LineColPosition} from "../base/Position";
import {findExportInfo} from "./builder/ArkImportBuilder";
import {Decorator} from "../base/Decorator";
import {ExportInfo, FromInfo} from "./ArkExport";

export class ImportInfo implements FromInfo {
    private importClauseName: string;
    private importType: string;
    private importFrom: string;
    private nameBeforeAs: string | undefined;
    private modifiers: Set<string | Decorator> = new Set<string | Decorator>();

    private declaringArkFile: ArkFile;

    private originTsPosition: LineColPosition;
    private tsSourceCode: string;
    private lazyExportInfo: ExportInfo | null;

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

    public getOriginName() {
        return this.nameBeforeAs ?? this.importClauseName;
    }

    /**
     * 获取实际的引用（调用时生成）
     */
    public getExportInfo() {
        if (this.lazyExportInfo === undefined) {
            this.lazyExportInfo = findExportInfo(this);
        }
        return this.lazyExportInfo;
    }

    public setDeclaringArkFile(declaringArkFile: ArkFile) {
        this.declaringArkFile = declaringArkFile;
    }

    public getDeclaringArkFile() {
        return this.declaringArkFile;
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

    public getFrom(): string {
        return this.importFrom;
    }

    public isDefault(): boolean {
        let index = this.tsSourceCode.indexOf(this.importClauseName);
        if(index === -1){
            return false;
        }
        let start = this.tsSourceCode.indexOf('{');
        let end = this.tsSourceCode.indexOf('}');
        return !(index > start && index < end);
    }
}
