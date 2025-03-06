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

import * as fs from 'fs';
import { createPtsCollectionCtor, IPtsCollection, PtsCollectionType } from './PtsDS';
import { NodeID } from '../../core/graph/GraphTraits';

export class PointerAnalysisConfig {
    private static instance: PointerAnalysisConfig;

    public kLimit: number;
    public outputDirectory: string;
    public detectTypeDiff: boolean;
    public dotDump: boolean;
    public unhandledFuncDump: boolean;
    public ptsCollectionType: PtsCollectionType;
    public ptsCollectionCtor: new () => IPtsCollection<NodeID>;

    constructor(kLimit: number, outputDirectory: string, detectTypeDiff: boolean=false,
        dotDump: boolean = false, unhandledFuncDump: boolean = false, ptsCoType = PtsCollectionType.Set) {
        if (kLimit > 5) {
            throw new Error("K Limit too large");
        }
        this.kLimit = kLimit;
        this.outputDirectory = outputDirectory;
        this.detectTypeDiff = detectTypeDiff;
        this.dotDump = dotDump;
        this.unhandledFuncDump = unhandledFuncDump;
        this.ptsCollectionType = ptsCoType;
        this.ptsCollectionCtor = createPtsCollectionCtor<NodeID>(ptsCoType);

        if (!fs.existsSync(outputDirectory)) {
            fs.mkdirSync(outputDirectory, { recursive: true });
        }
    }


    /*
     * Create Single instance
     */
    public static create (kLimit: number, outputDirectory: string, detectTypeDiff: boolean = false,
        dotDump: boolean = false, unhandledFuncDump: boolean = false, ptsCoType = PtsCollectionType.Set): PointerAnalysisConfig {
        PointerAnalysisConfig.instance = new PointerAnalysisConfig(kLimit, outputDirectory, detectTypeDiff, dotDump, unhandledFuncDump, ptsCoType);
        return PointerAnalysisConfig.instance;
    }

    public static getInstance(): PointerAnalysisConfig {
        if (!PointerAnalysisConfig.instance) {
            throw new Error("PTA config: instance is not existing")
        }
        return PointerAnalysisConfig.instance;
    }
}