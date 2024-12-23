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

import {
    ANONYMOUS_METHOD_PREFIX, CLOSURES_LOCAL_NAME,
    DEFAULT_ARK_CLASS_NAME,
    GlobalRef,
    NAME_DELIMITER,
    NAME_PREFIX,
} from '../../../../src';

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
        locals: [
            {
                name: 'x'
            }
        ]
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
        locals: [
            {
                name: 'x'
            }
        ]
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
        locals: [
            {
                name: 'x'
            }
        ]
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
        locals: [
            {
                name: 'x'
            }
        ]
    }
};

export const UnClosureFunction_Expect_IR = {
    outerMethod: undefined,
    methodSignature: {
        toString: `@function/ClosureParamsTest.ts: ${DEFAULT_ARK_CLASS_NAME}.outerFunction1(number)`,
        methodSubSignature: {
            returnType: 'void'
        }
    },
    bodyBuilder: undefined,
    body: {
        locals: [
            {
                name: 'this',
                type: `@function/ClosureParamsTest.ts: ${DEFAULT_ARK_CLASS_NAME}`,
            },
            {
                name: 'outerInput',
                type: 'number',
            },
            {
                name: 'count',
                type: 'number',
            },
            {
                name: 'flag',
                type: 'number',
            },
            {
                name: 'innerFunction2',
                type: `@function/ClosureParamsTest.ts: ${DEFAULT_ARK_CLASS_NAME}.${ANONYMOUS_METHOD_PREFIX}0${NAME_DELIMITER}outerFunction1([outerInput])`,
                declaringStmt: {
                    text: `innerFunction2 = ${ANONYMOUS_METHOD_PREFIX}0${NAME_DELIMITER}outerFunction1`
                },
                usedStmts: [
                    {
                        // TODO: TypeInfer should locate the right function
                        text: `ptrinvoke <@%unk/%unk: .innerFunction2([outerInput])>(${CLOSURES_LOCAL_NAME}1)`
                    }
                ]
            },
            {
                name: `${CLOSURES_LOCAL_NAME}0`,
                type: `[count, flag]`,
                usedStmts: []
            },
            {
                name: `${CLOSURES_LOCAL_NAME}1`,
                type: `[outerInput]`,
                usedStmts: []
            }
        ],
        globals: [
            {
                name: `console`,
                type: 'unknown',
                instanceof: GlobalRef,
                usedStmts: [
                    {
                        text: 'instanceinvoke console.<@%unk/%unk: .log()>(%0)'
                    }
                ]
            },
            {
                name: `innerFunction1`,
                type: 'unknown',
                instanceof: GlobalRef,
                usedStmts: [
                    {
                        text: '%0 = staticinvoke <@%unk/%unk: .innerFunction1()>(\'abc\')'
                    }
                ]
            }
        ]
    }
};

export const ClosureFunction_Expect_IR = {
    outerMethod: {
        toString: `@function/ClosureParamsTest.ts: ${DEFAULT_ARK_CLASS_NAME}.outerFunction1(number)`,
    },
    methodSignature: {
        toString: `@function/ClosureParamsTest.ts: ${DEFAULT_ARK_CLASS_NAME}.${NAME_PREFIX}innerFunction1${NAME_DELIMITER}outerFunction1([count, flag], string)`,
        methodSubSignature: {
            parameters: [
                {
                    name: `${CLOSURES_LOCAL_NAME}0`,
                    type: '[count, flag]'
                },
                {
                    name: 'innerInput',
                    type: 'string'
                }
            ],
            returnType: 'string'
        }
    },
    bodyBuilder: undefined,
    body: {
        locals: [
            {
                name: `${CLOSURES_LOCAL_NAME}0`,
                type: '[count, flag]',
                declaringStmt: {
                    text: `${CLOSURES_LOCAL_NAME}0 = parameter0: [count, flag]`
                },
                usedStmts: [
                    {
                        text: `count = ${CLOSURES_LOCAL_NAME}0.count`
                    },
                    {
                        text: `flag = ${CLOSURES_LOCAL_NAME}0.flag`
                    }
                ]
            },
            {
                name: 'count',
                type: 'number',
                declaringStmt: {
                    text: `count = ${CLOSURES_LOCAL_NAME}0.count`
                },
                usedStmts: [
                    {
                        text: 'count = count + 1'
                    }
                ]
            },
            {
                name: 'flag',
                type: 'number',
                declaringStmt: {
                    text: `flag = ${CLOSURES_LOCAL_NAME}0.flag`
                },
                // TODO: switch中的变量使用算usedStmts吗？
                usedStmts: []
            },
            {
                name: 'innerInput',
                type: 'string',
                declaringStmt: {
                    text: 'innerInput = parameter1: string'
                },
            },
            {
                name: 'this',
                type: `@function/ClosureParamsTest.ts: ${DEFAULT_ARK_CLASS_NAME}`,
            },
            {
                name: 'result',
                type: 'string',
            },
        ],
        globals: undefined
    }
};

export const ClosureAnonymousFunction_Expect_IR = {
    outerMethod: {
        toString: `@function/ClosureParamsTest.ts: ${DEFAULT_ARK_CLASS_NAME}.outerFunction1(number)`,
    },
    methodSignature: {
        toString: `@function/ClosureParamsTest.ts: ${DEFAULT_ARK_CLASS_NAME}.${ANONYMOUS_METHOD_PREFIX}0${NAME_DELIMITER}outerFunction1([outerInput])`,
        methodSubSignature: {
            parameters: [
                {
                    name: `${CLOSURES_LOCAL_NAME}1`,
                    type: '[outerInput]'
                }
            ],
            returnType: 'void'
        }
    },
    bodyBuilder: undefined,
    body: {
        locals: [
            {
                name: `${CLOSURES_LOCAL_NAME}1`,
                type: '[outerInput]',
                declaringStmt: {
                    text: `${CLOSURES_LOCAL_NAME}1 = parameter0: [outerInput]`
                },
                usedStmts: [
                    {
                        text: `outerInput = ${CLOSURES_LOCAL_NAME}1.outerInput`
                    }
                ]
            },
            {
                name: 'outerInput',
                type: 'number',
                declaringStmt: {
                    text: `outerInput = ${CLOSURES_LOCAL_NAME}1.outerInput`
                },
            },
            {
                name: 'this',
                type: `@function/ClosureParamsTest.ts: ${DEFAULT_ARK_CLASS_NAME}`,
            }
        ],
        globals: [
            {
                name: 'console',
                type: 'unknown',
                instanceof: GlobalRef,
                usedStmts: [
                    {
                        text: 'instanceinvoke console.<@%unk/%unk: .log()>(outerInput)'
                    }
                ]
            }
        ]
    }
};

export const ClosureClassMethod_Expect_IR = {
    outerMethod: {
        toString: '@function/ClosureParamsTest.ts: ClosureClass.outerFunction2(number)'
    },
    methodSignature: {
        toString: `@function/ClosureParamsTest.ts: ClosureClass.${NAME_PREFIX}innerFunction2${NAME_DELIMITER}outerFunction2([count, nums], string)`,
        methodSubSignature: {
            parameters: [
                {
                    name: `${CLOSURES_LOCAL_NAME}0`,
                    type: '[count, nums]'
                },
                {
                    name: 'outerInput',
                    type: 'string'
                }
            ],
            returnType: 'string'
        }
    },
    bodyBuilder: undefined,
    body: {
        locals: [
            {
                name: `${CLOSURES_LOCAL_NAME}0`,
                type: '[count, nums]',
                declaringStmt: {
                    text: `${CLOSURES_LOCAL_NAME}0 = parameter0: [count, nums]`
                },
                usedStmts: [
                    {
                        text: `count = ${CLOSURES_LOCAL_NAME}0.count`
                    },
                    {
                        text: `nums = ${CLOSURES_LOCAL_NAME}0.nums`
                    },
                ]
            },
            {
                name: 'count',
                type: 'string',
                declaringStmt: {
                    text: `count = ${CLOSURES_LOCAL_NAME}0.count`
                },
                usedStmts: [
                    {
                        text: 'count = count + outerInput'
                    },
                    {
                        text: 'count = count + item'
                    },
                    {
                        text: '%5 = %4 + count'
                    }
                ]
            },
            {
                name: 'nums',
                type: 'number[]',
                declaringStmt: {
                    text: `nums = ${CLOSURES_LOCAL_NAME}0.nums`
                },
                usedStmts: [
                    {
                        text: '%0 = instanceinvoke nums.<@%unk/%unk: .iterator()>()'
                    }
                ]
            },
            {
                name: 'outerInput',
                type: 'string',
                declaringStmt: {
                    text: 'outerInput = parameter1: string'
                }
            },
            {
                name: 'this',
                type: '@function/ClosureParamsTest.ts: ClosureClass',
            },
            {
                name: 'item',
                type: 'number',
            }
        ],
    }
};

export const ClosureNamespaceFunction_Expect_IR = {
    outerMethod: {
        toString: `@function/ClosureParamsTest.ts: closureNamespace.${DEFAULT_ARK_CLASS_NAME}.outerFunction3(number)`
    },
    methodDeclareSignatures: [
        {
            toString: `@function/ClosureParamsTest.ts: closureNamespace.${DEFAULT_ARK_CLASS_NAME}.${NAME_PREFIX}innerFunction3${NAME_DELIMITER}outerFunction3([count, size, outerInput])`,
            methodSubSignature: {
                returnType: 'string'
            }
        },
        {
            toString: `@function/ClosureParamsTest.ts: closureNamespace.${DEFAULT_ARK_CLASS_NAME}.${NAME_PREFIX}innerFunction3${NAME_DELIMITER}outerFunction3([count, size, outerInput], string)`,
            methodSubSignature: {
                returnType: 'string'
            }
        }

    ],
    methodSignature: {
        toString: `@function/ClosureParamsTest.ts: closureNamespace.${DEFAULT_ARK_CLASS_NAME}.${NAME_PREFIX}innerFunction3${NAME_DELIMITER}outerFunction3([count, size, outerInput], string)`,
        methodSubSignature: {
            parameters: [
                {
                    name: `${CLOSURES_LOCAL_NAME}0`,
                    type: '[count, size, outerInput]'
                },
                {
                    name: 'innerInput',
                    type: 'string'
                }
            ],
            returnType: 'string'
        }
    },
    bodyBuilder: undefined,
    body: {
        locals: [
            {
                name: `${CLOSURES_LOCAL_NAME}0`,
                type: '[count, size, outerInput]',
                declaringStmt: {
                    text: `${CLOSURES_LOCAL_NAME}0 = parameter0: [count, size, outerInput]`
                },
                usedStmts: [
                    {
                        text: `count = ${CLOSURES_LOCAL_NAME}0.count`
                    },
                    {
                        text: `size = ${CLOSURES_LOCAL_NAME}0.size`
                    },
                    {
                        text: `outerInput = ${CLOSURES_LOCAL_NAME}0.outerInput`
                    }
                ]
            },
            {
                name: 'count',
                type: 'number',
                declaringStmt: {
                    text: `count = ${CLOSURES_LOCAL_NAME}0.count`
                },
                usedStmts: [
                    {
                        text: '%0 = count + size'
                    }
                ]
            },
            {
                name: 'size',
                type: 'number',
                declaringStmt: {
                    text: `size = ${CLOSURES_LOCAL_NAME}0.size`
                },
                usedStmts: [
                    {
                        text: '%0 = count + size'
                    }
                ]
            },
            {
                name: 'outerInput',
                type: 'number',
                declaringStmt: {
                    text: `outerInput = ${CLOSURES_LOCAL_NAME}0.outerInput`
                },
                usedStmts: [
                    {
                        text: '%1 = outerInput + \': \''
                    }
                ]
            },
            {
                name: 'innerInput',
                type: 'string',
                declaringStmt: {
                    text: 'innerInput = parameter1: string'
                },
                usedStmts: []
            },
            {
                name: 'this',
                type: `@function/ClosureParamsTest.ts: closureNamespace.${DEFAULT_ARK_CLASS_NAME}`,
            },
            {
                name: 'res',
                type: 'unknown',
            }
        ],
        globals: [
            {
                name: 'globalValue',
                type: 'unknown',
                instanceof: GlobalRef,
                usedStmts: [
                    {
                        text: 'res = %0 + globalValue'
                    }
                ]
            }
        ]
    }
};

export const ClosureNamespaceClassMethod_Expect_IR = {
    outerMethod: {
        toString: '@function/ClosureParamsTest.ts: closureNamespace.ClosureClass.outerFunction3(number)'
    },
    methodSignature: {
        toString: `@function/ClosureParamsTest.ts: closureNamespace.ClosureClass.${NAME_PREFIX}innerFunction3${NAME_DELIMITER}outerFunction3([flag, outerInput])`,
        methodSubSignature: {
            parameters: [
                {
                    name: `${CLOSURES_LOCAL_NAME}0`,
                    type: '[flag, outerInput]'
                }
            ],
            returnType: 'void'
        }
    },
    bodyBuilder: undefined,
    body: {
        locals: [
            {
                name: `${CLOSURES_LOCAL_NAME}0`,
                type: '[flag, outerInput]',
                declaringStmt: {
                    text: `${CLOSURES_LOCAL_NAME}0 = parameter0: [flag, outerInput]`
                },
                usedStmts: [
                    {
                        text: `flag = ${CLOSURES_LOCAL_NAME}0.flag`
                    },
                    {
                        text: `outerInput = ${CLOSURES_LOCAL_NAME}0.outerInput`
                    }
                ]
            },
            {
                name: 'flag',
                type: 'boolean',
                declaringStmt: {
                    text: `flag = ${CLOSURES_LOCAL_NAME}0.flag`
                },
                usedStmts: [
                    {
                        text: '%0 = !flag',
                    }
                ]
            },
            {
                name: 'outerInput',
                type: 'number',
                declaringStmt: {
                    text: `outerInput = ${CLOSURES_LOCAL_NAME}0.outerInput`
                },
                usedStmts: [
                    {
                        text: 'if outerInput > 0'
                    },
                    {
                        text: 'outerInput = outerInput - 1'
                    }
                ]
            },
            {
                name: 'this',
                type: '@function/ClosureParamsTest.ts: closureNamespace.ClosureClass'
            }
        ]
    }
};

export const UnClosureAnonymousInForEach_Expect_IR = {
    outerMethod: undefined,
    methodSignature: {
        toString: `@function/ClosureParamsTest.ts: BasicDataSource.notifyDataDelete(number)`,
    },
    bodyBuilder: undefined,
    body: {
        locals: [
            {
                name: `${CLOSURES_LOCAL_NAME}0`,
                type: '[index]',
                declaringStmt: null,
                usedStmts: []
            },
            {
                name: 'index',
                type: 'number',
                declaringStmt: {
                    text: `index = parameter0: number`
                },
                usedStmts: []
            },
            {
                name: '%AM0$notifyDataDelete',
                type: '@function/ClosureParamsTest.ts: BasicDataSource.%AM0$notifyDataDelete([index], unknown)',
                declaringStmt: null,
                usedStmts: [
                    {
                        text: 'instanceinvoke %0.<@%unk/%unk: .forEach()>(%AM0$notifyDataDelete)'
                    }
                ]
            }
        ],
        stmts: [
            {
                text: 'index = parameter0: number',
            },
            {
                text: 'this = this: @function/ClosureParamsTest.ts: BasicDataSource',
            },
            {
                text: '%0 = this.<@function/ClosureParamsTest.ts: BasicDataSource.listeners>',
            },
            {
                text: 'instanceinvoke %0.<@%unk/%unk: .forEach()>(%AM0$notifyDataDelete)',
            },
            {
                text: 'return',
            }
        ]
    }
};

export const ClosureAnonymousInForEach_Expect_IR = {
    outerMethod: {
        toString: '@function/ClosureParamsTest.ts: BasicDataSource.notifyDataDelete(number)'
    },
    methodSignature: {
        toString: `@function/ClosureParamsTest.ts: BasicDataSource.%AM0$notifyDataDelete([index], unknown)`,
    },
    bodyBuilder: undefined,
    body: {
        locals: [
            {
                name: `${CLOSURES_LOCAL_NAME}0`,
                type: '[index]',
                declaringStmt: {
                    text: '%closures0 = parameter0: [index]'
                },
                usedStmts: [
                    {
                        text: 'index = %closures0.index'
                    }
                ]
            },
            {
                name: 'index',
                type: 'number',
                declaringStmt: {
                    text: `index = %closures0.index`
                },
                usedStmts: [
                    {
                        text: '%0 = index + listener'
                    }
                ]
            }
        ],
        globals: [
            {
                name: 'console',
                type: 'unknown',
                instanceof: GlobalRef,
                usedStmts: [
                    {
                        text: 'instanceinvoke console.<@%unk/%unk: .log()>(%0)'
                    }
                ]
            }
        ]
    }
};