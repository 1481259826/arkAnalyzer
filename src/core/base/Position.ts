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

export class FullPosition {
    private readonly firstLine: number;
    private readonly firstCol: number;
    private readonly lastLine: number;
    private readonly lastCol: number;

    public static readonly DEFAULT: FullPosition = new FullPosition(-1, -1, -1, -1);

    constructor(firstLine: number, firstCol: number, lastLine: number, lastCol: number) {
        this.firstLine = firstLine;
        this.firstCol = firstCol;
        this.lastLine = lastLine;
        this.lastCol = lastCol;
    }

    public getFirstLine(): number {
        return this.firstLine;
    }

    public getLastLine(): number {
        return this.lastLine;
    }

    public getFirstCol(): number {
        return this.firstCol;
    }

    public getLastCol(): number {
        return this.lastCol;
    }

    public static buildFromNode(node: ts.Node, sourceFile: ts.SourceFile): FullPosition {
        const { line: startLine, character: startCharacter } = ts.getLineAndCharacterOfPosition(
            sourceFile,
            node.getStart(sourceFile),
        );
        const { line: endLine, character: endCharacter } = ts.getLineAndCharacterOfPosition(
            sourceFile,
            node.getEnd(),
        );

        // line start from 1
        return new FullPosition(startLine + 1, startCharacter + 1, endLine + 1, endCharacter + 1);
    }

    public static merge(leftMostPosition: FullPosition, rightMostPosition: FullPosition): FullPosition {
        return new FullPosition(leftMostPosition.getFirstLine(), leftMostPosition.getFirstCol(),
            rightMostPosition.getLastLine(), rightMostPosition.getLastCol());
    }
}