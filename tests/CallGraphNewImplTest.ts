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
import { SceneConfig } from "../src/Config";
import { Scene } from "../src/Scene";
import { MethodSignature } from "../src/core/model/ArkSignature";
import { CallGraph } from '../src/core/graph/CallGraph';
import { CallGraphBuilder } from '../src/core/graph/builder/CallGraphBuilder'
import { Pag } from '../src/core/graph/Pag'
import { PointerAnalysis } from '../src/core/graph/callgraph/PointerAnalysis'
import { PointerAnalysisConfig } from './../src/core/pta/PointerAnalysisConfig';
 
// const logger = Logger.getLogger();

function runScene(config: SceneConfig, output: string) {
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
    let ptaConfig = new PointerAnalysisConfig(2, output, true)
    let pta = new PointerAnalysis(pag, cg, projectScene, ptaConfig)
    pta.setEntries([entry[0]]);
    pta.start();
}

let config: SceneConfig = new SceneConfig()
// config.buildFromProjectDir('./tests/resources/callgraph/loadtest1');
// config.buildFromProjectDir('./tests/resources/callgraph/test2');
config.buildFromProjectDir('./tests/resources/pta/CallField');
// config.buildFromProjectDir('./tests/resources/callgraph/temp');
// config.buildFromProjectDir('./tests/resources/callgraph/calltest');
// config.buildFromProjectDir('./tests/resources/callgraph/globalVarTest1');
//config.buildFromProjectDir('./tests/resources/callgraph/swap');
// Logger.setLogLevel(LOG_LEVEL.DEBUG)
runScene(config, "./out/CallField");

const rootDir = './tests/resources/pta';
const outputDir = './out';

// const subdirs = fs.readdirSync(rootDir).filter(subdir => {
//     return fs.statSync(path.join(rootDir, subdir)).isDirectory();
// });

// for (const subdir of subdirs) {
//     try {
//         const projectPath = path.join(rootDir, subdir);
//         let config: SceneConfig = new SceneConfig();
//         config.buildFromProjectDir(projectPath);
//         runScene(config, `./out/${subdir}`);
//     } catch (error) {
//         console.log(error);
//     }
//     setTimeout(function() {
//         console.log('wait')
//     }, 10000)
//     const dotFile = `out/${subdir}/ptaEnd_pag.dot`;
//     const pngFile = `out/${subdir}/ptaEnd_pag.png`;
//     try {
//         execSync(`dot -Tpng ${dotFile} -o ${pngFile}`);
//         console.log(`Generated PNG: ${pngFile}`);
//     } catch (error) {
//         console.error(`Error generating PNG for ${subdir}:`, error);
//     }
// }
