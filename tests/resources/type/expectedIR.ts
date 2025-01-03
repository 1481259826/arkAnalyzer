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
    AliasTypeExpr,
    AliasTypeImportExpr,
    ArkAliasTypeDefineStmt,
    DEFAULT_ARK_CLASS_NAME,
} from '../../../src';

export const AliasTypeOfBoolean = {
    alias: {
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
    },
    stmts: [
        {
            instanceof: ArkAliasTypeDefineStmt,
            typeAliasExpr: {
                instanceof: AliasTypeExpr,
                toString: 'boolean'
            },
            toString: 'type BooleanAliasType = boolean',
            line: 19,
            column: 5,
            operandColumns: [[10, 26], [29, 36]]
        }
    ]
};

export const AliasTypeOfString = {
    alias: {
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
    },
    stmts: [
        {
            instanceof: ArkAliasTypeDefineStmt,
            typeAliasExpr: {
                instanceof: AliasTypeExpr,
                toString: 'string'
            },
            toString: 'type StringAliasType = string',
            line: 20,
            column: 5,
            operandColumns: [[10, 25], [28, 34]]
        }
    ]
};

export const AliasTypeOfClassA = {
    alias: {
        aliasType: {
            name: 'ClassAType',
            signature: `@type/test.ts: ${DEFAULT_ARK_CLASS_NAME}.aliasTypeWithImport()#ClassAType`,
            modifiers: 0,
            originalType: '@type/exportExample.ts: ClassA',
        },
        aliasTypeDeclaration: {
            sourceCode: 'type ClassAType = import(\'./exportExample\').ClassA;',
            position: {
                line: 28,
                column: 5,
            }
        }
    },
    stmts: [
        {
            instanceof: ArkAliasTypeDefineStmt,
            typeAliasExpr: {
                instanceof: AliasTypeImportExpr,
                toString: 'import(\'./exportExample\').ClassA'
            },
            toString: 'type ClassAType = import(\'./exportExample\').ClassA',
            line: 28,
            column: 5,
            operandColumns: [[10, 20], [23, 55]]
        }
    ]
};

export const AliasTypeOfClassB = {
    alias: {
        aliasType: {
            name: 'ClassBType',
            signature: `@type/test.ts: ${DEFAULT_ARK_CLASS_NAME}.aliasTypeWithImport()#ClassBType`,
            modifiers: 0,
            originalType: '@type/exportExample.ts: ClassB',
        },
        aliasTypeDeclaration: {
            sourceCode: 'type ClassBType = import(\'./exportExample\').default;',
            position: {
                line: 29,
                column: 5,
            }
        }
    },
    stmts: [
        {
            instanceof: ArkAliasTypeDefineStmt,
            typeAliasExpr: {
                instanceof: AliasTypeImportExpr,
                toString: 'import(\'./exportExample\').default'
            },
            toString: 'type ClassBType = import(\'./exportExample\').default',
            line: 29,
            column: 5,
            operandColumns: [[10, 20], [23, 56]]
        }
    ]
};

export const AliasTypeOfNumberA = {
    alias: {
        aliasType: {
            name: 'NumberAType',
            signature: `@type/test.ts: %dflt.aliasTypeWithImport()#NumberAType`,
            modifiers: 0,
            originalType: `@type/exportExample.ts: %dflt.[static]%dflt()#numberA`,
        },
        aliasTypeDeclaration: {
            sourceCode: 'type NumberAType = import(\'./exportExample\').numberA;',
            position: {
                line: 30,
                column: 5,
            }
        }
    },
    stmts: [
        {
            instanceof: ArkAliasTypeDefineStmt,
            typeAliasExpr: {
                instanceof: AliasTypeImportExpr,
                toString: 'import(\'./exportExample\').numberA'
            },
            toString: 'type NumberAType = import(\'./exportExample\').numberA',
            line: 30,
            column: 5,
            operandColumns: [[10, 21], [24, 57]]
        }
    ]
};

export const AliasTypeOfMultiQualifier = {
    alias: {
        aliasType: {
            name: 'MultiQualifierType',
            signature: `@type/test.ts: ${DEFAULT_ARK_CLASS_NAME}.aliasTypeWithImport()#MultiQualifierType`,
            modifiers: 0,
            originalType: '@type/exportExample.ts: A.B.C'
        },
        aliasTypeDeclaration: {
            sourceCode: 'type MultiQualifierType = import(\'./exportExample\').A.B.C;',
            position: {
                line: 33,
                column: 5,
            }
        }
    },
    stmts: [
        {
            instanceof: ArkAliasTypeDefineStmt,
            typeAliasExpr: {
                instanceof: AliasTypeImportExpr,
                toString: 'import(\'./exportExample\').A.B.C'
            },
            toString: 'type MultiQualifierType = import(\'./exportExample\').A.B.C',
            line: 33,
            column: 5,
            operandColumns: [[10, 28], [31, 62]]
        }
    ]
};

export const AliasTypeOfSingleTypeQuery = {
    alias: {
        aliasType: {
            name: 'SingleTypeQuery',
            signature: `@type/test.ts: ${DEFAULT_ARK_CLASS_NAME}.aliasTypeWithTypeQuery()#SingleTypeQuery`,
            modifiers: 0,
            originalType: '@type/exportExample.ts: %AC$%dflt$%dflt$0'
        },
        aliasTypeDeclaration: {
            sourceCode: 'type SingleTypeQuery = typeof objectA;',
            position: {
                line: 42,
                column: 5,
            }
        }
    },
    stmts: [
        {
            instanceof: ArkAliasTypeDefineStmt,
            typeAliasExpr: {
                instanceof: AliasTypeExpr,
                toString: 'typeof objectA'
            },
            toString: 'type SingleTypeQuery = typeof objectA',
            line: 42,
            column: 5,
            operandColumns: [[10, 25], [28, 42]]
        }
    ]
};

export const AliasTypeOfMultiTypeQuery = {
    alias: {
        aliasType: {
            name: 'MultiTypeQuery',
            signature: `@type/test.ts: ${DEFAULT_ARK_CLASS_NAME}.aliasTypeWithTypeQuery()#MultiTypeQuery`,
            modifiers: 0,
            originalType: 'string'
        },
        aliasTypeDeclaration: {
            sourceCode: 'type MultiTypeQuery = typeof objectA.a.b.c;',
            position: {
                line: 43,
                column: 5,
            }
        }
    },
    stmts: [
        {
            instanceof: ArkAliasTypeDefineStmt,
            typeAliasExpr: {
                instanceof: AliasTypeExpr,
                toString: 'typeof objectA.a.b.c'
            },
            toString: 'type MultiTypeQuery = typeof objectA.a.b.c',
            line: 43,
            column: 5,
            operandColumns: [[10, 24], [27, 47]]
        }
    ]
};

export const AliasTypeRef = {
    alias: {
        aliasType: {
            name: 'ReferType',
            signature: `@type/test.ts: ${DEFAULT_ARK_CLASS_NAME}.aliasTypeWithReference()#ReferType`,
            modifiers: 0,
            originalType: '@type/exportExample.ts: %dflt.[static]%dflt()#numberA'
        },
        aliasTypeDeclaration: {
            sourceCode: 'type ReferType = numberA;',
            position: {
                line: 47,
                column: 5,
            }
        }
    },
    stmts: [
        {
            instanceof: ArkAliasTypeDefineStmt,
            typeAliasExpr: {
                instanceof: AliasTypeExpr,
                toString: 'numberA'
            },
            toString: 'type ReferType = numberA',
            line: 47,
            column: 5,
            operandColumns: [[10, 19], [22, 29]]
        }
    ]
};

export const AliasTypeMultiRef = {
    alias: {
        aliasType: {
            name: 'MultiReferType',
            signature: `@type/test.ts: ${DEFAULT_ARK_CLASS_NAME}.aliasTypeWithReference()#MultiReferType`,
            modifiers: 0,
            originalType: '@type/exportExample.ts: A.B.C'
        },
        aliasTypeDeclaration: {
            sourceCode: 'type MultiReferType = A.B.C;',
            position: {
                line: 48,
                column: 5,
            }
        }
    },
    stmts: [
        {
            instanceof: ArkAliasTypeDefineStmt,
            typeAliasExpr: {
                instanceof: AliasTypeExpr,
                toString: 'A.B.C'
            },
            toString: 'type MultiReferType = A.B.C',
            line: 48,
            column: 5,
            operandColumns: [[10, 24], [27, 32]]
        }
    ]
};

export const AliasTypeOfLiteralType = {
    alias: {
        aliasType: {
            name: 'ABC',
            signature: `@type/test.ts: ${DEFAULT_ARK_CLASS_NAME}.aliasTypeWithLiteralType()#ABC`,
            modifiers: 16384,
            originalType: '\'123\''
        },
        aliasTypeDeclaration: {
            sourceCode: 'declare type ABC = \'123\';',
            position: {
                line: 52,
                column: 5,
            }
        }
    },
    stmts: [
        {
            instanceof: ArkAliasTypeDefineStmt,
            typeAliasExpr: {
                instanceof: AliasTypeExpr,
                toString: '\'123\''
            },
            toString: 'declare type ABC = \'123\'',
            line: 52,
            column: 5,
            operandColumns: [[18, 21], [24, 29]]
        }
    ]
};

export const AliasTypeOfQueryOfLiteralType = {
    alias: {
        aliasType: {
            name: 'XYZ',
            signature: `@type/test.ts: ${DEFAULT_ARK_CLASS_NAME}.aliasTypeWithLiteralType()#XYZ`,
            modifiers: 0,
            originalType: '@type/test.ts: %dflt.aliasTypeWithLiteralType()#ABC'
        },
        aliasTypeDeclaration: {
            sourceCode: 'type XYZ = typeof a;',
            position: {
                line: 54,
                column: 5,
            }
        }
    },
    stmts: [
        {
            instanceof: ArkAliasTypeDefineStmt,
            typeAliasExpr: {
                instanceof: AliasTypeExpr,
                toString: 'typeof a'
            },
            toString: 'type XYZ = typeof a',
            line: 54,
            column: 5,
            operandColumns: [[10, 13], [16, 24]]
        }
    ]
};