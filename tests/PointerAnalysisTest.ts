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
import { CallGraph } from '../src/callgraph/model/CallGraph';
import { CallGraphBuilder } from '../src/callgraph/model/builder/CallGraphBuilder';
import { Pag } from '../src/callgraph/pointerAnalysis/Pag'
import { PointerAnalysis } from '../src/callgraph/pointerAnalysis/PointerAnalysis'
import { PointerAnalysisConfig } from '../src/callgraph/pointerAnalysis/PointerAnalysisConfig';
import Logger, {LOG_LEVEL} from "../src/utils/logger"
 
Logger.configure("./out/ArkAnalyzer.log", LOG_LEVEL.TRACE)

// let etsSdk: Sdk = {
//     name: "ohos",
//     path: "/Users/yangyizhuo/Library/OpenHarmony/Sdk/11/ets",
//     moduleName: ""
// }

let config: SceneConfig = new SceneConfig()
// config.buildConfig("uiTest", "/Users/yangyizhuo/Desktop/code/arkanalyzer/tests/resources/pta/uiTest",
//     [etsSdk], [
//         "./tests/resources/pta/uiTest/ui_test.ts"
//     ])
// config.buildFromJson('./tests/resources/pta/PointerAnalysisTestConfig.json');
config.buildFromProjectDir('./tests/resources/pta/Array');
// config.buildFromProjectDir('./tests/resources/callgraph/test2');
// config.buildFromProjectDir('/Users/yangyizhuo/Desktop/code/arkanalyzer/src');
// config.buildFromProjectDir('./tests/resources/callgraph/temp');
// config.buildFromProjectDir('./tests/resources/callgraph/calltest');
// config.buildFromProjectDir('./tests/resources/callgraph/globalVarTest1');
//config.buildFromProjectDir('./tests/resources/callgraph/swap');
// Logger.setLogLevel(LOG_LEVEL.DEBUG)

function runScene(config: SceneConfig, output: string) {
    let projectScene: Scene = new Scene();
    projectScene.buildSceneFromProjectDir(config);
    // projectScene.buildBasicInfo(config);
    // projectScene.buildScene4HarmonyProject()
    // projectScene.collectProjectImportInfos();
    projectScene.inferTypes();

    let methods = 
        projectScene.getFiles()
            .filter(arkFile => arkFile.getName() === "array.ts")
            .flatMap(arkFile => arkFile.getNamespaces())
            .filter(arkNamespace => arkNamespace.getName() === "ArrayTest")
            .flatMap(arkNamespace => arkNamespace.getClasses())
            .filter(arkClass => arkClass.getName() === "_DEFAULT_ARK_CLASS")
            .flatMap(arkClass => arkClass.getMethods())
            .filter(arkMethod => arkMethod.getName() === "main")
            .map(arkMethod => arkMethod.getSignature())
    let cg = new CallGraph(projectScene);
    let cgBuilder = new CallGraphBuilder(cg, projectScene)
    cgBuilder.buildDirectCallGraph(projectScene.getMethods());
    let entry = cg.getCallGraphNodeByMethod(methods[0]).getID()

    let pag = new Pag();

    // let entry = cg.getEntries().filter(funcID => cg.getArkMethodByFuncID(funcID)?.getName() === 'main');
    let ptaConfig = new PointerAnalysisConfig(2, output, true, true)
    let pta = new PointerAnalysis(pag, cg, projectScene, ptaConfig)
    pta.setEntries([entry]);
    pta.start();
    // PointerAnalysis.pointerAnalysisForWholeProject(projectScene, ptaConfig)
    cg.dump(output+"/subcg.dot", entry)
    console.log("fin")
}
runScene(config, "./out/applications_camera");