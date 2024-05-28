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

// test case for method call 1
// 20/21
// 5/6
// testcase_8_method_call.ts
// 3(0)/3

import { Main } from "./lib/a";
console.log("Default_Method")
class Foo {
    public i: number = 0;
    public static j: number = 0;

    public static newFoo(): Foo {
        console.log("Foo.newFoo(){")
        console.log("}")
        return new Foo();
    }

    public getNumber(): number {
        console.log("Foo.getNumber(){")
        let i: number = 0;
        let j: number = 1;
        console.log("}")
        return i + j;
    }
}

class Bar {
    public useFoo(): void {
        console.log("Bar.useFoo(){")
        let foo = Foo.newFoo();
        let n = foo.getNumber();

        let ii = foo.i;
        let jj = Foo.j;
        console.log("}")
    }
}

let foo = Foo.newFoo();
let n = foo.getNumber();

let message = Main.printNumber(n)
console.log(message)
