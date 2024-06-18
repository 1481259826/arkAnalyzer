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

/*
 * TODO:
 * 
 * 1. Method parameter:
 *  a) default value 不支持
 *      source: move(distanceInMeters = 5)  
 *      parsed: move(distanceInMeters)
 *  c) string[] 类型解析为 ArrayType，无法还原
 *  d) 构造函数Access Modifiers 不支持
 *     constructor(public make: string, public model: string) {
 *     }
 * 
 * 2. Fileld:
 *  a) default value
 *      source: readonly numberOfLegs: number = 8; 
 *      parsed: readonly numberOfLegs:number;
 * 
 *   
 * 3. Enum
 *  a) 初始化不支持二元操作和函数调用
 *      enum FileAccess {
 *          // constant members
 *          None,
 *          Read    = 1 << 1,
 *          Write   = 1 << 2,
 *          ReadWrite  = Read | Write,
 *          // computed member
 *          G = "123".length
 *   }
 * 
 * 4. 泛型
 *  a) field泛型<>类型丢失
 * class GenericNumber<T> {
 *     private methods: Set<string>;
 *     private calls: Map<string, string[]>;
 * }
 */
import { ArkFile } from '../../core/model/ArkFile';
import { Printer } from '../Printer';
import { SourceBase } from './SourceBase';
import { SourceClass} from './SourceClass';
import { SourceMethod } from './SourceMethod';
import { SourceExportInfo, SourceImportInfo } from './SourceModule';
import { SourceNamespace } from './SourceNamespace';

/**
 * @category save
 */
export class SourceFilePrinter extends Printer {
    arkFile: ArkFile;
    items: SourceBase[] = [];

    constructor(arkFile: ArkFile) {
        super();
        this.arkFile = arkFile;
    }

    public dump(): string {
        this.printer.clear();
        // print imports
        for (let info of this.arkFile.getImportInfos()) {
            this.items.push(new SourceImportInfo('', info));
        }
        // print namespace
        for (let ns of this.arkFile.getNamespaces()) {
            this.items.push(new SourceNamespace('', ns));
        }
        
        // print class 
        for (let cls of this.arkFile.getClasses()) {
            if (cls.isDefaultArkClass()) {
                for (let method of cls.getMethods()) {
                    if (!method.getName().startsWith('AnonymousFunc$_')) {
                        this.items.push(new SourceMethod('', method));
                    }
                }
            } else {
                this.items.push(new SourceClass('', cls));
            }
        }
        // print export
        for (let info of this.arkFile.getExportInfos()) {
            this.items.push(new SourceExportInfo('', info));
        }

        this.items.sort((a, b) => a.getLine() - b.getLine());
        this.items.forEach((v):void => {
            this.printer.write(v.dump());
        });

        return this.printer.toString();
    }
    public dumpOriginal(): string {
        return this.arkFile.getCode();
    }

}