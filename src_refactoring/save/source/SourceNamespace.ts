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

import { ArkFile } from "../../core/model/ArkFile";
import { ArkNamespace } from "../../core/model/ArkNamespace";
import { SourceBase } from "./SourceBase";
import { SourceClass } from "./SourceClass";
import { SourceMethod } from "./SourceMethod";
import { SourceExportInfo } from "./SourceModule";

export class SourceNamespace extends SourceBase{
    ns: ArkNamespace;

    public constructor(indent: string, arkFile: ArkFile, ns: ArkNamespace) {
        super(indent, arkFile);
        this.ns = ns;
    }

    public getLine(): number {
        return this.ns.getLine();
    }

    public dump(): string {
        this.printer.writeIndent().writeSpace(this.modifiersToString(this.ns.getModifiers())).writeLine(`namespace ${this.ns.getName()} {`);
        this.printer.incIndent();

        let items: SourceBase[] = [];
        
        // print class 
        for (let cls of this.ns.getClasses()) {
            if (cls.isDefaultArkClass()) {
                for (let method of cls.getMethods()) {
                    if (!method.getName().startsWith('AnonymousFunc$_')) {
                        items.push(new SourceMethod(this.printer.getIndent(), this.arkFile, method));
                    }
                }
            } else {
                items.push(new SourceClass(this.printer.getIndent(), this.arkFile, cls));
            }            
        }

        // print namespace
        for (let childNs of this.ns.getNamespaces()) {
            items.push(new SourceNamespace(this.printer.getIndent(), this.arkFile, childNs));
        }

        // print exportInfos
        for (let exportInfo of this.ns.getExportInfos()) {
            items.push(new SourceExportInfo(this.printer.getIndent(), this.arkFile, exportInfo));
        }
        //TODO: fields /methods
        //TODO: sort by lineno
        items.sort((a, b) => a.getLine() - b.getLine());
        items.forEach((v):void => {
            this.printer.write(v.dump());
        });

        this.printer.decIndent();
        this.printer.writeIndent().writeLine('}');

        return this.printer.toString();
    }

    public dumpOriginalCode(): string {
        return this.ns.getCode();
    }

}