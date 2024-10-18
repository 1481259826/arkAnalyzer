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

function overloadedFunction1(x: number): string;
function overloadedFunction1(x: string): number;
function overloadedFunction1(x: any): any {
    if (typeof x === 'number') {
        return 'this is number';
    } else {
        return 123;
    }
}

class OverloadClass {
    public overloadedFunction2(x: number, y: number): string;
    public overloadedFunction2(x: string, y: string): number;
    public overloadedFunction2(x: string, y: string): string;
    public overloadedFunction2(x: number | string, y: number | string): string | number {
        if (typeof x === 'number' && typeof y === 'number') {
            return 'this is number';
        } else {
            return 123;
        }
    }
}

namespace overloadNamespace {
    function overloadedFunction3(x: number): string;
    function overloadedFunction3(x: string): number;
    function overloadedFunction3(x: string): boolean;
}

function function4(x: string): number;

function function5(x: number): number;
function function5(x: number): number {
    return x;
}