
/*
 * Copyright (c) 2025 Huawei Device Co., Ltd.
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
import { SceneConfig, Scene, CallGraph, CallGraphBuilder, Pag, PointerAnalysis, PointerAnalysisConfig } from '../../../src';
import { Sdk } from '../../../src/Config';

let sdk: Sdk = {
    name: 'ohos',
    path: './builtIn/typescript',
    moduleName: ''
};

function test(): PointerAnalysis {
    let config: SceneConfig = new SceneConfig();
    config.buildFromProjectDir('./tests/resources/pta/Foreach');
    config.getSdksObj().push(sdk);

    let scene = new Scene();
    scene.buildSceneFromProjectDir(config);
    scene.inferTypes();

    let cg = new CallGraph(scene);
    let cgBuilder = new CallGraphBuilder(cg, scene);
    cgBuilder.buildDirectCallGraphForScene();

    let pag = new Pag();
    let debugfunc = cg.getEntries().filter(funcID => cg.getArkMethodByFuncID(funcID)?.getName() === 'main');

    let ptaConfig = PointerAnalysisConfig.create(2, './out', true, true, false);
    let pta = new PointerAnalysis(pag, cg, scene, ptaConfig);
    pta.setEntries(debugfunc);
    pta.start();
    return pta;
}

describe('ForeachTest', () => {
    it('case1', () => {
        let pta = test();

        let outMethod = pta.getScene().getClasses().filter(arkClass => arkClass.getName() === 'Test')
            .flatMap(arkClass => arkClass.getMethodWithName('test'))!;
        let inMethod = pta.getScene().getClasses().filter(arkClass => arkClass.getName() === 'Test')
            .flatMap(arkClass => arkClass.getMethodWithName('%AM0$processCustomSpans'))!;

        let spanOutValue = outMethod[0]?.getBody()?.getLocals().get('span')!;
        let spanInValue = inMethod[0]?.getBody()?.getLocals().get('spanInner')!;

        let relatedNodes = pta.getRelatedNodes(spanOutValue);

        assert(
            Array.from(relatedNodes).find(node => node === spanInValue)
        );
    });
});