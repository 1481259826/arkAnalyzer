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

import Logger, { LOG_LEVEL, LOG_MODULE_TYPE } from '../src/utils/logger';
import { SceneConfig } from '../src/Config';
import { Scene } from '../src/Scene';
import { ArkBody } from '../src/core/model/ArkBody';
import { ArkInstanceFieldRef, PrinterBuilder } from '../src';
import { ModelUtils } from '../src/core/common/ModelUtils';
import { INSTANCE_INIT_METHOD_NAME } from '../src/core/common/Const';

const logPath = 'out/ArkAnalyzer.log';
const logger = Logger.getLogger(LOG_MODULE_TYPE.TOOL, 'ArkIRTransformerTest');
Logger.configure(logPath, LOG_LEVEL.DEBUG, LOG_LEVEL.DEBUG);

class ArkIRTransformerTest {
    // public async testSimpleStmt() {
    //     logger.info('testSimpleStmt start');
    //     const tsFilePath = 'tests/resources/arkIRTransformer/mainModule/main.ts';
    //     const tsSourceCode = fs.readFileSync(tsFilePath).toString();
    //     const sourceFile: ts.SourceFile = ts.createSourceFile(tsFilePath, tsSourceCode, ts.ScriptTarget.Latest, true, undefined, ETS_COMPILER_OPTIONS);
    //
    //     const dumpArkFile = new ArkFile();
    //     dumpArkFile.setName('dumpArkFile');
    //     dumpArkFile.setProjectName('dumpProject');
    //     dumpArkFile.genFileSignature();
    //     const dumpArkClass = new ArkClass();
    //     dumpArkClass.setName('dumpArkClass');
    //     dumpArkFile.addArkClass(dumpArkClass);
    //     dumpArkClass.setDeclaringArkFile(dumpArkFile);
    //     dumpArkClass.genSignature();
    //     const dumpArkMethod = new ArkMethod();
    //     dumpArkMethod.setName('dumpArkMethod');
    //     dumpArkClass.addMethod(dumpArkMethod);
    //     dumpArkMethod.setDeclaringArkClass(dumpArkClass);
    //
    //     const arkIRTransformer = new ArkIRTransformer(sourceFile, dumpArkMethod);
    //     for (const statement of sourceFile.statements) {
    //         const stmts = arkIRTransformer.tsNodeToStmts(statement);
    //         logger.info(`ts node text: ${statement.getText(sourceFile)}`);
    //         logger.info(`stmts:`);
    //         for (const stmt of stmts) {
    //             logger.info(`-- ${stmt.toString()}`);
    //         }
    //     }
    //     logger.info('locals:');
    //     arkIRTransformer.getLocals().forEach(local => {
    //         logger.error('name: ' + local.toString() + ', type: ' + local.getType());
    //     });
    //
    //     logger.info('testSimpleStmt end\n');
    // }

    public testStmtsOfSimpleProject() {
        logger.error('testStmtsOfSimpleProject start');

        const projectDir = 'tests/resources/arkIRTransformer/mainModule';
        const sceneConfig: SceneConfig = new SceneConfig();
        sceneConfig.buildFromProjectDir(projectDir);

        const scene = new Scene();
        scene.buildSceneFromProjectDir(sceneConfig);
        logger.error('\nbafore inferTypes');
        // this.printScene(scene);
        scene.inferTypes();
        logger.error('\nafter inferTypes');
        this.printScene(scene);

        logger.error('testStmtsOfSimpleProject end\n');
    }

    public testStmtsOfEtsProject() {
        logger.error('testStmtsOfEtsProject start');

        // build config
        const configPath = 'tests/resources/arkIRTransformer/ArkIRTransformerTestConfig.json';
        const sceneConfig: SceneConfig = new SceneConfig();
        sceneConfig.buildFromJson(configPath);

        // build scene
        const scene = new Scene();
        scene.buildBasicInfo(sceneConfig);
        scene.buildScene4HarmonyProject();
        scene.collectProjectImportInfos();
        this.printScene(scene);
        scene.inferTypes();
        logger.error('\nafter inferTypes');
        this.printScene(scene);

        logger.error('testStmtsOfEtsProject end\n');
    }

    private printStmts(body: ArkBody): void {
        logger.error('--- threeAddresStmts ---');
        const cfg = body.getCfg();
        for (const threeAddresStmt of cfg.getStmts()) {
            logger.error(`text: ${threeAddresStmt.toString()}`);
            // logger.error(`-original position: ${threeAddresStmt.getOriginPositionInfo().getLineNo()}, ${threeAddresStmt.getOriginPositionInfo().getColNo()}`);
            // if (threeAddresStmt.getOriginPositionInfo().getLineNo() === -1) {
            //     logger.error(`text: ${threeAddresStmt.toString()}`);
            // }
        }

        // logger.error('--- originalStmts ---');
        // const originalCfg = body.getOriginalCfg();
        // for (const originalStmt of originalCfg.getStmts()) {
        //     logger.error(`text: ${originalStmt.toString()}`);
        //     logger.error(`-original position: ${originalStmt.getOriginPositionInfo().getLineNo()}, ${originalStmt.getOriginPositionInfo().getColNo()}`);
        // }
    }

    private printScene(scene: Scene): void {
        for (const arkFile of scene.getFiles()) {
            logger.error('+++++++++++++ arkFile:', arkFile.getFilePath(), ' +++++++++++++');
            for (const arkClass of ModelUtils.getAllClassesInFile(arkFile)) {
                logger.error('========= arkClass:', arkClass.getSignature().toString(), ' =======');
                for (const arkMethod of arkClass.getMethods(true)) {
                    logger.error('***** arkMethod: ', arkMethod.getName());
                    const body = arkMethod.getBody();
                    if (body) {
                        this.printStmts(body);
                        logger.error('-- locals:');
                        arkMethod.getBody()!.getLocals().forEach(local => {
                            logger.error('name: ' + local.toString() + ', type: ' + local.getType());
                        });
                    }
                }
            }
        }
    }

    public printCfg() {
        const projectDir = 'tests/resources/arkIRTransformer/mainModule';
        const sceneConfig: SceneConfig = new SceneConfig();
        sceneConfig.buildFromProjectDir(projectDir);
        const scene = new Scene();
        scene.buildSceneFromProjectDir(sceneConfig);

        const printerBuilder = new PrinterBuilder('out');
        for (const arkFile of scene.getFiles()) {
            printerBuilder.dumpToDot(arkFile);
        }
    }

    public simpleTest() {
        logger.error('simpleTest start');
        const projectDir = 'tests/resources/arkIRTransformer/mainModule';
        const sceneConfig: SceneConfig = new SceneConfig();
        sceneConfig.buildFromProjectDir(projectDir);
        const scene = new Scene();
        scene.buildSceneFromProjectDir(sceneConfig);

        const cfg = scene.getFiles().find((file) => file.getName().endsWith(`main.ts`))
            ?.getClassWithName('Main')
            ?.getMethodWithName(INSTANCE_INIT_METHOD_NAME)?.getBody()?.getCfg();
        if (cfg) {
            const thisLocal1 = cfg.getStmts()[0].getDef();
            const thisLocal2 = (cfg.getStmts()[1].getDef() as ArkInstanceFieldRef).getBase();
            if (thisLocal1) {
                logger.log(`thisLocal1 equal to thisLocal2: ${thisLocal1 === thisLocal2}`);
            }
        } else {
            logger.log(`cfg is undefined`);
        }

        logger.error('simpleTest end');
    }
}

const arkIRTransformerTest = new ArkIRTransformerTest();
// arkIRTransformerTest.testSimpleStmt();
arkIRTransformerTest.testStmtsOfSimpleProject();
// arkIRTransformerTest.testStmtsOfEtsProject();
// arkIRTransformerTest.printCfg();
// arkIRTransformerTest.simpleTest();

