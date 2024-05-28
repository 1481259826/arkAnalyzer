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
 * 31/32
 * 3/4
 * 
 * testcase_14_function_call.ts
 * 2(0)/2
 */

function identity(x: number) : number {
    console.log("iden")
    let y:number = x;
    console.log("}")
    return y;
}

function nonZero() : number {
    console.log("nonzero")
    console.log("}")
    return 1;
}

function zero() : number {
    console.log("zero")
    let z = nonZero()
    console.log("}")
    return 0;
}

function fun(x:number){
    console.log("fun")
    console.log(x)
    console.log("}")
}

function func1(a:number,b:number): number{
    console.log("func1")
    if (a == 0){
        b = 1;
        console.log("}")
        return b;
    }
    if (b != 0){
        console.log("}")
        return a;
    }
    console.log("}")
    return 0;
}

function main1(){
    console.log("main1")
    let x = func1(1,0)
    console.log("}")
}

class num {
    n:number = 0;
    constructor() {
        console.log("constru")
        this.n=1;
        console.log("}")
    }
    get():number {
        console.log("num.get")
        console.log("}")
        return -1;
    }
}

class one extends num {
    get(): number {
        console.log("one.get")
        console.log("}")
        return 1;
    }
}

class Zero extends num {
    get(): number {
        console.log("zero.get")
        console.log("}")
        return 0;
    }
}


main1()