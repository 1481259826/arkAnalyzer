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

import { Config } from './Config';
import { Scene } from '../src/Scene';
import { PerformanceChecker } from './checker/PerformanceChecker';
import * as utils from '../src/utils/getAllFiles';

const fs = require('fs');

export class PerformanceCheckerTest {
    private loadPerformanceChecker(): PerformanceChecker {
        let performanceChecker = new PerformanceChecker();
        return performanceChecker;
    }

    public testPerformanceChecker() {
        let performanceChecker = this.loadPerformanceChecker();

        let config = new Config("checkerTest", "tests\\resources\\checker");
        const projectName: string = config.projectName;
        const input_dir: string = config.input_dir;

        const projectFiles: string[] = utils.getAllFiles(input_dir, ['.ts']);

        let scene = new Scene(projectName, projectFiles);
        for (const arkFile of scene.arkFiles) {
            performanceChecker.checkDeteleProperty(arkFile);
        }
    }
}

let performanceCheckerTest = new PerformanceCheckerTest();
performanceCheckerTest.testPerformanceChecker();

debugger