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

import { Decorator } from "../../core/base/Decorator";
import { ArkFile } from "../../core/model/ArkFile";
import { Printer } from "../Printer";


export abstract class SourceBase extends Printer {
    protected arkFile: ArkFile;

    public constructor(indent: string) {
        super(indent);
    }

    public abstract getLine(): number;

    protected modifiersToString(modifiers: Set<string | Decorator>): string {
        let modifiersStr: string[] = [];
        modifiers.forEach((value) => {
            if (value instanceof Decorator) {
                // TODO
            } else {
                modifiersStr.push(this.resolveKeywordType(value))
            }
        });
    
        return modifiersStr.join(' ');
    }
    
    protected resolveKeywordType(keywordStr: string): string {
        // 'NumberKeyword | NullKeyword |
        let types: string[] = [];
        for (let keyword of keywordStr.split('|')) {
            keyword = keyword.trim();
            if (keyword.length == 0) {
                continue;
            }
            if (keyword.endsWith('Keyword')) {
                keyword = keyword.substring(0, keyword.length - 'Keyword'.length).toLowerCase();
            }
            types.push(keyword);
        }
        
        return types.join('|');
    }
    
    protected resolveMethodName(name: string): string {
        if (name === '_Constructor') {
            return 'constructor';
        }
        if (name.startsWith('Get-')) {
            return name.replace('Get-', 'get ');
        }
        if (name.startsWith('Set-')) {
            return name.replace('Set-', 'set ');
        }
        return name;
    }   
}

