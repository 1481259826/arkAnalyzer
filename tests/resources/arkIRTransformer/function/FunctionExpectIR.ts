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
        name: '%dflt',
        stmts: [
            {
                text: 'this = this: @function/ArrowFunctionTest.ts: %dflt',
                operandOriginalPositions: [
                    null, null,
                ],
            },
            {
                text: 'func1 = %AM0',
                operandOriginalPositions: [
                    [16, 5, 16, 10], [16, 13, 16, 29],
                ],
            },
            {
                text: 'func2 = %AM1',
                operandOriginalPositions: [
                    [17, 5, 17, 10], [17, 13, 20, 2],
                ],
            },
            {
                text: 'func3 = %AM2',
                operandOriginalPositions: [
                    [21, 5, 21, 10], [21, 13, 21, 26],
                ],
            },
            {
                text: 'func4 = %AM3',
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
        name: '%AM0',
        stmts1: [
            'i = parameter0: number',
            'this = this: @function/ArrowFunctionTest.ts: %dflt',
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
                text: 'this = this: @function/ArrowFunctionTest.ts: %dflt',
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
        name: '%AM1',
        stmts1: [
            'this = this: @function/ArrowFunctionTest.ts: %dflt',
            'i = 0',
            'i = i + 1',
            'return',
        ],
        stmts: [
            {
                text: 'this = this: @function/ArrowFunctionTest.ts: %dflt',
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
        name: '%AM2',
        stmts1: [
            'this = this: @function/ArrowFunctionTest.ts: %dflt',
            '%0 = staticinvoke <@%unk/%unk: .func2()>()',
            'return %0',
        ],
        stmts: [
            {
                text: 'this = this: @function/ArrowFunctionTest.ts: %dflt',
                operandOriginalPositions: [
                    null, null,
                ],
            },
            {
                text: '%0 = staticinvoke <@%unk/%unk: .func2()>()',
                operandOriginalPositions: [
                    [21, 19, 21, 26], [21, 19, 21, 26],
                ],
            },
            {
                text: 'return %0',
                operandOriginalPositions: [
                    [21, 19, 21, 26],
                ],
            },
        ],
    }, {
        name: '%AM3',
        stmts1: [
            'i = parameter0: number',
            'this = this: @function/ArrowFunctionTest.ts: %dflt',
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
                text: 'this = this: @function/ArrowFunctionTest.ts: %dflt',
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

export const OverloadMethod_Expect_IR = {
    methodDeclareLines: [16, 17],
    methodDeclareSignatures: [
        {
            toString: '@function/OverloadFunctionTest.ts: %dflt.overloadedFunction1(number)',
            methodSubSignature: {
                returnType: 'string'
            }
        },
        {
            toString: '@function/OverloadFunctionTest.ts: %dflt.overloadedFunction1(string)',
            methodSubSignature: {
                returnType: 'number'
            }
        }

    ],
    line: 18,
    methodSignature: {
        toString: '@function/OverloadFunctionTest.ts: %dflt.overloadedFunction1(any)',
        methodSubSignature: {
            returnType: 'any'
        }
    },
    body: {
        locals: {
            x: {
                name: 'x'
            }
        }
    }
};

export const OverloadClassMethod_Expect_IR = {
    methodDeclareLines: [29, 30, 31],
    methodDeclareSignatures: [
        {
            toString: '@function/OverloadFunctionTest.ts: OverloadClass.overloadedFunction2(number, number)',
            methodSubSignature: {
                returnType: 'string'
            }
        },
        {
            toString: '@function/OverloadFunctionTest.ts: OverloadClass.overloadedFunction2(string, string)',
            methodSubSignature: {
                returnType: 'number'
            }
        },
        {
            toString: '@function/OverloadFunctionTest.ts: OverloadClass.overloadedFunction2(string, string)',
            methodSubSignature: {
                returnType: 'string'
            }
        }
    ],
    line: 33,
    methodSignature: {
        toString: '@function/OverloadFunctionTest.ts: OverloadClass.overloadedFunction2(number|string, number|string)',
        methodSubSignature: {
            returnType: 'string|number'
        }
    },
    body: {
        locals: {
            x: {
                name: 'x'
            }
        }
    }
};

export const OverloadNamespaceMethod_Expect_IR = {
    methodDeclareLines: [45, 46, 47],
    methodDeclareSignatures: [
        {
            toString: '@function/OverloadFunctionTest.ts: overloadNamespace.%dflt.overloadedFunction3(number)',
            methodSubSignature: {
                returnType: 'string'
            }
        },
        {
            toString: '@function/OverloadFunctionTest.ts: overloadNamespace.%dflt.overloadedFunction3(string)',
            methodSubSignature: {
                returnType: 'number'
            }
        },
        {
            toString: '@function/OverloadFunctionTest.ts: overloadNamespace.%dflt.overloadedFunction3(string)',
            methodSubSignature: {
                returnType: 'boolean'
            }
        }
    ],
    line: null,
    methodSignature: null
};

export const OverloadInterfaceMethod_Expect_IR = {
    methodDeclareLines: [51, 52],
    methodDeclareSignatures: [
        {
            toString: '@function/OverloadFunctionTest.ts: OverloadInterface.overloadedFunction4(number)',
            methodSubSignature: {
                returnType: 'number'
            }
        },
        {
            toString: '@function/OverloadFunctionTest.ts: OverloadInterface.overloadedFunction4(string)',
            methodSubSignature: {
                returnType: 'string'
            }
        }
    ],
    line: null,
    methodSignature: null,
};

export const NoOverloadMethod_Expect_IR = {
    methodDeclareLines: [55],
    methodDeclareSignatures: [
        {
            toString: '@function/OverloadFunctionTest.ts: %dflt.function5(string)',
            methodSubSignature: {
                returnType: 'number'
            }
        }
    ],
    line: null,
    methodSignature: null
};

export const NoOverloadMethodWithBody_Expect_IR = {
    methodDeclareLines: [57],
    methodDeclareSignatures: [
        {
            toString: '@function/OverloadFunctionTest.ts: %dflt.function6(number)',
            methodSubSignature: {
                returnType: 'number'
            }
        }
    ],
    line: 58,
    methodSignature: {
        toString: '@function/OverloadFunctionTest.ts: %dflt.function6(number)',
        methodSubSignature: {
            returnType: 'number'
        }
    },
    body: {
        locals: {
            x: {
                name: 'x'
            }
        }
    }
};

export const NoOverloadMethodWithBody2_Expect_IR = {
    methodDeclareLines: null,
    methodDeclareSignatures: null,
    line: 62,
    methodSignature: {
        toString: '@function/OverloadFunctionTest.ts: %dflt.function7(number)',
        methodSubSignature: {
            returnType: 'number'
        }
    },
    body: {
        locals: {
            x: {
                name: 'x'
            }
        }
    }
};