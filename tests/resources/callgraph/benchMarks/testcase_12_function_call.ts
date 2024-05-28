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

/**
 * 22/23
 * 6/7
 * 
 * testcase_12_function_call.ts
 * 6(0)/6
 */

class num {
    n:number = 0;
    constructor() {
        console.log("num.constructor(){")
        this.n=1;
        console.log("}")
    }
    get():number {
        console.log("num.get(){")
        console.log("}")
        return -1;
    }
}

class one extends num {
    get(): number {
        console.log("one.get(){")
        console.log("}")
        return 1;
    }
}

class Zero extends num {
    get(): number {
        console.log("zero.get(){")
        console.log("}")
        return 0;
    }
}

function main2(a:Zero, b:num, c:one) {
    console.log("main2(){")
    let x = c.get();
    x = x/x;
    x = b.get();
    x = x/x;
    x = 1;
    x = x/x;
    x = a.get();
    x = x/x;
    let n : num = new num();
    let y = n.get();
    y = y/y;
    console.log("}")
}

main2(new Zero(), new num(), new one())