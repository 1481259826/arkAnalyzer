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

describe("export Test", () => {
    it('debug case', () => {

        let config: SceneConfig = new SceneConfig();
        config.buildFromProjectDir(path.join(__dirname, "../resources/exports"))
        let projectScene: Scene = new Scene();
        projectScene.buildSceneFromProjectDir(config);
        projectScene.collectProjectImportInfos();
        projectScene.inferTypes();
        const fileId = new FileSignature();
        fileId.setFileName("test.ts");
        fileId.setProjectName(projectScene.getProjectName());
        const file = projectScene.getFile(fileId);
        assert.equal(file?.getExportInfos().length,2);
        assert.equal(file?.getImportInfos().length, 17);
    })
})

describe("function Test", () => {
    it('debug case', () => {
        const s = 'D:/test/sfs.test'
        let lw = s.replace(/\/*$/, '');
        assert.isTrue(/^@\w+\./.test('@ohos.hilog'))
        assert.isTrue(/^@\w+\./.test('@hwos.hilog'))
        assert.isTrue(/\.e?ts$/.test('ets.d.ts'))
        assert.isTrue(/\.e?ts$/.test('ts.d.ets'))
    })
})