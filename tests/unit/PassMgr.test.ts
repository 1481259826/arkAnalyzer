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

import { assert, describe, it } from 'vitest';
import path from 'path';
import { SceneConfig } from '../../src/Config';
import { Scene } from '../../src/Scene';
import { ScenePassMgr } from '../../src/pass/ScenePassMgr';
import ConsoleLogger, { LOG_MODULE_TYPE } from '../../src/utils/logger';
import { ArkAssignStmt, ArkClass, ArkFile, ArkMethod, Local, LOG_LEVEL, Stmt } from '../../src';
import { Dispatch, Dispatcher, StmtInit, ValueInit } from '../../src/pass/Dispatcher';
import Logger from '../../src/utils/logger';
import { ClassCtx, ClassPass, FallAction, FileCtx, FilePass, MethodCtx, MethodPass } from '../../src/pass/Pass';


ConsoleLogger.configure('', LOG_LEVEL.INFO, LOG_LEVEL.INFO, true);

const logger = Logger.getLogger(LOG_MODULE_TYPE.ARKANALYZER, 'Test');


class MethodValidator extends MethodPass {
    run(method: ArkMethod, ctx: MethodCtx): any {
        let counter = ctx.root().get(Counter)!;
        counter.method++;
        logger.info(`method ${method.getName()}`);
    }
}


class ClassValidator extends ClassPass {
    run(cls: ArkClass, ctx: ClassCtx) {
        let counter = ctx.upper.upper.get(Counter)!;
        counter.cls++;
        logger.info(`class ${cls.getName()}`);
    }
}


class FileValidator extends FilePass {
    run(file: ArkFile, ctx: FileCtx) {
        let counter = ctx.upper.get(Counter)!;
        counter.file++;
        logger.info(`file ${file.getName()}`);
    }
}

class Counter {
    name = 'counter';
    file: number = 0;
    cls: number = 0;
    method: number = 0;
    inst: number = 0;
}

class TestDispatcher extends Dispatcher {
    constructor(ctx: MethodCtx) {
        const stmts: StmtInit[] = [
            [ArkAssignStmt, (v: ArkAssignStmt, ctx: MethodCtx) => {
                logger.info(`asign ${v}`);
                let counter = ctx.root().get(Counter)!;
                counter.inst++;
            }],
            [Stmt, [(v: Stmt, ctx: MethodCtx) => {
                logger.info(`stmt ${v}`);
                let counter = ctx.root().get(Counter)!;
                counter.inst++;
            }]],
        ];
        const values: ValueInit[] = [
            [Local, (v: Local, ctx: MethodCtx) => {
                logger.info(`local ${v}`);
                let counter = ctx.root().get(Counter)!;
                counter.inst++;
                return FallAction.Break;
            }],
        ];
        super(ctx, new Dispatch(stmts, values));
    }
}

describe('Anonymous Test', () => {
    let config: SceneConfig = new SceneConfig();
    config.buildFromProjectDir(path.join(__dirname, '../resources/anonymous'));
    let projectScene: Scene = new Scene();
    projectScene.buildSceneFromProjectDir(config);
    it('iter inst', () => {
        let mgr = new ScenePassMgr({
            passes: {
                file: [FileValidator], klass: [ClassValidator], method: [MethodValidator],
            },
            selectors: {
                file: (scene: Scene) => {
                    return scene.getFiles().filter(file => file.getName().includes('anonymous'));
                },
            },
            dispatcher: TestDispatcher,
        });
        let counter = new Counter();
        mgr.sceneContext().set(Counter, counter);
        mgr.run(projectScene);
        logger.info(`counter num ${JSON.stringify(counter)}`);
        assert.equal(projectScene.getMethods().length, 6);
    });

});
