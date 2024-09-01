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

import { CallGraphNodeKind } from "../model/CallGraph";

abstract class StatTraits {
    public getStat(): string {
        return '';
    }

    public printStat(): void {
        console.log(this.getStat());
    }
}

export class PTAStat implements StatTraits {
    numProcessedAddr: number = 0;
    numProcessedCopy: number = 0;
    numProcessedLoad: number = 0;
    numProcessedWrite: number = 0;
    numProcessedThis: number = 0;
    numRealWrite: number = 0;
    numRealLoad: number = 0;

    iterTimes: number = 0;
    TotalTime: number = 0;

    startTime: number = 0;
    endTime: number = 0;

    startMemUsage: any;
    endMemUsage: any;
    rssUsed: number = 0;
    heapUsed: number = 0;

    public startStat(): void {
        this.startTime = this.getNow();
        this.startMemUsage = process.memoryUsage();
    }

    public endStat(): void {
        this.endTime = this.getNow();
        this.endMemUsage = process.memoryUsage();
        this.TotalTime = (this.endTime - this.startTime) / 1000;
        this.rssUsed = Number(this.endMemUsage.rss - this.startMemUsage.rss) / Number(1024 * 1024);
        this.heapUsed = Number(this.endMemUsage.heapTotal - this.startMemUsage.heapTotal) / Number(1024 * 1024);
    }

    public getNow(): number {
        return new Date().getTime();
    }

    public getStat(): string {
        // TODO: get PAG stat and CG stat
        let output: string;
        output = '==== Pointer analysis Statictics: ====\n'
        output = output + `Processed address\t${this.numProcessedAddr}\n`
        output = output + `Processed copy\t\t${this.numProcessedCopy}\n`
        output = output + `Processed load\t\t${this.numProcessedLoad}\n`
        output = output + `Processed write\t\t${this.numProcessedWrite}\n`
        output = output + `Real write\t\t${this.numRealWrite}\n`
        output = output + `Real load\t\t${this.numRealLoad}\n`
        output = output + `Processed This\t\t${this.numProcessedThis}\n\n`
        output = output + `Total Time\t\t${this.TotalTime} S\n`
        output = output + `Total iterator Times\t${this.iterTimes}\n`
        output = output + `RSS used\t\t${this.rssUsed.toFixed(3)} Mb\n`
        output = output + `Heap used\t\t${this.heapUsed.toFixed(3)} Mb\n`
        return output;

    }

    public printStat(): void {
        console.log(this.getStat());
    }
}

export class PAGStat implements StatTraits {
    numDynamicCall: number = 0;
    numTotalFunction: number = 0;
    numTotalNode: number = 0;

    public getStat(): string {
        let output: string;
        output = '==== PAG Statictics: ====\n'
        output = output + `Dynamic call\t\t${this.numDynamicCall}\n`
        output = output + `Total function handled\t${this.numTotalFunction}\n`
        output = output + `Total PAG Nodes\t\t${this.numTotalNode}\n`
        return output;
    }

    public printStat(): void {
        console.log(this.getStat());
    }
}

export class CGStat extends StatTraits {
    //real, vitual, intrinsic, constructor
    numTotalNode: number = 0;
    numReal: number = 0;
    numVirtual: number = 0;
    numIntrinsic: number = 0;
    numConstructor: number = 0;

    public addNodeStat(kind: CallGraphNodeKind): void {
        switch(kind) {
            case CallGraphNodeKind.real:
                this.numReal++;
                break;
            case CallGraphNodeKind.vitual:
                this.numVirtual++;
                break;
            case CallGraphNodeKind.constructor:
                this.numConstructor++;
                break;
            case CallGraphNodeKind.intrinsic:
                this.numIntrinsic++;
                break;
            default:
        }
        this.numTotalNode++;
    }

    public getStat(): string {
        let output: string;
        output = '==== CG Statictics: ====\n'
        output = output + `Real function\t\t${this.numReal}\n`
        output = output + `Intrinsic function\t${this.numIntrinsic}\n`
        output = output + `Constructor function\t${this.numConstructor}\n`
        output = output + `Blank function\t\t${this.numVirtual}\n`
        output = output + `Total\t\t\t${this.numTotalNode}\n`
        return output;
    }
}