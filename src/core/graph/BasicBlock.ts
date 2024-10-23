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

import { Stmt } from '../base/Stmt';

/**
 * @category core/graph
 * A `BasicBlock` is composed of:
 * - ID: a **number** that uniquely identify the basic block, initialized as -1.
 * - Statements: an **array** of statements in the basic block.
 * - Predecessors:  an **array** of basic blocks in front of the current basic block. More accurately, these basic blocks can reach the current block through edges.
 * - Successors: an **array** of basic blocks after the current basic block. More accurately, the current block can reach these basic blocks through edges.
 */
export class BasicBlock {
    private id: number = -1;
    private stmts: Stmt[] = [];
    private predecessorBlocks: BasicBlock[] = [];
    private successorBlocks: BasicBlock[] = [];

    constructor() {
    }

    public getId(): number {
        return this.id;
    }

    public setId(id: number): void {
        this.id = id;
    }

    /**
     * Returns an array of the statements in a basic block.
     * @returns An array of statements in a basic block.
     */
    public getStmts(): Stmt[] {
        return this.stmts;
    }

    public addStmt(stmt: Stmt): void {
        this.stmts.push(stmt);
    }

    public getHead(): Stmt | null {
        if (this.stmts.length == 0) {
            return null;
        }
        return this.stmts[0];
    }

    public getTail(): Stmt | null {
        let size = this.stmts.length;
        if (size == 0) {
            return null;
        }
        return this.stmts[size - 1];
    }

    /**
     * Returns successors of the current basic block, whose types are also basic blocks (i.e.{@link BasicBlock}).
     * @returns Successors of the current basic block.
     * @example
     * 1. get block successors.

    ```typescript
    const body = arkMethod.getBody();
    const blocks = [...body.getCfg().getBlocks()]
    for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
        ...
        for (const next of block.getSuccessors()) {
        ...
        }
    } 
    ```
     */
    public getSuccessors(): BasicBlock[] {
        return this.successorBlocks;
    }

    /**
     * Returns predecessors of the current basic block, whose types are also basic blocks.
     * @returns An array of basic blocks.
     */
    public getPredecessors(): BasicBlock[] {
        return this.predecessorBlocks;
    }

    public addPredecessorBlock(block: BasicBlock): void {
        this.predecessorBlocks.push(block);
    }

    public setPredecessorBlock(idx: number, block: BasicBlock): boolean {
        if (idx < this.predecessorBlocks.length) {
            this.predecessorBlocks[idx] = block;
            return true;
        }
        return false;
    }

    public setSuccessorBlock(idx: number, block: BasicBlock): boolean {
        if (idx < this.successorBlocks.length) {
            this.successorBlocks[idx] = block;
            return true;
        }
        return false;
    }

    // Temp just for SSA
    public addStmtToFirst(stmt: Stmt) {
        this.stmts.splice(0, 0, stmt);
    }

    // Temp just for SSA
    public addSuccessorBlock(block: BasicBlock): void {
        this.successorBlocks.push(block);
    }

    public toString(): string {
        let strs: string[] = [];
        for (const stmt of this.stmts) {
            strs.push(stmt.toString() + '\n');
        }
        return strs.join('');
    }
}
