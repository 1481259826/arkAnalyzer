/*
 * Copyright (c) 2024 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the "License"); * you may not use this file except in compliance with the License.
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
import Logger, { LOG_LEVEL } from '../src/utils/logger';
import { ReachingDefProblem } from '../src/core/dataflow/ReachingDef';
import { MFPDataFlowSolver } from '../src/core/dataflow/GenericDataFlow';

Logger.configure('./out/ArkAnalyzer.log', LOG_LEVEL.TRACE);
let config: SceneConfig = new SceneConfig();

function runDir(): Scene {
    config.buildFromProjectDir('./tests/resources/reachingDef');
    let projectScene: Scene = new Scene();
    projectScene.buildSceneFromProjectDir(config);
    projectScene.inferTypes();

    return projectScene;
}

let scene = runDir();
scene.getMethods().forEach((m) => {
    let methodName = m.getName();
    if (methodName === '%dflt') return;
    let problem = new ReachingDefProblem(m);
    let solver = new MFPDataFlowSolver();
    let s = solver.calculateMopSolutionForwards(problem);

    console.log(methodName);
    console.log(problem);
    console.log(s);
    s.out.forEach((defs, nodeId) => {
        let str = Array.from(defs).join(', ');
        console.log('//' + nodeId + ': ' + str);
    });
    debugger;
});
