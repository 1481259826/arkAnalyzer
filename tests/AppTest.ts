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

import { SceneConfig } from "../src/Config";
import { Scene } from "../src/Scene";

let config: SceneConfig = new SceneConfig();
//let config: SceneConfig = new SceneConfig("./tests/AppTestConfigUnix.json");


config.buildFromJson("./tests/AppTestConfig.json");
//config.buildFromJson("./tests/sample/AppTestConfig-sample.json");
//config.buildFromJson("./tests/AppTestConfigUnix.json");

//config.buildFromProjectDir("C:\\msys64\\home\\Yifei\\code\\applications_photos");

function runScene4Json(config: SceneConfig) {
    let projectScene: Scene = new Scene(config);
    //projectScene.buildModuleScene('entry', 'C:\\msys64\\home\\Yifei\\code\\SE4OpenHarmony\\Apps\\OHApps\\AppSampleD\\entry');
    projectScene.buildSceneFromProject();
    projectScene.collectProjectImportInfos();
    //projectScene.inferTypes();
    debugger;
}

runScene4Json(config);