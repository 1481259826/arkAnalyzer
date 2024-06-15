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

import { fetchDependenciesFromFile } from '../../src/utils/json5parser';
import { assert, describe, expect, it } from 'vitest';
import path from 'path';
import {SceneConfig} from "../../src/Config";
import {Scene} from "../../src/Scene";
import {FileSignature} from "../../src/core/model/ArkSignature";
import {ExportInfo} from "../../src/core/model/ArkExport";
import {ImportInfo} from "../../src/core/model/ArkImport";

describe("export Test", () => {
    it('debug case', () => {

        let config: SceneConfig = new SceneConfig();
        // config.buildFromJson(path.join(__dirname, "../resources/exports/Config.json"))
        config.buildFromProjectDir(path.join(__dirname, "../resources/exports"))

        let projectScene: Scene = new Scene();
        // projectScene.buildBasicInfo(config);
        projectScene.buildSceneFromProjectDir(config);
        projectScene.collectProjectImportInfos();
        projectScene.inferTypes();
        const fileId = new FileSignature();
        fileId.setFileName("test.ts");
        fileId.setProjectName(projectScene.getProjectName());
        const file = projectScene.getFile(fileId);
        assert.equal(file?.getExportInfosMap().size,2);
        assert.equal(file?.getImportInfos().length,17);
    })
})
