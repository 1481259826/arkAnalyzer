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
 * 23/26
 * 5/5
 * testcase_23_return.ts
 * 5(0)/5
 */
class Return {
    public num: number
    public getNum(): number {
        return this.num
    }

    public addNum(num_a: number, num_b: number): number {
        return this.getNum() + num_a + num_b
    }

    public setNum(num_a: number, num_b: number): number {
        return this.addNum(num_a, this.getNum()) * num_b
    }

    constructor(num: number) {
        this.num = num
    }
}

let ret = new Return(4)
let temp = ret.setNum(0, 1)
