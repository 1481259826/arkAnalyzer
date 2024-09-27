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
            {
                text: 'this = this: @function/ArrowFunctionTest.ts: _DEFAULT_ARK_CLASS',
                operandOriginalPositions: [
                    null, null,
                ],
            },
            {
                text: 'func1 = AnonymousMethod-_DEFAULT_ARK_METHOD-0',
                operandOriginalPositions: [
                    [16, 5, 16, 10], [16, 13, 16, 29],
                ],
            },
            {
                text: 'func2 = AnonymousMethod-_DEFAULT_ARK_METHOD-1',
                operandOriginalPositions: [
                    [17, 5, 17, 10], [17, 13, 20, 2],
                ],
            },
            {
                text: 'func3 = AnonymousMethod-_DEFAULT_ARK_METHOD-2',
                operandOriginalPositions: [
                    [21, 5, 21, 10], [21, 13, 21, 26],
                ],
            },
            {
                text: 'func4 = AnonymousMethod-_DEFAULT_ARK_METHOD-3',
                operandOriginalPositions: [
                    [22, 5, 22, 10], [22, 13, 22, 31],
                ],
            },
            {
                text: 'return',
                operandOriginalPositions: [],
            },
        ],
    }, {
        name: 'AnonymousMethod-_DEFAULT_ARK_METHOD-0',
        stmts1: [
            'i = parameter0: number',
            'this = this: @function/ArrowFunctionTest.ts: _DEFAULT_ARK_CLASS',
            'return i',
        ],
        stmts: [
            {
                text: 'i = parameter0: number',
                operandOriginalPositions: [
                    null, null,
                ],
            },
            {
                text: 'this = this: @function/ArrowFunctionTest.ts: _DEFAULT_ARK_CLASS',
                operandOriginalPositions: [
                    null, null,
                ],
            },
            {
                text: 'return i',
                operandOriginalPositions: [
                    [16, 28, 16, 29],
                ],
            },
        ],
    }, {
        name: 'AnonymousMethod-_DEFAULT_ARK_METHOD-1',
        stmts1: [
            'this = this: @function/ArrowFunctionTest.ts: _DEFAULT_ARK_CLASS',
            'i = 0',
            'i = i + 1',
            'return',
        ],
        stmts: [
            {
                text: 'this = this: @function/ArrowFunctionTest.ts: _DEFAULT_ARK_CLASS',
                operandOriginalPositions: [
                    null, null,
                ],
            },
            {
                text: 'i = 0',
                operandOriginalPositions: [
                    [18, 9, 18, 10], [18, 13, 18, 14],
                ],
            },
            {
                text: 'i = i + 1',
                operandOriginalPositions: [
                    [19, 5, 19, 6], [19, 5, 19, 8], [19, 5, 19, 6], [-1, -1, -1, -1],
                ],
            },
            {
                text: 'return',
                operandOriginalPositions: [],
            },
        ],
    }, {
        name: 'AnonymousMethod-_DEFAULT_ARK_METHOD-2',
        stmts1: [
            'this = this: @function/ArrowFunctionTest.ts: _DEFAULT_ARK_CLASS',
            '$temp0 = staticinvoke <@_UnknownProjectName/_UnknownFileName: .func2()>()',
            'return $temp0',
        ],
        stmts: [
            {
                text: 'this = this: @function/ArrowFunctionTest.ts: _DEFAULT_ARK_CLASS',
                operandOriginalPositions: [
                    null, null,
                ],
            },
            {
                text: '$temp0 = staticinvoke <@_UnknownProjectName/_UnknownFileName: .func2()>()',
                operandOriginalPositions: [
                    [21, 19, 21, 26], [21, 19, 21, 26],
                ],
            },
            {
                text: 'return $temp0',
                operandOriginalPositions: [
                    [21, 19, 21, 26],
                ],
            },
        ],
    }, {
        name: 'AnonymousMethod-_DEFAULT_ARK_METHOD-3',
        stmts1: [
            'i = parameter0: number',
            'this = this: @function/ArrowFunctionTest.ts: _DEFAULT_ARK_CLASS',
            'i = i + 1',
            'return i',
        ],
        stmts: [
            {
                text: 'i = parameter0: number',
                operandOriginalPositions: [
                    null, null,
                ],
            },
            {
                text: 'this = this: @function/ArrowFunctionTest.ts: _DEFAULT_ARK_CLASS',
                operandOriginalPositions: [
                    null, null,
                ],
            },
            {
                text: 'i = i + 1',
                operandOriginalPositions: [
                    [22, 28, 22, 29], [22, 28, 22, 31], [22, 28, 22, 29], [-1, -1, -1, -1],
                ],
            },
            {
                text: 'return i',
                operandOriginalPositions: [
                    [22, 28, 22, 31],
                ],
            },
        ],
    }],
};