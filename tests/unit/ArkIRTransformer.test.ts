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

import { describe, expect, it } from 'vitest';
import { ArkClass, ArkFile, ArkMethod, Stmt } from '../../src';
import path from 'path';
import ts from 'ohos-typescript';
import { ETS_COMPILER_OPTIONS } from '../../src/core/common/EtsConst';
import fs from 'fs';
import { ArkIRTransformer } from '../../src/core/common/ArkIRTransformer';
import {
    BinaryExpression_Expect_IR,
    LiteralExpression_Expect_IR,
    NewExpression_Expect_IR,
    UnaryExpression_Expect_IR,
} from '../resources/arkIRTransformer/expression/ExpressionExpectIR';
import {
    CompoundAssignment_Expect_IR,
    Declaration_Expect_IR,
} from '../resources/arkIRTransformer/assignment/AssignmentExpectIR';

const baseDir = path.join(__dirname, '../../tests/resources/arkIRTransformer');

function getDumpMethod(): ArkMethod {
    const dumpArkFile = new ArkFile();
    dumpArkFile.setName('dumpArkFile');
    dumpArkFile.setProjectName('dumpProject');
    dumpArkFile.genFileSignature();
    const dumpArkClass = new ArkClass();
    dumpArkClass.setName('dumpArkClass');
    dumpArkFile.addArkClass(dumpArkClass);
    dumpArkClass.setDeclaringArkFile(dumpArkFile);
    dumpArkClass.genSignature();
    const dumpArkMethod = new ArkMethod();
    dumpArkMethod.setName('dumpArkMethod');
    dumpArkClass.addMethod(dumpArkMethod);
    dumpArkMethod.setDeclaringArkClass(dumpArkClass);
    return dumpArkMethod;
}

function transformTsToArkIR(filePath: string): Stmt[] {
    const sourceCode = fs.readFileSync(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(
        filePath,
        sourceCode,
        ts.ScriptTarget.Latest,
        undefined,
        undefined,
        ETS_COMPILER_OPTIONS,
    );
    const stmts: Stmt[] = [];
    const arkIRTransformer = new ArkIRTransformer(sourceFile, getDumpMethod());
    for (const statement of sourceFile.statements) {
        stmts.push(...arkIRTransformer.tsNodeToStmts(statement));
    }
    return stmts;
}

function testStmts(filePath: string, expectStmts: string[]): void {
    const stmts: Stmt[] = transformTsToArkIR(filePath);
    expect(stmts.length).eq(expectStmts.length);
    for (let i = 0; i < stmts.length; i++) {
        expect(stmts[i].toString()).eq(expectStmts[i]);
    }
}

describe('expression Test', () => {
    const expressionTestDir = path.join(baseDir, 'expression');

    it('test binary expression', async () => {
        testStmts(path.join(expressionTestDir, 'BinaryExpressionTest.ts'), BinaryExpression_Expect_IR.stmts);
    });

    it('test unary expression', async () => {
        testStmts(path.join(expressionTestDir, 'UnaryExpressionTest.ts'), UnaryExpression_Expect_IR.stmts);
    });

    it('test new expression', async () => {
        testStmts(path.join(expressionTestDir, 'NewExpressionTest.ts'), NewExpression_Expect_IR.stmts);
    });

    it('test literal expression', async () => {
        testStmts(path.join(expressionTestDir, 'LiteralExpressionTest.ts'), LiteralExpression_Expect_IR.stmts);
    });
});

describe('assignment Test', () => {
    const assignmentTestDir = path.join(baseDir, 'assignment');

    it('test declaration', async () => {
        testStmts(path.join(assignmentTestDir, 'DeclarationTest.ts'), Declaration_Expect_IR.stmts);
    });

    it('test compound assignment', async () => {
        testStmts(path.join(assignmentTestDir, 'CompoundAssignmentTest.ts'), CompoundAssignment_Expect_IR.stmts);
    });
});