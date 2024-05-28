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

import { Scene } from "../src/Scene";
import * as utils from "../src/utils/getAllFiles";
import { Config } from "./Config";

function run(config: Config) {
    const projectName: string = config.projectName;
    const input_dir: string = config.input_dir;

    //(1)get all files under input_dir
    //TODO: add support for using tscconfig to get files
    const projectFiles: string[] = utils.getAllFiles(input_dir, ['.ts']);

    //(2) Fill Scene class
    let scene: Scene = new Scene(projectName, projectFiles);
    //HotPropertyAccessCheck(scene);

    //const fl = 'C:\\msys64\\home\\Yifei\\code\\ArkAnalyzer\\tests\\sample\\sample.ts';
    //const fl = '/Users/yifei/Documents/Code/ArkAnalyzer/tests/sample/sample.ts';
    //let mtd = scene.getMethod(fl, '_DEFAULT_ARK_METHOD', [], [], '_DEFAULT_ARK_CLASS');
    //logger.info(mtd);
    //logger.info(mtd?.cfg);
    debugger;

    //let code = 'let age = myPerson.age + i;';
    //let codeTree = new ASTree(code);
    //codeTree.printAST();
}

//let config: Config = new Config("app_photo", "/Users/yifei/Documents/Code/applications_photos/common/src/main/ets");
//let config: Config = new Config("app_photo", "/Users/yifei/Documents/Code/applications_systemui");
//let config: Config = new Config("app_photo", "./tests/sample");
let config: Config = new Config("app_test", "/Users/yangyizhuo/WebstormProjects/ArkAnalyzer/tests/resources/cfg");
run(config);