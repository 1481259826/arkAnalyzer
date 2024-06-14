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

import Logger, { LOG_LEVEL } from '../src/utils/logger';
import fs from 'fs';
import * as ts from 'ohos-typescript';
import { ArkIRTransformer } from '../src/core/common/ArkIRTransformer';
import { SceneConfig } from '../src/Config';
import { Scene } from '../src/Scene';
import { ArkBody } from '../src/core/model/ArkBody';

const logPath = 'out/ArkAnalyzer.log';
const logger = Logger.getLogger();
Logger.configure(logPath, LOG_LEVEL.DEBUG);

class ArkIRTransformerTest {
    public async testSimpleStmt() {
        logger.info('testSimpleStmt start');
        const tsFilePath = 'tests/resources/ArkIRTransformer/mainModule/main.ts';
        const tsSourceCode = fs.readFileSync(tsFilePath).toString();
        const sourceFile: ts.SourceFile = ts.createSourceFile(tsFilePath, tsSourceCode, ts.ScriptTarget.Latest);

        const arkIRTransformer = new ArkIRTransformer(sourceFile);
        for (const statement of sourceFile.statements) {
            const stmts = arkIRTransformer.tsNodeToStmts(statement);
            logger.info(`ts node text: ${statement.getText(sourceFile)}`);
            logger.info(`stmts:`);
            for (const stmt of stmts) {
                logger.info(`-- ${stmt.toString()}`);
            }
        }
        logger.info('testSimpleStmt end\n');
    }

    public testEtsStmt() {
        logger.error('testEtsStmt start');

        // const projectDir = 'tests/resources/ArkIRTransformer/mainModuleEts';
        const projectDir = 'tests/resources/ArkIRTransformer/mainModule';
        const sceneConfig: SceneConfig = new SceneConfig();
        sceneConfig.buildFromProjectDir(projectDir);

        const scene = new Scene();
        scene.buildSceneFromProjectDir(sceneConfig);
        this.printScene(scene);
        logger.error('testEtsStmt end\n');
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
                    this.printStmts(body);

                    logger.error('-- locals:');
                    for (const local of arkMethod.getBody().getLocals()) {
                        logger.error('name: ' + local.toString() + ', type: ' + local.getType());
                    }
                }
            }
        }
    }
}

const arkIRTransformerTest = new ArkIRTransformerTest();
// arkIRTransformerTest.testSimpleStmt();
arkIRTransformerTest.testEtsStmt();