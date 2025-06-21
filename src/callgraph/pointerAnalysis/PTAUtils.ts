/*
 * Copyright (c) 2024-2025 Huawei Device Co., Ltd.
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

import { UnclearReferenceType } from '../../core/base/Type';
import { ClassSignature, FieldSignature, FileSignature, MethodSignature } from '../../core/model/ArkSignature';

export function IsCollectionClass(classSignature: ClassSignature): boolean {
    if (classSignature.toString().endsWith('lib.es2015.collection.d.ts: Set') || classSignature.toString().endsWith('lib.es2015.collection.d.ts: Map')) {
        return true;
    }
    return false;
}

export enum BuiltApiType {
    SetAdd,
    MapSet,
    MapGet,
    ArrayPush,
    FunctionCall,
    FunctionApply,
    FunctionBind,
    NotBuiltIn,
}

export const ARRAY_FIELD_SIGNATURE = new FieldSignature(
    'field',
    new ClassSignature('Array', new FileSignature('container', 'lib.es5.d.ts')),
    new UnclearReferenceType('')
);

export const SET_FIELD_SIGNATURE = new FieldSignature(
    'field',
    new ClassSignature('Set', new FileSignature('container', 'lib.es2015.collection.d.ts')),
    new UnclearReferenceType('')
);

export const MAP_FIELD_SIGNATURE = new FieldSignature(
    'field',
    new ClassSignature('Map', new FileSignature('container', 'lib.es2015.collection.d.ts')),
    new UnclearReferenceType('')
);

const BUILTIN_API_BY_SUFFIX = new Map<string, BuiltApiType>([
    ['lib.es2015.collection.d.ts: Set.add(T)', BuiltApiType.SetAdd],
    ['lib.es2015.collection.d.ts: Map.set(K, V)', BuiltApiType.MapSet],
    ['lib.es2015.collection.d.ts: Map.get(K)', BuiltApiType.MapGet],
    ['lib.es5.d.ts: Array.push(T[])', BuiltApiType.ArrayPush],
]);

const FUNCTION_METHOD_REGEX = /lib\.es5\.d\.ts: Function\.(call|apply|bind)\(/;
const FUNCTION_METHOD_MAP: { [key: string]: BuiltApiType } = {
    'call': BuiltApiType.FunctionCall,
    'apply': BuiltApiType.FunctionApply,
    'bind': BuiltApiType.FunctionBind
};

export function getBuiltInApiType(method: MethodSignature): BuiltApiType {
    let methodSigStr = method.toString();

    for (const [suffix, apiType] of BUILTIN_API_BY_SUFFIX.entries()) {
        if (methodSigStr.endsWith(suffix)) {
            return apiType;
        }
    }

    const match = methodSigStr.match(FUNCTION_METHOD_REGEX);
    if (match) {
        const functionName = match[1];
        if (functionName in FUNCTION_METHOD_MAP) {
            return FUNCTION_METHOD_MAP[functionName];
        }
    }

    return BuiltApiType.NotBuiltIn;
}
