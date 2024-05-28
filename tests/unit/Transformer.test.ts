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

import { SceneConfig } from "../../src/Config";
import { StaticSingleAssignmentFormer } from "../../src/transformer/StaticSingleAssignmentFormer"
import { assert, describe, it } from "vitest";
import { Scene } from "../../src/Scene";
import path from "path";

describe("StaticSingleAssignmentFormer Test", () => {
    let config: SceneConfig = new SceneConfig();
    config.buildFromProjectDir(path.join(__dirname, "../resources/ssa"));
    let scene = new Scene(config);
    let arkClass = scene.getClasses().find(cls => cls.getName() == '_DEFAULT_ARK_CLASS');
    it('normal case', () => {
        if (arkClass == null) {
            assert.isNotNull(arkClass);
            return;
        }
        let ssaf = new StaticSingleAssignmentFormer();
        for (const arkMethod of arkClass.getMethods()) {
            if (arkMethod.getName() === '_DEFAULT_ARK_METHOD') {
                continue;
            }
            let locals = arkMethod.getBody().getLocals().size;
            ssaf.transformBody(arkMethod.getBody());
            assert.isTrue(arkMethod.getBody().getLocals().size > locals)
        }

    })

})