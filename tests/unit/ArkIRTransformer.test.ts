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

import { assert, describe, expect, it } from 'vitest';
import { Scene, SceneConfig, Stmt } from '../../src';
import path from 'path';
import {
    BinaryExpression_Expect_IR, CallExpression_Expect_IR,
    LiteralExpression_Expect_IR,
    NewExpression_Expect_IR,
    Operator_Expect_IR,
    UnaryExpression_Expect_IR,
} from '../resources/arkIRTransformer/expression/ExpressionExpectIR';
import {
    CompoundAssignment_Expect_IR,
    Declaration_Expect_IR,
} from '../resources/arkIRTransformer/assignment/AssignmentExpectIR';
import { ModelUtils } from '../../src/core/common/ModelUtils';
import { DEFAULT_ARK_METHOD_NAME } from '../../src/core/common/Const';
import { ArrowFunction_Expect_IR } from '../resources/arkIRTransformer/function/FunctionExpectIR';

const BASE_DIR = path.join(__dirname, '../../tests/resources/arkIRTransformer');

function testMethodStmts(scene: Scene, filePath: string, expectStmts: any[]): void {
    const arkFile = scene.getFiles().find((file) => file.getName().endsWith(filePath));
    const arkMethod = arkFile?.getDefaultClass().getMethods()
        .find((method) => (method.getName() === DEFAULT_ARK_METHOD_NAME));
    const stmts = arkMethod?.getCfg()?.getStmts();
    if (!stmts) {
        assert.isDefined(stmts);
        return;
    }
    assertStmtsEqual(stmts, expectStmts);
}

function testFileStmts(scene: Scene, filePath: string, expectFileStmts: any): void {
    const arkFile = scene.getFiles().find((file) => file.getName().endsWith(filePath));
    if (!arkFile) {
        assert.isDefined(arkFile);
        return;
    }
    const methods = ModelUtils.getAllMethodsInFile(arkFile);
    for (const expectMethod of expectFileStmts.methods) {
        const expectMethodName = expectMethod.name;
        const method = methods.find((method) => method.getName() === expectMethodName);
        if (!method) {
            assert.isDefined(method);
            continue;
        }
        const stmts = method.getCfg()?.getStmts();
        if (!stmts) {
            assert.isDefined(stmts);
            continue;
        }
        assertStmtsEqual(stmts, expectMethod.stmts);
    }
}

function assertStmtsEqual(stmts: Stmt[], expectStmts: any[]): void {
    expect(stmts.length).toEqual(expectStmts.length);
    for (let i = 0; i < stmts.length; i++) {
        expect(stmts[i].toString()).toEqual(expectStmts[i].text);

        const operandOriginalPositions: any[] = [];
        for (const operand of stmts[i].getDefAndUses()) {
            const operandOriginalPosition = stmts[i].getOperandOriginalPosition(operand);
            if (operandOriginalPosition) {
                operandOriginalPositions.push(
                    [operandOriginalPosition.getFirstLine(), operandOriginalPosition.getFirstCol(),
                        operandOriginalPosition.getLastLine(), operandOriginalPosition.getLastCol()]);
            } else {
                operandOriginalPositions.push(operandOriginalPosition);
            }
        }
        expect(operandOriginalPositions).toEqual(expectStmts[i].operandOriginalPositions);
    }
}

function buildScene(folderName: string) {
    let config: SceneConfig = new SceneConfig();
    config.buildFromProjectDir(path.join(BASE_DIR, folderName));
    let scene = new Scene();
    scene.buildSceneFromProjectDir(config);
    return scene;
}

describe('expression Test', () => {
    const scene = buildScene('expression');

    it('test binary expression', async () => {
        testMethodStmts(scene, 'BinaryExpressionTest.ts', BinaryExpression_Expect_IR.stmts);
    });

    it('test unary expression', async () => {
        testMethodStmts(scene, 'UnaryExpressionTest.ts', UnaryExpression_Expect_IR.stmts);
    });

    it('test new expression', async () => {
        testMethodStmts(scene, 'NewExpressionTest.ts', NewExpression_Expect_IR.stmts);
    });

    it('test literal expression', async () => {
        testMethodStmts(scene, 'LiteralExpressionTest.ts', LiteralExpression_Expect_IR.stmts);
    });

    it('test operator', async () => {
        testMethodStmts(scene, 'OperatorTest.ts', Operator_Expect_IR.stmts);
    });

    it('test call expression', async () => {
        testMethodStmts(scene, 'CallExpressionTest.ts', CallExpression_Expect_IR.stmts);
    });
});

describe('assignment Test', () => {
    const scene = buildScene('assignment');

    it('test declaration', async () => {
        testMethodStmts(scene, 'DeclarationTest.ts', Declaration_Expect_IR.stmts);
    });

    it('test compound assignment', async () => {
        testMethodStmts(scene, 'CompoundAssignmentTest.ts', CompoundAssignment_Expect_IR.stmts);
    });
});

describe('function Test', () => {
    const scene = buildScene('function');

    it('test arrow function', async () => {
        testFileStmts(scene, 'ArrowFunctionTest.ts', ArrowFunction_Expect_IR);
    });
});