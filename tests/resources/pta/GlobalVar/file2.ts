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

import { a, B, name } from "./file1"

class C extends name {
    constructor(num: number) {
        super(num)
    }
}

let c = new C(1)

class D extends name {
    constructor(num: number) {
        super(num)
    }
}

namespace temp {
    let d = new D(2) //

    export function main() {
        let a = new C(3)
        let b = new B(4)
        let c = new C(5)
        let d = new D(6)
        console.log(a.getID())
        console.log(b.getID())
        console.log(c.getID())
        console.log(d.getID()) //
    }

    export function main2() {
        console.log(a.getID())
        // console.log(b_2.getID())
        console.log(c.getID())
        console.log(d.getID()) //
    }
}

// temp.main()
// temp.main2()