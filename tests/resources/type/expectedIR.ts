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

import { DEFAULT_ARK_CLASS_NAME, DEFAULT_ARK_METHOD_NAME } from '../../../src';

export const AliasTypeOfBoolean = {
    aliasType: {
        name: 'BooleanAliasType',
        signature: `@type/test.ts: ${DEFAULT_ARK_CLASS_NAME}.simpleAliasType()#BooleanAliasType`,
        modifiers: 0,
        originalType: 'boolean'
    },
    aliasTypeDeclaration: {
        sourceCode: 'type BooleanAliasType = boolean;',
        position: {
            line: 19,
            column: 5,
        }
    }
};

export const AliasTypeOfString = {
    aliasType: {
        name: 'StringAliasType',
        signature: `@type/test.ts: ${DEFAULT_ARK_CLASS_NAME}.simpleAliasType()#StringAliasType`,
        modifiers: 0,
        originalType: 'string'
    },
    aliasTypeDeclaration: {
        sourceCode: 'type StringAliasType = string;',
        position: {
            line: 20,
            column: 5,
        }
    }
};

export const AliasTypeOfClassA = {
    aliasType: {
        name: 'ClassAType',
        signature: `@type/test.ts: ${DEFAULT_ARK_CLASS_NAME}.aliasTypeWithImport()#ClassAType`,
        modifiers: 0,
        originalType: 'unknown',
    },
    aliasTypeDeclaration: {
        sourceCode: 'type ClassAType = import(\'./exportExample\').ClassA;',
        position: {
            line: 28,
            column: 5,
        }
    }
};

export const AliasTypeOfClassAStmts = [
    {
        toString: '%0 = staticinvoke <@%unk/%unk: .[static]import(string)>(\'./exportExample\')', // 可以标识为buildin的函数
        line: 28,
        column: 5
    },
    {
        toString: 'ClassAType = %0.<@%unk/%unk: .ClassA>',
        line: 28,
        column: 5
    }
];

export const AliasTypeOfClassB = {
    aliasType: {
        name: 'ClassBType',
        signature: `@type/test.ts: ${DEFAULT_ARK_CLASS_NAME}.aliasTypeWithImport()#ClassBType`,
        modifiers: 0,
        originalType: 'unknown',
    },
    aliasTypeDeclaration: {
        sourceCode: 'type ClassBType = import(\'./exportExample\').default;',
        position: {
            line: 29,
            column: 5,
        }
    }
};

export const AliasTypeOfClassBStmts = [
    {
        toString: '%1 = staticinvoke <@%unk/%unk: .[static]import(string)>(\'./exportExample\')',
        line: 29,
        column: 5
    },
    {
        toString: 'ClassBType = %1.<@%unk/%unk: .default>',
        line: 29,
        column: 5
    }
];

export const AliasTypeOfNumberA = {
    aliasType: {
        name: 'NumberAType',
        signature: `@type/test.ts: ${DEFAULT_ARK_CLASS_NAME}.aliasTypeWithImport()#NumberAType`,
        modifiers: 0,
        originalType: `unknown`,
    },
    aliasTypeDeclaration: {
        sourceCode: 'type NumberAType = import(\'./exportExample\').numberA;',
        position: {
            line: 30,
            column: 5,
        }
    }
};

export const AliasTypeOfNumberAStmts = [
    {
        toString: '%2 = staticinvoke <@%unk/%unk: .[static]import(string)>(\'./exportExample\')',
        line: 30,
        column: 5
    },
    {
        toString: 'NumberAType = %2.<@%unk/%unk: .numberA>',
        line: 30,
        column: 5
    }
];

export const AliasTypeOf = {
    aliasType: {
        name: 'typeOfType',
        signature: `@type/test.ts: ${DEFAULT_ARK_CLASS_NAME}.aliasTypeWithImport()#typeOfType`,
        modifiers: 0,
        originalType: 'unknown'
    },
    aliasTypeDeclaration: {
        sourceCode: 'type typeOfType = typeof import(\'./exportExample\');',
        position: {
            line: 32,
            column: 5,
        }
    }
};

export const AliasTypeOfStmts = [
    {
        toString: '%3 = staticinvoke <@%unk/%unk: .[static]import(string)>(\'./exportExample\')',
        line: 32,
        column: 5
    },
    {
        toString: 'typeOfType = typeof %3',
        line: 32,
        column: 5
    }
];

export const AliasTypeOfMultiImport = {
    aliasType: {
        name: 'MultiImportType',
        signature: `@type/test.ts: ${DEFAULT_ARK_CLASS_NAME}.aliasTypeWithImport()#MultiImportType`,
        modifiers: 0,
        originalType: 'unknown'
    },
    aliasTypeDeclaration: {
        sourceCode: 'type MultiImportType = import(\'./exportExample\').A.B.C;',
        position: {
            line: 33,
            column: 5,
        }
    }
};

export const AliasTypeOfMultiImportStmts = [
    {
        toString: '%4 = staticinvoke <@%unk/%unk: .[static]import(string)>(\'./exportExample\')',
        line: 33,
        column: 5
    },
    {
        toString: '%5 = %4.<@%unk/%unk: .A>',
        line: 33,
        column: 5
    },
    {
        toString: '%6 = %5.<@%unk/%unk: .B>',
        line: 33,
        column: 5
    },
    {
        toString: 'MultiImportType = %6.<@%unk/%unk: .C>',
        line: 33,
        column: 5
    }
];

export const AliasTypeOfRef = {
    aliasType: {
        name: 'ReferTypeOf',
        signature: `@type/test.ts: ${DEFAULT_ARK_CLASS_NAME}.aliasTypeWithTypeOf()#ReferTypeOf`,
        modifiers: 0,
        originalType: 'unknown'
    },
    aliasTypeDeclaration: {
        sourceCode: 'type ReferTypeOf = typeof objectA;',
        position: {
            line: 42,
            column: 5,
        }
    }
};

export const AliasTypeOfRefStmts = [
    {
        toString: 'ReferTypeOf = typeof objectA',
        line: 42,
        column: 5
    }
];

export const AliasTypeOfMultiRef = {
    aliasType: {
        name: 'MultiReferTypeOf',
        signature: `@type/test.ts: ${DEFAULT_ARK_CLASS_NAME}.aliasTypeWithTypeOf()#MultiReferTypeOf`,
        modifiers: 0,
        originalType: 'unknown'
    },
    aliasTypeDeclaration: {
        sourceCode: 'type MultiReferTypeOf = typeof objectA.a.b.c;',
        position: {
            line: 43,
            column: 5,
        }
    }
};

export const AliasTypeOfMultiRefStmts = [
    {
        toString: '%0 = objectA.<@%unk/%unk: .a>',
        line: 43,
        column: 5
    },
    {
        toString: '%1 = %0.<@%unk/%unk: .b>',
        line: 43,
        column: 5
    },
    {
        toString: 'MultiReferTypeOf = typeof %1.<@%unk/%unk: .c>',
        line: 43,
        column: 5
    }
];

export const AliasTypeRef = {
    aliasType: {
        name: 'ReferType',
        signature: `@type/test.ts: ${DEFAULT_ARK_CLASS_NAME}.aliasTypeWithReference()#ReferType`,
        modifiers: 0,
        originalType: 'unknown'
    },
    aliasTypeDeclaration: {
        sourceCode: 'type ReferType = numberA;',
        position: {
            line: 47,
            column: 5,
        }
    }
};

export const AliasTypeRefStmts = [
    {
        toString: 'ReferType = numberA',
        line: 47,
        column: 5,
        operandColumns: [[10,19], [22,29]]
    }
];

export const AliasTypeMultiRef = {
    aliasType: {
        name: 'MultiReferType',
        signature: `@type/test.ts: ${DEFAULT_ARK_CLASS_NAME}.aliasTypeWithReference()#MultiReferType`,
        modifiers: 0,
        originalType: 'unknown'
    },
    aliasTypeDeclaration: {
        sourceCode: 'type MultiReferType = A.B.C;',
        position: {
            line: 48,
            column: 5,
        }
    }
};

export const AliasTypeMultiRefStmts = [
    {
        toString: '%0 = A.<@%unk/%unk: .B>',
        line: 48,
        column: 5
    },
    {
        toString: 'MultiReferType = %0.<@%unk/%unk: .C>',
        line: 48,
        column: 5
    }
];

export const AliasOriginalType = {
    BooleanAliasType: 'boolean',
    StringAliasType: 'string',
    ClassAType: '@type/exportExample.ts: ClassA',
    ClassBType: '@type/exportExample.ts: ClassB',
    NumberAType: `@type/exportExample.ts: ${DEFAULT_ARK_CLASS_NAME}.[static]${DEFAULT_ARK_METHOD_NAME}()#numberA`,
    typeOfType: `@type/exportExample.ts: ${DEFAULT_ARK_CLASS_NAME}`,
    MultiImportType: '@type/exportExample.ts: A.B.C',
    ReferTypeOf: 'unknown',
    MultiReferTypeOf: 'unknown',
    ReferType: `@type/exportExample.ts: ${DEFAULT_ARK_CLASS_NAME}.[static]${DEFAULT_ARK_METHOD_NAME}()#numberA`,
    MultiReferType: '@type/exportExample.ts: A.B.C'
};

export const AliasLocalType = {
    ClassAType: '@type/exportExample.ts: ClassA',
    ClassBType: '@type/exportExample.ts: ClassB',
    NumberAType: `@type/exportExample.ts: ${DEFAULT_ARK_CLASS_NAME}.[static]${DEFAULT_ARK_METHOD_NAME}()#numberA`,
    typeOfType: `@type/exportExample.ts: ${DEFAULT_ARK_CLASS_NAME}`,
    MultiImportType: '@type/exportExample.ts: A.B.C',
    ReferTypeOf: 'unknown',
    MultiReferTypeOf: 'unknown',
    ReferType: `@type/exportExample.ts: ${DEFAULT_ARK_CLASS_NAME}.[static]${DEFAULT_ARK_METHOD_NAME}()#numberA`,
    MultiReferType: '@type/exportExample.ts: A.B.C'
}