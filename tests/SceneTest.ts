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

import { SceneConfig } from '../src/Config';
import { Scene } from '../src/Scene';
import Logger, { LOG_LEVEL } from '../src/utils/logger';

const logPath = 'out/ArkAnalyzer.log';
const logger = Logger.getLogger();
Logger.configure(logPath, LOG_LEVEL.DEBUG);

class SceneTest {
    public async testETsWholePipline() {
        logger.error('testETsWholePipline start');
        const buildConfigStartTime = new Date().getTime();
        logger.error(`memoryUsage before buildConfig in bytes:`);
        logger.error(process.memoryUsage());

        // build config
        // tests/resources/scene/mainModule
        const configPath = 'tests\\resources\\scene\\SceneTestConfig.json';
        let sceneConfig: SceneConfig = new SceneConfig();
        await sceneConfig.buildFromJson(configPath);

        logger.error(`memoryUsage after buildConfig in bytes:`);
        logger.error(process.memoryUsage());
        const buildConfigEndTime = new Date().getTime();
        logger.error('projectFiles cnt:', sceneConfig.getProjectFiles().length);
        logger.error(`buildConfig took ${(buildConfigEndTime - buildConfigStartTime) / 1000} s`);

        // build scene
        let scene = new Scene();
        scene.buildBasicInfo(sceneConfig);
        scene.buildSceneFromProjectDir(sceneConfig);
        logger.error(`memoryUsage after buildScene in bytes:`);
        logger.error(process.memoryUsage());
        const buildSceneEndTime = new Date().getTime();
        logger.error(`buildScene took ${(buildSceneEndTime - buildConfigEndTime) / 1000} s`);

        // infer types
        scene.inferTypes();
        logger.error(`memoryUsage after inferTypes in bytes:`);
        logger.error(process.memoryUsage());
        const inferTypesEndTime = new Date().getTime();
        logger.error(`inferTypes took ${(inferTypesEndTime - buildSceneEndTime) / 1000} s`);

        // get viewTree
        for (const arkFile of scene.getFiles()) {
            for (const arkClass of arkFile.getClasses()) {
                arkClass.getViewTree();
            }
        }
        logger.error(`memoryUsage after get viewTree in bytes:`);
        logger.error(process.memoryUsage());
        const getViewTreeEndTime = new Date().getTime();
        logger.error(`get viewTree took ${(getViewTreeEndTime - inferTypesEndTime) / 1000} s`);

        logger.error('testETsWholePipline end\n');
    }

    public testSimpleProject() {
        logger.error('testSimpleProject start');

        // build config
        // 'tests/resources/scene/mainModule';
        const projectDir = 'tests/resources/scene/mainModuleEts';
        const sceneConfig: SceneConfig = new SceneConfig();
        sceneConfig.buildFromProjectDir(projectDir);

        // build scene
        const scene = new Scene();
        scene.buildSceneFromProjectDir(sceneConfig);
        scene.inferTypes();

        // get viewTree
        for (const arkFile of scene.getFiles()) {
            for (const arkClass of arkFile.getClasses()) {
                arkClass.getViewTree();
                logger.error(`getViewTree of ${arkClass.getName()} done`);
            }
        }

        logger.error('testSimpleProject end\n');
    }

    public testEtsProject() {
        logger.error('testEtsProject start');

        // build config
        const configPath = 'tests\\resources\\scene\\SceneTestConfig.json';
        const sceneConfig: SceneConfig = new SceneConfig();
        sceneConfig.buildFromJson(configPath);

        // build scene
        const scene = new Scene();
        scene.buildBasicInfo(sceneConfig);
        scene.buildScene4HarmonyProject();
        scene.collectProjectImportInfos();

        logger.error('testEtsProject end\n');
    }
}

let sceneTest = new SceneTest();
sceneTest.testETsWholePipline();
sceneTest.testSimpleProject();
sceneTest.testEtsProject();