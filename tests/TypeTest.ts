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
import { ArkBody } from "../src/core/model/ArkBody";
import { StaticSingleAssignmentFormer } from "../src/transformer/StaticSingleAssignmentFormer";

export class TypeInferenceTest {
    public buildScene(): Scene {
        let config: SceneConfig = new SceneConfig();
        // config.buildFromJson(config_path);
        config.buildFromProjectDir("tests/resources/type")
        const scene = new Scene();
        scene.buildBasicInfo(config);
        // scene.buildScene4HarmonyProject();
        scene.buildSceneFromProjectDir(config);
        scene.collectProjectImportInfos();
        return scene
    }

    public testLocalTypes() {
        let scene = this.buildScene();
        scene.inferTypes();
        // scene.inferSimpleTypes();
        let staticSingleAssignmentFormer = new StaticSingleAssignmentFormer();
        for (const arkFile of scene.getFiles()) {
            console.log('=============== arkFile:', arkFile.getName(), ' ================');
            for (const arkClass of arkFile.getClasses()) {
                for (const arkMethod of arkClass.getMethods()) {
                    console.log('*** arkMethod: ', arkMethod.getName());

                    const body = arkMethod.getBody();
                    console.log("*****before ssa")
                    this.printStmts(body);
                    console.log("*****after ssa")
                    staticSingleAssignmentFormer.transformBody(body);
                    this.printStmts(body);

                    
                    // console.log('-- locals:');
                    // for (const local of arkMethod.getBody().getLocals()) {
                    //     console.log('name: ' + local.toString() + ', type: ' + local.getType());
                    // }
                }
            }
        }
    }

    public printStmts(body: ArkBody): void {
        console.log('-- threeAddresStmts:');
        let cfg = body.getCfg();
        for (const threeAddresStmt of cfg.getStmts()) {
            console.log(threeAddresStmt.toString());
        }
    }

}

let typeInferenceTest = new TypeInferenceTest();
typeInferenceTest.testLocalTypes();
