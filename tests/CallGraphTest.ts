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

import { SceneConfig } from '../src/Config';
import { Scene } from '../src/Scene';
import { MethodSignature } from '../src/core/model/ArkSignature';
import { printCallGraphDetails } from '../src/utils/callGraphUtils';
import Logger, { LOG_LEVEL, LOG_MODULE_TYPE } from '../src/utils/logger';

let config: SceneConfig = new SceneConfig()
config.buildFromProjectDir('tests/resources/callgraph/benchMarks/test')
Logger.setLogLevel(LOG_LEVEL.INFO)
function runScene(config: SceneConfig) {
    let projectScene: Scene = new Scene();
    projectScene.buildSceneFromProjectDir(config)
    let entryPoints: MethodSignature[] = []
    for (let arkFile of projectScene.getFiles()) {
        if (arkFile.getName() === "main.ts") {
            for (let arkClass of arkFile.getClasses()) {
                if (arkClass.getName() === "_DEFAULT_ARK_CLASS") {
                    for (let arkMethod of arkClass.getMethods()) {
                        if (arkMethod.getName() === "_DEFAULT_ARK_METHOD") {
                            entryPoints.push(arkMethod.getSignature())
                        }
                    }
                }
            }
        }
    }
    
    projectScene.inferTypes()
    let callGraph = projectScene.makeCallGraphCHA(entryPoints)
    let methods = callGraph.getMethods()
    let calls = callGraph.getCalls()
    printCallGraphDetails(methods, calls, config.getTargetProjectDirectory())
}
runScene(config);