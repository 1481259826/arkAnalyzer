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

import fs from "fs";
import path from "path";
import { spawnSync } from 'child_process';
import Logger, { LOG_LEVEL } from "./utils/logger";
import { removeSync } from "fs-extra";
import { transfer2UnixPath } from "./utils/pathTransfer";
import { fetchDependenciesFromFile } from "./utils/json5parser";

const logger = Logger.getLogger();

/**
 * This class is used to manage all the configurations set up for the analyzer.
 */
export class Config {

    project_dir: string;
    projectName: string;
    sdkName?: string;
    sdk_dir?: string;

    constructor(projectName: string, project_dir: string, sdkName?: string, sdk_dir?: string) {
        this.projectName = projectName;
        this.project_dir = project_dir;
        this.sdkName = sdkName;
        this.sdk_dir = sdk_dir;
    }
}

export interface Sdk {
    name: string;
    path: string;
    moduleName: string;
}

export class SceneConfig {
    private configJsonPath: string = "";

    private targetProjectName: string = "";
    private targetProjectDirectory: string = "";

    private etsSdkPath: string = "";
    private sdksObj: Sdk[] = [];

    private sdkFiles: string[] = [];
    private sdkFilesMap: Map<string[], string> = new Map<string[], string>();
    private logPath: string = "./out/ArkAnalyzer.log";
    private logLevel: string = "ERROR";

    constructor() { }

    public async buildFromJson(configJsonPath: string) {
        if (fs.existsSync(configJsonPath)) {
            const configurationsText = fs.readFileSync(configJsonPath, "utf8");
            logger.info(configurationsText);
            const configurations = JSON.parse(configurationsText);

            if (configurations.logPath) {
                this.logPath = configurations.logPath;
            }
            if (configurations.logLevel) {
                this.logLevel = configurations.logLevel;
            }
            Logger.configure(this.logPath, LOG_LEVEL[this.logLevel as LOG_LEVEL]);

            this.sdksObj = configurations.sdks;

            this.targetProjectName = configurations.targetProjectName;
            this.targetProjectDirectory = configurations.targetProjectDirectory;
        }
        else {
            logger.error(`Your configJsonPath: "${configJsonPath}" is not exist.`);
        }
    }

    public async buildConfig(targetProjectName: string, targetProjectDirectory: string,
        sdkEtsPath: string, logPath: string, logLevel: string) {
        this.targetProjectName = targetProjectName;
        this.targetProjectDirectory = path.join(targetProjectDirectory, targetProjectName);
        this.etsSdkPath = sdkEtsPath;
        this.logPath = logPath;
        this.logLevel = logLevel;

        Logger.configure(this.logPath, LOG_LEVEL.ERROR);
    }

    public getTargetProjectName() {
        return this.targetProjectName;
    }

    public getTargetProjectDirectory() {
        return this.targetProjectDirectory;
    }

    public getSdkFiles() {
        return this.sdkFiles;
    }

    public getSdkFilesMap() {
        return this.sdkFilesMap;
    }

    public getEtsSdkPath() {
        return this.etsSdkPath;
    }

    public getSdksObj() {
        return this.sdksObj;
    }
}