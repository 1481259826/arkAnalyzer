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

export const ArrowFunction_Expect_IR = {
    methods: [{
        name: '_DEFAULT_ARK_METHOD',
        stmts: [
            'this = this: @function/ArrowFunctionTest.ts: _DEFAULT_ARK_CLASS',
            'func1 = AnonymousMethod-_DEFAULT_ARK_METHOD-0',
            'func2 = AnonymousMethod-_DEFAULT_ARK_METHOD-1',
            'func3 = AnonymousMethod-_DEFAULT_ARK_METHOD-2',
            'func4 = AnonymousMethod-_DEFAULT_ARK_METHOD-3',
            'return',
        ],
    }, {
        name: 'AnonymousMethod-_DEFAULT_ARK_METHOD-0',
        stmts: [
            'i = parameter0: number',
            'this = this: @function/ArrowFunctionTest.ts: _DEFAULT_ARK_CLASS',
            'return i',
        ],
    }, {
        name: 'AnonymousMethod-_DEFAULT_ARK_METHOD-1',
        stmts: [
            'this = this: @function/ArrowFunctionTest.ts: _DEFAULT_ARK_CLASS',
            'i = 0',
            'i = i + 1',
            'return',
        ],
    }, {
        name: 'AnonymousMethod-_DEFAULT_ARK_METHOD-2',
        stmts: [
            'this = this: @function/ArrowFunctionTest.ts: _DEFAULT_ARK_CLASS',
            '$temp0 = staticinvoke <@_UnknownProjectName/_UnknownFileName: .func2()>()',
            'return $temp0',
        ],
    }, {
        name: 'AnonymousMethod-_DEFAULT_ARK_METHOD-3',
        stmts: [
            'i = parameter0: number',
            'this = this: @function/ArrowFunctionTest.ts: _DEFAULT_ARK_CLASS',
            'i = i + 1',
            'return i',
        ],
    }],
};