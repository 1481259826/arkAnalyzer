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

import { describe, expect, it } from 'vitest';
import { Scene } from '../../../../src/Scene';
import { SceneConfig } from '../../../../src/Config';
import path from 'path';
import { Builtin } from '../../../../src/core/common/Builtin';

let config: SceneConfig = new SceneConfig();
config.buildFromProjectDir(path.join(__dirname, "../../../resources/model/method"))
let projectScene: Scene = new Scene();
projectScene.buildSceneFromProjectDir(config);
projectScene.collectProjectImportInfos();
projectScene.inferTypes();

let arkFile = projectScene.getFiles().find((file) => file.getName() == 'method.ts');
let arkDefaultClass = arkFile?.getDefaultClass();

describe("ArkMethod Test", () => {
    it('test dotDotDot parameter', async () => {
        let method = arkDefaultClass?.getMethodWithName('testDotDotDotToken');
        let parameter = method?.getParameters().find((param) => param.getName() == 'arr2');
        if (parameter) {
            const hasDotDotDotToken = parameter.hasDotDotDotToken();
            expect(hasDotDotDotToken).eq(true);
        }
    })

    it('test object parameter', async () => {
        let method = arkDefaultClass?.getMethodWithName('testObjectTypeParam');
        let parameter = method?.getParameters().find((param) => param.getName() == 'obj');
        if (parameter) {
            const paramTypeName = parameter.getType().toString();
            expect(paramTypeName).eq(Builtin.OBJECT_CLASS_SIGNATURE.toString());
        }
    })
})