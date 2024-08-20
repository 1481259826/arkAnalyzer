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

import { SceneConfig } from '../../src/Config';
import { TypeInference } from '../../src/core/common/TypeInference';
import { assert, describe, expect, it, vi } from 'vitest';
import { Scene } from '../../src/Scene';
import path from 'path';

describe("StaticSingleAssignmentFormer Test", () => {
    let config: SceneConfig = new SceneConfig();
    config.buildFromProjectDir(path.join(__dirname, "../resources/save"));
    let scene = new Scene();
    scene.buildSceneFromProjectDir(config);
    let methods = scene.getMethods();

    it('inferTypeInMethod case', () => {
        let method = methods[0];
        if (method == null) {
            assert.isNotNull(methods);
            return;
        }

        const spy = vi.spyOn(method, "getBody");
        TypeInference.inferTypeInMethod(method);
        expect(spy).toHaveBeenCalledTimes(5);
    })
    it('inferSimpleTypeInMethod case', () => {
        if (methods == null) {
            assert.isNotNull(methods);
            return;
        }

        for (const method of methods) {
            const spy = vi.spyOn(method, "getBody");
            TypeInference.inferSimpleTypeInMethod(method);
            expect(spy).toHaveBeenCalledTimes(1);
        }
    })
})