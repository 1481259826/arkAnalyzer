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

import { ExportInfo } from "../../core/model/ArkExport";
import { ImportInfo } from "../../core/model/ArkImport";
import { ArkFile } from "../../core/model/ArkFile";
import { SourceBase } from "./SourceBase";

export class SourceExportInfo extends SourceBase{
    info: ExportInfo;

    public constructor(indent: string, arkFile: ArkFile, info: ExportInfo) {
        super(indent, arkFile);
        this.info = info;
    }

    public getLine(): number {
        return -1;
    }

    public dump(): string {
        if (this.info.getNameBeforeAs()) {
            this.printer.write(`export {${this.info.getNameBeforeAs()} as ${this.info.getExportClauseName()}}`);
        } else {
            this.printer.write(`export {${this.info.getExportClauseName()}}`);
        }
        if (this.info.getExportFrom()) {
            this.printer.write(this.info.getTsSourceCode());
        }
        this.printer.writeLine(';');

        return this.printer.toString();
    }
    public dumpOriginalCode(): string {
        return this.dump();
    }
}

export class SourceImportInfo extends SourceBase{
    info: ImportInfo;

    public constructor(indent: string, arkFile: ArkFile, info: ImportInfo) {
        super(indent, arkFile);
        this.info = info;
    }

    public getLine(): number {
        return -1;
    }

    public dump(): string {
        if (this.info.getImportType() === 'Identifier') {
            // import fs from 'fs'
            this.printer.writeIndent().writeLine(`import ${this.info.getImportClauseName()} from '${this.info.getImportFrom() as string}';`);
        } else if (this.info.getImportType() === 'NamedImports') {
            // import {xxx} from './yyy'
            if (this.info.getNameBeforeAs()) {
                this.printer.writeIndent().writeLine(`import {${this.info.getNameBeforeAs()} as ${this.info.getImportClauseName()}} from '${this.info.getImportFrom() as string}';`);
            } else {
                this.printer.writeIndent().writeLine(`import {${this.info.getImportClauseName()}} from '${this.info.getImportFrom() as string}';`);
            }
        } else if (this.info.getImportType() === 'NamespaceImport') {
            // import * as ts from 'ohos-typescript'
            this.printer.writeIndent().writeLine(`import * as ${this.info.getImportClauseName()} from '${this.info.getImportFrom() as string}';`);
        } else if (this.info.getImportType() == 'EqualsImport') {
            // import mmmm = require('./xxx')
            this.printer.writeIndent().writeLine(`import ${this.info.getImportClauseName()} =  require('${this.info.getImportFrom() as string}');`);
        } else {
            // import '../xxx'
            this.printer.writeIndent().writeLine(`import '${this.info.getImportFrom() as string}';`);
        }
        return this.printer.toString();
    }
    public dumpOriginalCode(): string {
        return this.dump();
    }
}