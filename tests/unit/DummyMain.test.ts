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

import { DummyMainCreater, Scene, SceneConfig } from '../../src/index';
import { describe, expect, it } from 'vitest';

describe('DummyMainTest', () => {
    let config: SceneConfig = new SceneConfig();
    config.buildFromProjectDir('tests/resources/dummyMain');
    const scene = new Scene();
    scene.buildBasicInfo(config);
    scene.buildSceneFromProjectDir(config);
    const creater = new DummyMainCreater(scene);
    creater.createDummyMain();
    let dummyMain = creater.getDummyMain();

    it('case1: Ability LifeCycle', () => {
        expect(creater.getMethodsFromAllAbilities().length).eq(6);
        const cfg = dummyMain.getCfg()!;
        expect(cfg.getBlocks().size).eq(21);
        expect(cfg.getStartingBlock()).not.eq(undefined);
    });
});