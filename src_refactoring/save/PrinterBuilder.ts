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
import { dirname, join } from 'path';
import { ArkFile } from '../core/model/ArkFile';
import { ArkStream } from './ArkStream';
import { DotPrinter } from './DotPrinter';
import { SourcePrinter } from './source/SourcePrinter';
import { Printer } from './Printer';

export class PrinterBuilder {    
    outputDir: string;
    constructor(outputDir: string='') {
        this.outputDir = outputDir;
    }

    protected getOutputDir(arkFile: ArkFile): string {
        if (this.outputDir === '') {
            return join(arkFile.getProjectDir(), '..', 'output');
        } else {
            return join(this.outputDir);
        }
    }

    public dumpToDot(arkFile: ArkFile, output: string|undefined=undefined): void {
        let filename = output;
        if (output === undefined) {
            filename = join(this.getOutputDir(arkFile), arkFile.getName() +'.dot');
        }     
        fs.mkdirSync(dirname(filename as string), {recursive: true});
        let streamOut = new ArkStream(fs.createWriteStream(filename as string));
        let printer: Printer = new DotPrinter(arkFile);
        printer.printTo(streamOut);
        streamOut.close();
    }

    public dumpToTs(arkFile: ArkFile, output: string|undefined=undefined): void {
        let filename = output;
        if (output === undefined) {
            filename = join(this.getOutputDir(arkFile), arkFile.getName()); 
        }     
        fs.mkdirSync(dirname(filename as string), {recursive: true});
        let streamOut = new ArkStream(fs.createWriteStream(filename as string));
        let printer: SourcePrinter = new SourcePrinter(arkFile);
        // if arkFile not change printOriginalCode()
        printer.printTo(streamOut);
        streamOut.close();
    }
}