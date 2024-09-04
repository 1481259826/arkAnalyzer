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

import { ArkFile } from './ArkFile';
import { LineColPosition } from '../base/Position';
import { Decorator } from '../base/Decorator';
import { ExportInfo, FromInfo } from './ArkExport';
import { findExportInfo } from "../common/ModelUtils";

/**
 * @category core/model
 */
export class ImportInfo implements FromInfo {
    private importClauseName: string = '';
    private importType: string = '';
    private importFrom?: string;
    private nameBeforeAs?: string;
    private modifiers: Set<string | Decorator> = new Set<string | Decorator>();

    private declaringArkFile!: ArkFile;

    private originTsPosition?: LineColPosition;
    private tsSourceCode?: string;
    private lazyExportInfo?: ExportInfo | null;

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

    public getOriginName(): string {
        return this.nameBeforeAs ?? this.importClauseName;
    }

    /**
     * 获取实际的引用（调用时生成）
     */
    public getLazyExportInfo(): ExportInfo | null {
        if (this.lazyExportInfo === undefined) {
            this.lazyExportInfo = findExportInfo(this);
        }
        return this.lazyExportInfo || null;
    }

    public setDeclaringArkFile(declaringArkFile: ArkFile): void {
        this.declaringArkFile = declaringArkFile;
    }

    public getDeclaringArkFile(): ArkFile {
        return this.declaringArkFile;
    }

    public getImportClauseName(): string {
        return this.importClauseName;
    }

    public setImportClauseName(importClauseName: string): void {
        this.importClauseName = importClauseName;
    }

    public getImportType(): string {
        return this.importType;
    }

    public setImportType(importType: string): void {
        this.importType = importType;
    }

    public setImportFrom(importFrom: string): void {
        this.importFrom = importFrom;
    }

    public getNameBeforeAs(): string | undefined {
        return this.nameBeforeAs;
    }

    public setNameBeforeAs(nameBeforeAs: string | undefined) {
        this.nameBeforeAs = nameBeforeAs;
    }

    public getModifiers(): Set<string | Decorator> {
        return this.modifiers;
    }

    public addModifier(name: string | Decorator): void {
        this.modifiers.add(name);
    }

    public setOriginTsPosition(originTsPosition: LineColPosition): void {
        this.originTsPosition = originTsPosition;
    }

    public getOriginTsPosition(): LineColPosition {
        return this.originTsPosition ?? LineColPosition.DEFAULT;
    }

    public setTsSourceCode(tsSourceCode: string): void {
        this.tsSourceCode = tsSourceCode;
    }

    public getTsSourceCode(): string {
        return this.tsSourceCode ?? '';
    }

    public getFrom(): string | undefined {
        return this.importFrom;
    }

    public isDefault(): boolean {
        if (this.nameBeforeAs === 'default') {
            return true;
        }
        return this.importType === 'Identifier';
    }
}
