/*
 * Copyright (c) 2025 Huawei Device Co., Ltd.
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

export const Class_With_Static_Init_Block_Expect = {
    'Case1': {
        '%statInit': {
            methodSignature: '@class/ClassWithStaticInitBlock.ts: Case1.%statInit()',
            stmts: [
                {
                    text: 'this = this: @class/ClassWithStaticInitBlock.ts: Case1',
                },
                {
                    text: 'staticinvoke <@class/ClassWithStaticInitBlock.ts: Case1.[static]%statBlock0()>()',
                },
                {
                    text: 'return',
                },
            ],
        },
        '%statBlock0': {
            methodSignature: '@class/ClassWithStaticInitBlock.ts: Case1.[static]%statBlock0()',
            stmts: [
                {
                    text: 'this = this: @class/ClassWithStaticInitBlock.ts: Case1',
                },
                {
                    text: 'instanceinvoke console.<@%unk/%unk: .log()>(\'static block\')',
                },
                {
                    text: 'return',
                },
            ],
        },
    },
    'Case2': {
        '%statInit': {
            methodSignature: '@class/ClassWithStaticInitBlock.ts: Case2.%statInit()',
            stmts: [
                {
                    text: 'this = this: @class/ClassWithStaticInitBlock.ts: Case2',
                },
                {
                    text: 'staticinvoke <@class/ClassWithStaticInitBlock.ts: Case2.[static]%statBlock0()>()',
                },
                {
                    text: 'staticinvoke <@class/ClassWithStaticInitBlock.ts: Case2.[static]%statBlock1()>()',
                },
                {
                    text: 'return',
                },
            ],
        },
        '%statBlock0': {
            methodSignature: '@class/ClassWithStaticInitBlock.ts: Case2.[static]%statBlock0()',
            stmts: [
                {
                    text: 'this = this: @class/ClassWithStaticInitBlock.ts: Case2',
                },
                {
                    text: 'instanceinvoke console.<@%unk/%unk: .log()>(\'static block1\')',
                },
                {
                    text: 'return',
                },
            ],
        },
        '%statBlock1': {
            methodSignature: '@class/ClassWithStaticInitBlock.ts: Case2.[static]%statBlock1()',
            stmts: [
                {
                    text: 'this = this: @class/ClassWithStaticInitBlock.ts: Case2',
                },
                {
                    text: 'instanceinvoke console.<@%unk/%unk: .log()>(\'static block2\')',
                },
                {
                    text: 'return',
                },
            ],
        },
    },
    'Case3': {
        '%statInit': {
            methodSignature: '@class/ClassWithStaticInitBlock.ts: Case3.%statInit()',
            stmts: [
                {
                    text: 'this = this: @class/ClassWithStaticInitBlock.ts: Case3',
                },
                {
                    text: 'staticinvoke <@class/ClassWithStaticInitBlock.ts: Case3.[static]%statBlock0()>()',
                },
                {
                    text: '@class/ClassWithStaticInitBlock.ts: Case3.[static]field = 1',
                },
                {
                    text: 'staticinvoke <@class/ClassWithStaticInitBlock.ts: Case3.[static]%statBlock1()>()',
                },
                {
                    text: 'return',
                },
            ],
        },
        '%statBlock0': {
            methodSignature: '@class/ClassWithStaticInitBlock.ts: Case3.[static]%statBlock0()',
            stmts: [
                {
                    text: 'this = this: @class/ClassWithStaticInitBlock.ts: Case3',
                },
                {
                    text: 'instanceinvoke console.<@%unk/%unk: .log()>(\'static block1\')',
                },
                {
                    text: 'return',
                },
            ],
        },
        '%statBlock1': {
            methodSignature: '@class/ClassWithStaticInitBlock.ts: Case3.[static]%statBlock1()',
            stmts: [
                {
                    text: 'this = this: @class/ClassWithStaticInitBlock.ts: Case3',
                },
                {
                    text: 'instanceinvoke console.<@%unk/%unk: .log()>(\'static block2\')',
                },
                {
                    text: 'return',
                },
            ],
        },
    },
};