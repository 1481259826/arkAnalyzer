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
    //private projectFiles: Map<string, string[]> = new Map<string, string[]>();
    private logPath: string = "./out/ArkAnalyzer.log";
    private logLevel: string = "ERROR";

    //private ohPkgContentMap: Map<string, { [k: string]: unknown }> = new Map<string, { [k: string]: unknown }>();

    constructor() { }

    public async buildFromJson(configJsonPath: string) {
        if (fs.existsSync(configJsonPath)) {
            const configurationsText = fs.readFileSync(configJsonPath, "utf8");
            logger.info(configurationsText);
            const configurations = JSON.parse(configurationsText);

            // let otherSdks: otherSdk[] = [];
            // for (let sdk of configurations.otherSdks) {
            //     otherSdks.push(JSON.parse(JSON.stringify(sdk)));
            // }
            // otherSdks.forEach((sdk) => {
            //     if (sdk.name && sdk.path) {

            //         this.otherSdkMap.set(sdk.name, sdk.path);
            //     }
            // });

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

    // public buildFromProjectDir(targetProjectDirectory: string) {
    //     this.targetProjectDirectory = targetProjectDirectory;
    //     this.targetProjectName = path.basename(targetProjectDirectory);
    //     Logger.configure(this.logPath, LOG_LEVEL.ERROR);
    //     this.getAllFiles();
    // }

    public async buildConfig(targetProjectName: string, targetProjectDirectory: string,
        sdkEtsPath: string, logPath: string, logLevel: string) {
        this.targetProjectName = targetProjectName;
        this.targetProjectDirectory = path.join(targetProjectDirectory, targetProjectName);
        this.etsSdkPath = sdkEtsPath;
        this.logPath = logPath;
        this.logLevel = logLevel;

        Logger.configure(this.logPath, LOG_LEVEL.ERROR);
        //this.getAllFiles();
    }

    // private getAllFiles() {
    //     if (this.targetProjectDirectory) {
    //         this.projectFiles = getFiles2PkgMap(this.targetProjectDirectory, new Array<string>(), this.ohPkgContentMap);
    //     }
    //     else {
    //         throw new Error('TargetProjectDirectory is wrong.');
    //     }
    //     if (this.etsSdkPath) {
    //         let etsFiles: string[] = getFiles(this.etsSdkPath, "\\.d\\.ts\$");
    //         this.sdkFiles.push(...etsFiles);
    //         this.sdkFilesMap.set(etsFiles, "etsSdk");
    //     }
    //     if (this.otherSdkMap.size != 0) {
    //         this.otherSdkMap.forEach((value, key) => {
    //             let otherSdkFiles: string[] = getFiles(value, "\\.d\\.ts\$");
    //             this.sdkFiles.push(...otherSdkFiles);
    //             this.sdkFilesMap.set(otherSdkFiles, key);
    //         });
    //     }
    // }

    public getTargetProjectName() {
        return this.targetProjectName;
    }

    public getTargetProjectDirectory() {
        return this.targetProjectDirectory;
    }

    // public getTargetProjectOriginDirectory() {
    //     return this.targetProjectOriginDirectory;
    // }

    // public getProjectFiles() {
    //     return this.projectFiles;
    // }

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

    // public getLogPath(): string {
    //     return this.logPath;
    // }

    // public getOhPkgContentMap(): Map<string, { [k: string]: unknown }> {
    //     return this.ohPkgContentMap;
    // }
}

function getFiles(srcPath: string, fileExt: string, tmpFiles: string[] = []) {

    let extReg = new RegExp(fileExt);

    if (!fs.existsSync(srcPath)) {
        logger.info("Input directory is not exist: ", srcPath);
        return tmpFiles;
    }

    const realSrc = fs.realpathSync(srcPath);

    let files2Do: string[] = fs.readdirSync(realSrc);
    for (let fileName of files2Do) {
        if (fileName == 'oh_modules' ||
            fileName == 'node_modules' ||
            fileName == 'ets-loader') {
            continue;
        }
        const realFile = path.resolve(realSrc, fileName);

        if (fs.statSync(realFile).isDirectory()) {
            getFiles(realFile, fileExt, tmpFiles);
        } else {
            if (extReg.test(realFile)) {
                tmpFiles.push(realFile);
            }
        }
    }

    return tmpFiles;
}

function getFiles2PkgMap(srcPath: string, ohPkgFiles: string[], ohPkgContentMap: Map<string, { [k: string]: unknown }>, tmpMap: Map<string, string[]> = new Map()) {

    if (!fs.existsSync(srcPath)) {
        logger.info("Input directory is not exist: ", srcPath);
        return tmpMap;
    }

    const realSrc = fs.realpathSync(srcPath);

    let files2Do: string[] = fs.readdirSync(realSrc);
    let ohPkgFilesOfThisDir: string[] = [];
    ohPkgFilesOfThisDir.push(...ohPkgFiles);
    files2Do.forEach((fl) => {
        if (fl == 'oh-package.json5') {
            let dirJson5 = path.resolve(realSrc, 'oh-package.json5');
            ohPkgFilesOfThisDir.push(dirJson5);
            ohPkgContentMap.set(dirJson5, fetchDependenciesFromFile(dirJson5));
        }
    });
    for (let fileName of files2Do) {
        if (fileName == 'oh_modules' ||
            fileName == 'node_modules' ||
            fileName == 'hvigorfile.ts') {
            continue;
        }
        const realFile = path.resolve(realSrc, fileName);

        if (fs.statSync(realFile).isDirectory()) {
            getFiles2PkgMap(realFile, ohPkgFilesOfThisDir, ohPkgContentMap, tmpMap);
        } else {
            const extReg = new RegExp("\\.(ts|ets)\$");
            if (extReg.test(realFile)) {
                tmpMap.set(realFile, ohPkgFilesOfThisDir);
            }
        }
    }

    return tmpMap;
}