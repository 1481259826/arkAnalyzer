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

import { LineColPosition } from "../base/Position";
import { Decorator } from "../base/Decorator";
import { ArkFile } from "./ArkFile";
import { ArkSignature, ClassSignature, MethodSignature, NamespaceSignature } from "./ArkSignature";
import { Local } from "../base/Local";

export type TypeSignature = NamespaceSignature | ClassSignature | MethodSignature | Local;

export enum ExportType {
    NAME_SPACE = 0,
    CLASS = 1,
    METHOD = 2,
    LOCAL = 3,
    UNKNOWN = 4
}

export interface ArkExport extends ArkSignature {
    isExported(): boolean;

    getModifiers(): Set<string | Decorator>;

    getName(): string;

    getType(): ExportType;

}

export interface FromInfo {
    isDefault(): boolean;

    getOriginName(): string;

    getFrom(): string;

    getDeclaringArkFile(): ArkFile;
}

/**
 * @category core/model
 */
export class ExportInfo implements FromInfo {

    private modifiers: Set<string | Decorator>;
    private _default: boolean;
    private nameBeforeAs: string | undefined;
    private exportClauseName: string;

    private exportClauseType: ExportType;
    private typeSignature: TypeSignature;
    private exportFrom: string;

    private originTsPosition: LineColPosition;
    private tsSourceCode: string;
    declaringArkFile: ArkFile;

    private constructor() {
    }

    public getFrom(): string {
        return this.exportFrom;
    }

    public getOriginName(): string {
        return this.nameBeforeAs ?? this.exportClauseName;
    }

    public getExportClauseName(): string {
        return this.exportClauseName;
    }

    public setExportClauseType(exportClauseType: ExportType): void {
        this.exportClauseType = exportClauseType;
    }

    public getExportClauseType(): ExportType {
        return this.exportClauseType;
    }

    private setNameBeforeAs(nameBeforeAs: string): void {
        this.nameBeforeAs = nameBeforeAs;
    }

    public getNameBeforeAs(): string | undefined {
        return this.nameBeforeAs;
    }

    public setTypeSignature(value: TypeSignature) {
        this.typeSignature = value;
    }

    public getExportFrom(): string {
        return this.exportFrom;
    }

    public getTypeSignature(): TypeSignature {
        return this.typeSignature;
    }

    public isDefault(): boolean {
        if (this._default === undefined) {
            this._default = this.modifiers?.has('DefaultKeyword')
        }
        return this._default;
    }

    private addModifier(name: string | Decorator): void {
        if (!this.modifiers) {
            this.modifiers = new Set<string | Decorator>();
        }
        this.modifiers.add(name);
    }

    public getModifiers(): Set<string | Decorator> {
        return this.modifiers;
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

    public getDeclaringArkFile(): ArkFile {
        return this.declaringArkFile;
    }

    public setDeclaringArkFile(value: ArkFile): void {
        this.declaringArkFile = value;
    }


    public static Builder = class ArkExportBuilder {
        exportInfo: ExportInfo = new ExportInfo();

        public exportClauseName(exportClauseName: string): ArkExportBuilder {
            this.exportInfo.exportClauseName = exportClauseName;
            return this;
        }

        public exportClauseType(exportClauseType: ExportType): ArkExportBuilder {
            this.exportInfo.setExportClauseType(exportClauseType);
            return this;
        }

        public nameBeforeAs(nameBeforeAs: string): ArkExportBuilder {
            this.exportInfo.setNameBeforeAs(nameBeforeAs);
            return this;
        }

        public addModifier(name: string | Decorator): ArkExportBuilder {
            this.exportInfo.addModifier(name);
            return this;
        }

        public modifiers(modifiers: Set<string | Decorator>): ArkExportBuilder {
            if (modifiers) {
                modifiers.forEach(m => this.exportInfo.addModifier(m));
            }
            return this;
        }

        public originTsPosition(originTsPosition: LineColPosition): ArkExportBuilder {
            this.exportInfo.setOriginTsPosition(originTsPosition);
            return this;
        }

        public tsSourceCode(tsSourceCode: string): ArkExportBuilder {
            this.exportInfo.setTsSourceCode(tsSourceCode);
            return this;
        }

        public declaringArkFile(value: ArkFile): ArkExportBuilder {
            this.exportInfo.setDeclaringArkFile(value);
            return this;
        }

        public typeSignature(value: TypeSignature): ArkExportBuilder {
            this.exportInfo.setTypeSignature(value);
            return this;
        }

        public exportFrom(exportFrom: string): ArkExportBuilder {
            this.exportInfo.exportFrom = exportFrom;
            return this;
        }

        public build(): ExportInfo {
            return this.exportInfo;
        }
    }

}