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

import { assert, describe, it } from 'vitest';
import path from 'path';
import { SceneConfig } from "../../src/Config";
import { Scene } from "../../src/Scene";
import { FileSignature } from "../../src/core/model/ArkSignature";
import {
    ArkAssignStmt,
    ArkInstanceFieldRef,
    ArkNewArrayExpr,
    ArkStaticFieldRef,
    ArrayType,
    ClassType,
    NumberType,
    StringType
} from "../../src";
import Logger, { LOG_LEVEL } from '../../src/utils/logger';

const logPath = 'out/ArkAnalyzer.log';
const logger = Logger.getLogger();
Logger.configure(logPath, LOG_LEVEL.DEBUG);

describe("Infer Array Test", () => {

    let config: SceneConfig = new SceneConfig();
    config.buildFromProjectDir(path.join(__dirname, "../resources/inferType"))
    let projectScene: Scene = new Scene();
    projectScene.buildSceneFromProjectDir(config);
    projectScene.collectProjectImportInfos();
    projectScene.inferTypes();
    it('normal case', () => {

        const fileId = new FileSignature();
        fileId.setFileName("inferSample.ts");
        fileId.setProjectName(projectScene.getProjectName());
        const file = projectScene.getFile(fileId);
        const method = file?.getDefaultClass().getMethodWithName('test_new_array');
        assert.isDefined(method);
        const stmt = method?.getCfg()?.getStmts()[1];
        assert.isTrue(stmt instanceof ArkAssignStmt);
        assert.isTrue((stmt as ArkAssignStmt).getRightOp() instanceof ArkNewArrayExpr);
        assert.isTrue((stmt as ArkAssignStmt).getRightOp().getType() instanceof ArrayType);
        assert.isTrue((stmt as ArkAssignStmt).getLeftOp().getType() instanceof ArrayType);
    })

    it('array case', () => {
        const fileId = new FileSignature();
        fileId.setFileName("inferSample.ts");
        fileId.setProjectName(projectScene.getProjectName());
        const file = projectScene.getFile(fileId);
        const method = file?.getDefaultClass().getMethodWithName('testArray');
        const stmt = method?.getCfg()?.getStmts()[2];
        assert.isTrue(stmt instanceof ArkAssignStmt);
        const type = (stmt as ArkAssignStmt).getLeftOp().getType();
        assert.isTrue(type instanceof ArrayType);
        assert.isTrue((type as ArrayType).getBaseType() instanceof NumberType);
    })

    it('array Expr case', () => {
        const fileId = new FileSignature();
        fileId.setFileName("inferSample.ts");
        fileId.setProjectName(projectScene.getProjectName());
        const file = projectScene.getFile(fileId);
        const method = file?.getDefaultClass().getMethodWithName('arrayExpr');
        const stmts = method?.getCfg()?.getStmts();
        assert.isDefined(stmts);
        if (stmts) {
            assert.equal(stmts[1].toString(), '$temp0 = newarray (number)[0]');
            assert.equal(stmts[2].toString(), '$temp1 = newarray (string)[0]');
            assert.equal(stmts[3].toString(), '$temp2 = newarray (@inferType/inferSample.ts: Sample)[0]');
            assert.equal(stmts[4].toString(), '$temp3 = newarray (string|@inferType/inferSample.ts: Sample)[2]');
            assert.equal(stmts[5].toString(), '$temp4 = newarray (any)[0]');
        }
    })

    it('array Literal case', () => {
        const fileId = new FileSignature();
        fileId.setFileName("inferSample.ts");
        fileId.setProjectName(projectScene.getProjectName());
        const file = projectScene.getFile(fileId);
        const method = file?.getDefaultClass().getMethodWithName('arrayLiteral');
        const stmts = method?.getCfg()?.getStmts();
        assert.isDefined(stmts);
        if (stmts) {
            assert.equal(stmts[1].toString(), '$temp0 = newarray (number)[3]');
            assert.equal(stmts[6].toString(), '$temp1 = newarray (string)[2]');
            assert.equal(stmts[12].toString(), '$temp3 = newarray (@inferType/inferSample.ts: Sample)[1]');
            assert.equal(stmts[15].toString(), '$temp4 = newarray (number|string)[2]');
            assert.equal(stmts[19].toString(), '$temp5 = newarray (any)[0]');
            assert.equal(stmts[23].toString(), '$temp7 = newarray (number|string|@inferType/inferSample.ts: Sample)[3]');
        }
    })

    it('fieldRef to ArrayRef case', () => {
        const fileId = new FileSignature();
        fileId.setFileName("inferSample.ts");
        fileId.setProjectName(projectScene.getProjectName());
        const file = projectScene.getFile(fileId);
        const method = file?.getDefaultClass().getMethodWithName('test_new_array');
        const stmts = method?.getCfg()?.getStmts();
        assert.isDefined(stmts);
        if (stmts) {
            assert.equal(stmts[9].toString(), 'c = $temp1[$temp2]');
            assert.equal(stmts[11].toString(), 's = $temp3[a]');
            assert.equal(stmts[13].toString(), 'n = $temp4[3]');
        }
    })


    it('demo case', () => {
        const fileId = new FileSignature();
        fileId.setFileName("demo.ts");
        fileId.setProjectName(projectScene.getProjectName());
        const file = projectScene.getFile(fileId);
        const method = file?.getClassWithName('StaticUserB')?.getMethodWithName('f1');
        const stmt = method?.getCfg()?.getStmts()[1];
        assert.isDefined(stmt);
        assert.isTrue((stmt as ArkAssignStmt).getLeftOp().getType() instanceof NumberType);
        assert.isTrue((stmt as ArkAssignStmt).getRightOp() instanceof ArkStaticFieldRef);
    })

    it('field case', () => {
        const fileId = new FileSignature();
        fileId.setFileName("Field.ts");
        fileId.setProjectName(projectScene.getProjectName());
        const file = projectScene.getFile(fileId);
        const method = file?.getClassWithName('C2')?.getMethodWithName('f2');
        const stmt = method?.getCfg()?.getStmts()[2];
        assert.isDefined(stmt);
        assert.isTrue((stmt as ArkAssignStmt).getLeftOp().getType() instanceof ClassType);
        assert.isTrue((stmt as ArkAssignStmt).getRightOp() instanceof ArkInstanceFieldRef);
        assert.equal(file?.getClassWithName('C1')?.getFieldWithName('s')?.getType(), StringType.getInstance())
    })

    it('field type case', () => {
        const fileId = new FileSignature();
        fileId.setFileName("Field.ts");
        fileId.setProjectName(projectScene.getProjectName());
        const file = projectScene.getFile(fileId);
        const fields = file?.getClassWithName('FieldType')?.getFields();
        if (fields) {
            const arkField = fields[0];
            assert.equal(arkField.getType(), '(number|string)[]');
            assert.equal(fields[1].getType(), StringType.getInstance())
        }
    })

    it('supperClass Test case', () => {
        const fileId = new FileSignature();
        fileId.setFileName("B.ets");
        fileId.setProjectName(projectScene.getProjectName());
        assert.isDefined(projectScene.getFile(fileId)?.getClassWithName('ClassB')?.getSuperClass());
    })

    it('constructor case', () => {
        const fileId = new FileSignature();
        fileId.setFileName("demo.ts");
        fileId.setProjectName(projectScene.getProjectName());
        const file = projectScene.getFile(fileId);
        const returnType = file?.getClassWithName('Test')?.getMethodWithName('constructor')
            ?.getReturnType();
        assert.isTrue(returnType instanceof ClassType);
        assert.equal((returnType as ClassType).getClassSignature().toString(), '@inferType/demo.ts: Test');
    })

    it('all case', () => {
        projectScene.getMethods().forEach(m => {
            m.getCfg()?.getStmts().forEach(s => {
                const text = s.toString();
                if (text.includes('Unknown')) {
                    logger.log(text + ' warning ' + m.getSignature().toString());
                }
            })
        })
    })

    it('methodsMap refresh', () => {
        let flag = false;
        projectScene.getMethods().forEach(m => {
            if (m.getSignature().toString().includes('SCBTransitionManager.registerUnlockTransitionController(@inferType/test1.ets: SCBUnlockTransitionController')) {
                if (projectScene.getMethod(m.getSignature()) !== null) {
                    flag = true
                }
            }
        })
        assert.isTrue(flag)
    })
})

function equals(actual: any, expect: string) {
    assert.isDefined(actual);
    assert.equal(actual, expect);
}