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
 * 16/17
 * 5/5
 * testcase_17_parameter.ts
 * 5(0)/5
 */
class Word {
    public word: string
    public length: number

    constructor(word: string) {
        this.word = word
        this.length = word.length
    }

    public getWord(): string {
        return this.word
    }

    public getLength(): number {
        return this.length
    }
}
function withParamClass(param: Word) {
    let word = param.getWord()
    let num = param.getLength()

    withParamString(word)
}

function withParamString(param: string) {
    
}

let cls = new Word("fxxxxxx")
withParamClass(cls)