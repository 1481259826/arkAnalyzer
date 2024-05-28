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
 * 11/11
 * 3/3
 * testcase_16_parameter.ts
 * 3(0)/3
 */

function withParamString(param: string) {
    
}

class Class1 {
    public a: string

    constructor(word: string) {
        this.a = word
    }

    public getWord(): string {
        return this.a
    }
}

let cla: Class1 = new Class1("not fun")
withParamString(cla.getWord())