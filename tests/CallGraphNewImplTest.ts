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

import { PrinterBuilder } from '../src/save/PrinterBuilder';
import { SceneConfig } from "../src/Config";
import { Scene } from "../src/Scene";
import { MethodSignature } from "../src/core/model/ArkSignature";
import Logger, { LOG_LEVEL } from "../src/utils/logger";
import { CallGraph } from '../src/core/graph/CallGraph';
import { CallGraphBuilder } from '../src/core/graph/builder/CallGraphBuilder'
import { Pag } from '../src/core/graph/Pag'
import { PagBuilder } from '../src/core/graph/builder/PagBuilder'
import { PointerAnalysis } from '../src/core/graph/callgraph/PointerAnalysis'
 
const logger = Logger.getLogger();

//let config: SceneConfig = new SceneConfig("./tests/AppTestConfig.json");
let config: SceneConfig = new SceneConfig()
config.buildFromProjectDir('./tests/resources/callgraph/loadtest2');
//config.buildFromProjectDir('./tests/resources/callgraph/simpleCall');
//config.buildFromProjectDir('./tests/resources/callgraph/swap');
Logger.setLogLevel(LOG_LEVEL.DEBUG)
function runScene(config: SceneConfig) {
    let projectScene: Scene = new Scene();
    projectScene.buildSceneFromProjectDir(config);
    projectScene.buildScene4HarmonyProject()
    projectScene.inferTypes();
    let entryPoints: MethodSignature[] = []
    for (let method of projectScene.getMethods()) {
        entryPoints.push(method.getSignature())
    }



    for (let arkFile of projectScene.getFiles()) {
        let locals = 0, methods = 0
        for (let arkClass of arkFile.getClasses()) {
            // if (arkClass.getName() === "_DEFAULT_ARK_CLASS") {
            for (let arkMethod of arkClass.getMethods()) {
                let stmts = arkMethod.getCfg()!.getStmts();
                logger.info(arkMethod.getSignature().toString())
                for (let s of stmts) {
                    logger.info("  " + s.toString());
                }
                logger.info("\n")
            }
        }
    }

    let cg = new CallGraph(projectScene);
    let cgBuilder = new CallGraphBuilder(cg, projectScene);
    cgBuilder.buildDirectCallGraph();

    let pag = new Pag();
    // let pagBuilder = new PagBuilder(pag, cg, projectScene);
    // pagBuilder.build();
    // pag.dump('pag.dot');

    let entry = cg.getEntries().filter(funcID => cg.getArkMethodByFuncID(funcID)?.getName() === 'main');
    let pta = new PointerAnalysis(pag, cg, projectScene)
    pta.setEntry(entry[0]);
    pta.start();
    console.log("fin")
}


runScene(config);
