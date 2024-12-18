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

/// <reference no-default-lib="true"/>


interface Map<K, V> {

    clear(): void;
 
    delete(key: K): boolean;

    forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void;

    get(key: K): V | undefined;

    has(key: K): boolean;

    set(key: K, value: V): this;

    readonly size: number;
}

interface MapConstructor {
    new(): Map<any, any>;
    new <K, V>(entries?: readonly (readonly [K, V])[] | null): Map<K, V>;
    readonly prototype: Map<any, any>;
}
declare var Map: MapConstructor;

interface Set<T> {
    add(value: T): this;

    clear(): void;

    delete(value: T): boolean;

    forEach(callbackfn: (value: T, value2: T, set: Set<T>) => void, thisArg?: any): void;

    has(value: T): boolean;

    readonly size: number;
}

interface SetConstructor {
    new <T = any>(values?: readonly T[] | null): Set<T>;
    readonly prototype: Set<any>;
}
declare var Set: SetConstructor;