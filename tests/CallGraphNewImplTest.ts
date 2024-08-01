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

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
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
 
// const logger = Logger.getLogger();

// let config: SceneConfig = new SceneConfig("./tests/AppTestConfig.json");
let config: SceneConfig = new SceneConfig()
// config.buildFromProjectDir('./tests/resources/callgraph/loadtest1');
// config.buildFromProjectDir('./tests/resources/callgraph/test2');
// config.buildFromProjectDir('./tests/resources/pta/StaticCall');
// config.buildFromProjectDir('./tests/resources/callgraph/temp');
config.buildFromProjectDir('./tests/resources/callgraph/calltest');
// config.buildFromProjectDir('./tests/resources/callgraph/globalVarTest1');
//config.buildFromProjectDir('./tests/resources/callgraph/swap');
// Logger.setLogLevel(LOG_LEVEL.DEBUG)
runScene(config);
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
                let stmts = arkMethod.getCfg().getStmts();
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

    let entry = cg.getEntries().filter(funcID => cg.getArkMethodByFuncID(funcID)?.getName() === 'main');
    let pta = new PointerAnalysis(pag, cg, projectScene, true)
    pta.setEntries([entry[0]]);
    pta.start();
}

const rootDir = './tests/resources/pta';
const outputDir = './out';

const subdirs = fs.readdirSync(rootDir).filter(subdir => {
    return fs.statSync(path.join(rootDir, subdir)).isDirectory();
});

// for (const subdir of subdirs) {
//     const projectPath = path.join(rootDir, subdir);
//     const config: SceneConfig = new SceneConfig();
//     config.buildFromProjectDir(projectPath);
//     runScene(config);
//     const dotFile = 'out/ptaEnd_pag.dot';
//     const pngFile = `out/${subdir}.png`;
//     execSync(`dot -Tpng ${dotFile} -o ${pngFile}`);
//     console.log(`Generated PNG: ${pngFile}`);
// }
