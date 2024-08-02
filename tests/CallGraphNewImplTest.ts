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
import { MethodSignature } from "../src/core/model/ArkSignature";
import { CallGraph } from '../src/core/graph/CallGraph';
import { CallGraphBuilder } from '../src/core/graph/builder/CallGraphBuilder'
import { Pag } from '../src/core/graph/Pag'
import { PointerAnalysis } from '../src/core/graph/callgraph/PointerAnalysis'
import { PointerAnalysisConfig } from './../src/core/pta/PointerAnalysisConfig';
 
// const logger = Logger.getLogger();

let config: SceneConfig = new SceneConfig()
config.buildFromJson('./tests/resources/pta/PointerAnalysisTestConfig.json');
// config.buildFromProjectDir('./tests/resources/callgraph/loadtest1');
// config.buildFromProjectDir('./tests/resources/callgraph/test2');
// config.buildFromProjectDir('/Users/yangyizhuo/Desktop/test/testApp/applications_photos');
// config.buildFromProjectDir('./tests/resources/callgraph/temp');
// config.buildFromProjectDir('./tests/resources/callgraph/calltest');
// config.buildFromProjectDir('./tests/resources/callgraph/globalVarTest1');
//config.buildFromProjectDir('./tests/resources/callgraph/swap');
// Logger.setLogLevel(LOG_LEVEL.DEBUG)

function runScene(config: SceneConfig, output: string) {
    let projectScene: Scene = new Scene();
    // projectScene.buildSceneFromProjectDir(config);
    projectScene.buildBasicInfo(config);
    projectScene.buildScene4HarmonyProject()
    projectScene.collectProjectImportInfos();
    projectScene.inferTypes();
    let entryPoints: MethodSignature[] = []
    for (let method of projectScene.getMethods()) {
        entryPoints.push(method.getSignature())
    }

    // let cg = new CallGraph(projectScene);
    // let cgBuilder = new CallGraphBuilder(cg, projectScene);
    // cgBuilder.buildDirectCallGraph();

    // let pag = new Pag();

    // let entry = cg.getEntries().filter(funcID => cg.getArkMethodByFuncID(funcID)?.getName() === 'main');
    let ptaConfig = new PointerAnalysisConfig(2, output, true, true)
    // let pta = new PointerAnalysis(pag, cg, projectScene, ptaConfig)
    // pta.setEntries([entry[0]]);
    // pta.start();
    PointerAnalysis.pointerAnalysisForWholeProject(projectScene, ptaConfig)
    console.log("fin")
}
runScene(config, "./out/applications_photos");