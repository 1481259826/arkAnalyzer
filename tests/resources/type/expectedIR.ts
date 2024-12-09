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

export const AliasTypeOfClassA = {
    aliasType: {
        name: 'ClassAType',
        signature: `@type/test.ts: ${DEFAULT_ARK_CLASS_NAME}.[static]${DEFAULT_ARK_METHOD_NAME}()#ClassAType`,
        originalType: '@type/exportExample.ts: ClassA',
    },
    aliasTypeDeclaration: {
        sourceCode: 'declare type ClassAType = import(\'./exportExample\').ClassA;',
        position: {
            line: 16,
            column: 1,
        }
    }
};

export const AliasTypeOfClassB = {
    aliasType: {
        name: 'ClassBType',
        signature: `@type/test.ts: ${DEFAULT_ARK_CLASS_NAME}.[static]${DEFAULT_ARK_METHOD_NAME}()#ClassBType`,
        originalType: '@type/exportExample.ts: ClassB',
    },
    aliasTypeDeclaration: {
        sourceCode: 'declare type ClassBType = import(\'./exportExample\').default;',
        position: {
            line: 18,
            column: 1,
        }
    }
};

export const AliasTypeOfNumberA = {
    aliasType: {
        name: 'numberAType',
        signature: `@type/test.ts: ${DEFAULT_ARK_CLASS_NAME}.[static]${DEFAULT_ARK_METHOD_NAME}()#numberAType`,
        originalType: `@type/exportExample.ts: ${DEFAULT_ARK_CLASS_NAME}.[static]${DEFAULT_ARK_METHOD_NAME}()#numberA`,
    },
    aliasTypeDeclaration: {
        sourceCode: 'declare type numberAType = import(\'./exportExample\').numberA;',
        position: {
            line: 20,
            column: 1,
        }
    }
};

export const AliasTypeOfBoolean = {
    aliasType: {
        name: 'BooleanAliasType',
        signature: `@type/test.ts: ${DEFAULT_ARK_CLASS_NAME}.[static]${DEFAULT_ARK_METHOD_NAME}()#BooleanAliasType`,
        originalType: 'boolean'
    },
    aliasTypeDeclaration: {
        sourceCode: 'type BooleanAliasType = boolean;',
        position: {
            line: 22,
            column: 1,
        }
    }
};

export const AliasTypeOfString = {
    aliasType: {
        name: 'StringAliasType',
        signature: `@type/test.ts: ${DEFAULT_ARK_CLASS_NAME}.[static]${DEFAULT_ARK_METHOD_NAME}()#StringAliasType`,
        originalType: 'string'
    },
    aliasTypeDeclaration: {
        sourceCode: 'export type StringAliasType = string;',
        position: {
            line: 24,
            column: 1,
        }
    }
};
