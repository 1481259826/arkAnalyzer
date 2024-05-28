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

import { ArrayType, ClassType, LiteralType, Type, TypeLiteralType, UnknownType } from "../../core/base/Type";

export class SourceUtils {
    public static typeToString(type: Type): string {
        if (type instanceof TypeLiteralType) {
            let typesStr: string[] = [];
            for (const member of type.getMembers()) {
                typesStr.push(member.getName() + ':' + member.getType());
            }
            return `{${typesStr.join(',')}}`;
        } else if (type instanceof Array) {
            let typesStr: string[] = [];
            for (const member of type) {
                typesStr.push(this.typeToString(member));
            }
            return typesStr.join(' | ');
        } else if (type instanceof LiteralType) {
            let literalName = type.getliteralName() as string;            
            return literalName.substring(0, literalName.length - 'Keyword'.length).toLowerCase();
        } else if (type instanceof UnknownType) {
            return 'any';
        } else if (type instanceof ClassType) {
            return type.getClassSignature().getClassName();
        } else if (type instanceof ArrayType) {
            if (type.getBaseType() instanceof UnknownType) {
                const strs: string[] = [];
                strs.push('(any)');
                for (let i = 0; i < type.getDimension(); i++) {
                    strs.push('[]');
                }
                return strs.join('');
            } else {
                return type.toString();
            }
        } else if (!type) {
            return 'any';
        } else {
            return type.toString();
        }
    }

    public static typeArrayToString(types: Type[], split: string=','): string {
        let typesStr: string[] = [];
        types.forEach((t) => {
            typesStr.push(SourceUtils.typeToString(t));
        });

        return typesStr.join(split);
    }
    
}