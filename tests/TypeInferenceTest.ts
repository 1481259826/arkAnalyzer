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
import Logger, { LOG_LEVEL } from "../src/utils/logger";
import {DummyMainCreater} from "../src/core/common/DummyMainCreater"

const logger = Logger.getLogger();
Logger.configure('out/TypeInferenceTest.log', LOG_LEVEL.WARN);

export class TypeInferenceTest {
    public buildScene(): Scene {
        // tests/resources/typeInference/multi_module/main_module
        // out/ets2ts/applications_photos/common/src/main/ets/default/model/browser/photo
        const config_path = "tests\\resources\\typeInference\\ProjectTypeInferenceTestConfig.json";
        // const config_path = "tests\\resources\\type\\TypeTestConfig.json";
        // const config_path = "tests\\resources\\typeInference\\ohapps.json";
        let config: SceneConfig = new SceneConfig();
        config.buildFromJson(config_path);
        // config.buildFromProjectDir("codeLab\\ArkTS2TSRes")
        const scene = new Scene();
        scene.buildBasicInfo(config);
        scene.buildScene4HarmonyProject();
        // scene.buildSceneFromProjectDir(config);
        scene.collectProjectImportInfos();
        const creater = new DummyMainCreater(scene);
        creater.createDummyMain();
        const dummyMain = creater.getDummyMain();
        return scene;
    }

    public testLocalTypes() {
        let scene = this.buildScene();
        logger.error(`before inferTypes`);
        this.printLocalTypes(scene);
        scene.inferTypes();
        logger.error(``);
        logger.error(`after inferTypes`);
        this.printLocalTypes(scene);
    }


    public printLocalTypes(scene: Scene) {
        for (const arkFile of scene.getFiles()) {
            logger.error('=============== arkFile:', arkFile.getName(), ' ================');
            for (const arkClass of arkFile.getClasses()) {
                logger.error('========= arkClass:', arkClass.getName(), ' =======');
                for (const arkMethod of arkClass.getMethods()) {
                    logger.error('***** arkMethod: ', arkMethod.getName());
                }
            }
        }
    }

    public testFunctionReturnType() {
        let scene = this.buildScene();

        for (const arkFile of scene.getFiles()) {
            logger.error('=============== arkFile:', arkFile.getName(), ' ================');
            for (const arkClass of arkFile.getClasses()) {
                for (const arkMethod of arkClass.getMethods()) {
                    if (arkMethod.getName() == '_DEFAULT_ARK_METHOD') {
                        continue;
                    }

                    logger.error(arkMethod.getSubSignature().toString());
                }
            }
        }
    }

    private printStmts(body: ArkBody): void {
        logger.error('-- threeAddresStmts:');
        let cfg = body.getCfg();
        for (const threeAddresStmt of cfg.getStmts()) {
            logger.error(threeAddresStmt.toString());
        }
    }

    private printScene(scene: Scene): void {
        for (const arkFile of scene.getFiles()) {
            logger.error('+++++++++++++ arkFile:', arkFile.getFilePath(), ' +++++++++++++');
            for (const arkClass of arkFile.getClasses()) {
                logger.error('========= arkClass:', arkClass.getName(), ' =======');
                for (const arkMethod of arkClass.getMethods()) {
                    logger.error('***** arkMethod: ', arkMethod.getName());
                    const body = arkMethod.getBody();
                    // this.printStmts(body);

                }
            }
        }
    }

    public testTypeInference(): void {
        let scene = this.buildScene();
        scene.inferTypes();
        // this.printScene(scene);
    }
}

logger.error('type inference test start');
let typeInferenceTest = new TypeInferenceTest();
// typeInferenceTest.buildScene();
// typeInferenceTest.testLocalTypes();
typeInferenceTest.testTypeInference();
// typeInferenceTest.testFunctionReturnType();
logger.error('type inference test end\n');
