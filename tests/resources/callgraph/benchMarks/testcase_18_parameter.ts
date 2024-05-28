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
 * 22/39
 * 6/7
 * testcase_18_parameter.ts
 * 6(0)/6
 */
function withParamArray(param: number[]) {
    let num = param.length
    let num_0 = param[0]

    withParamNumber(num_0)
}

function withParamNumber(num: number) {

}

class NumberArray {
    public array: number[]

    constructor(...a: number[]) {
        for (let num of a) {
            this.array.push(num)
        }
    }

    public getFirstNum(): number {
        return this.array[0]
    }

    public getLastNum(): number {
        return this.array[this.array.length - 1]
    }

    public getArray(): number[] {
        return this.array
    }
}

let clas = new NumberArray(3, 1, 2, 5, 7, 8, 10)
let first = clas.getFirstNum()
let last = clas.getLastNum()

withParamArray(clas.getArray())