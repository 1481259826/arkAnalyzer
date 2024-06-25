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
import { ArkAssignStmt, ArkNewArrayExpr, ArkStaticFieldRef, ArrayType, NumberType } from "../../src";

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
        const stmt = method?.getCfg().getStmts()[1];
        assert.isTrue(stmt instanceof ArkAssignStmt);
        assert.isTrue((stmt as ArkAssignStmt).getRightOp() instanceof ArkNewArrayExpr);
        assert.isTrue((stmt as ArkAssignStmt).getRightOp().getType() instanceof ArrayType);
        assert.isTrue((stmt as ArkAssignStmt).getLeftOp().getType() instanceof ArrayType);
    })


    it('demo case', () => {
        const fileId = new FileSignature();
        fileId.setFileName("demo.ts");
        fileId.setProjectName(projectScene.getProjectName());
        const file = projectScene.getFile(fileId);
        const method = file?.getClassWithName('StaticUserB')?.getMethodWithName('f1');
        const stmt = method?.getCfg().getStmts()[1];
        assert.isDefined(stmt);
        assert.isTrue((stmt as ArkAssignStmt).getLeftOp().getType() instanceof NumberType);
        assert.isTrue((stmt as ArkAssignStmt).getRightOp() instanceof ArkStaticFieldRef);
    })
})
