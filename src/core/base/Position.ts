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

import ts from 'ohos-typescript';

export abstract class Position {
    public abstract getFirstLine(): number;

    public abstract getLastLine(): number;

    public abstract getFirstCol(): number;

    public abstract getLastCol(): number;
}

export class LinePosition {
    private readonly lineNo: number;

    constructor(lineNo: number) {
        this.lineNo = lineNo;
    }

    public getLineNo(): number {
        return this.lineNo;
    }
}

/**
 * @category core/base
 */
export class LineColPosition {
    private readonly lineNo: number;
    private readonly colNo: number;

    public static readonly DEFAULT: LineColPosition = new LineColPosition(-1, -1);

    constructor(lineNo: number, colNo: number) {
        this.lineNo = lineNo;
        this.colNo = colNo;
    }

    public getLineNo(): number {
        return this.lineNo;
    }

    public getColNo(): number {
        return this.colNo;
    }

    public static buildFromNode(node: ts.Node, sourceFile: ts.SourceFile) {
        let {line, character} = ts.getLineAndCharacterOfPosition(
            sourceFile,
            node.getStart(sourceFile),
        );
        // line start from 1.
        return new LineColPosition(line + 1, character + 1);
    }
}