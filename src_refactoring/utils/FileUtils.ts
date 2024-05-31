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
import Logger from "./logger";

const logger = Logger.getLogger();

export class FileUtils {
    public static readonly FILE_FILTER = {
        ignores: ['.git', '.preview', '.hvigor', '.idea', 'test', 'ohosTest'],
        include: /(?<!\.d)\.(ets|ts|json5)$/
    }

    public static getFilesRecursively(srcPath: string, files: string[]) {
        if (!fs.existsSync(srcPath)) {
            logger.warn(`Input directory ${srcPath} is not exist`);
            return;
        }

        const filesUnderThisDir = fs.readdirSync(srcPath, {withFileTypes: true});
        filesUnderThisDir.forEach(file => {
            const realFile = path.resolve(srcPath, file.name);
            if (file.isDirectory() && (!FileUtils.FILE_FILTER.ignores.includes(file.name))) {
                FileUtils.getFilesRecursively(realFile, files);
            } else if ((path.basename(realFile).match(FileUtils.FILE_FILTER.include))) {
                files.push(realFile);
            }
        });
    }
}