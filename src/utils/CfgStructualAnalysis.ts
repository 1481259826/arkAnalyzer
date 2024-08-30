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

import { ArkIfStmt } from '../core/base/Stmt';
import { BasicBlock } from '../core/graph/BasicBlock';
import { Cfg } from '../core/graph/Cfg';
import { DominanceFinder } from '../core/graph/DominanceFinder';
import { DominanceTree } from '../core/graph/DominanceTree';

enum BlockType {
    NORMAL = 1,
    WHILE = 2,
    DO_WHILE_START = 4,
    DO_WHILE = 8,
    FOR = 16,
    FOR_INC = 32,
    IF = 64,
    IF_ELSE = 128,
}

const LOOP_CONTROL_TYPE = new Set([BlockType.WHILE, BlockType.FOR, BlockType.FOR_INC, BlockType.DO_WHILE]);

export class CfgStructualAnalysis {
    /** key: loop header, value: loop node dfs */
    private loopPath: Map<BasicBlock, Set<BasicBlock>> = new Map();
    private blockTypes: Map<BasicBlock, BlockType> = new Map();
    private forIncMap: Map<BasicBlock, BasicBlock> = new Map();
    private doWhilePair: Map<BasicBlock, BasicBlock> = new Map();
    private dominanceTree: DominanceTree;

    public constructor(cfg: Cfg) {
        this.dominanceTree = new DominanceTree(new DominanceFinder(cfg));
        this.forIncMap = new Map();
        this.buildLoopsPath();
        this.identifyBlocks(cfg);
    }

    public getLoopPath(block: BasicBlock): Set<BasicBlock> | undefined {
        return this.loopPath.get(block);
    }

    public isIfBlock(block: BasicBlock): boolean {
        return (this.blockTypes.get(block)! & BlockType.IF) == BlockType.IF;
    }

    public isIfElseBlock(block: BasicBlock): boolean {
        return (this.blockTypes.get(block)! & BlockType.IF_ELSE) == BlockType.IF_ELSE;
    }

    public isWhileBlock(block: BasicBlock): boolean {
        return (this.blockTypes.get(block)! & BlockType.WHILE) == BlockType.WHILE;
    }

    public isDoBlock(block: BasicBlock): boolean {
        return (this.blockTypes.get(block)! & BlockType.DO_WHILE_START) == BlockType.DO_WHILE_START;
    }

    public isDoWhileBlock(block: BasicBlock): boolean {
        return (this.blockTypes.get(block)! & BlockType.DO_WHILE) == BlockType.DO_WHILE;
    }

    public isLoopControlBlock(block: BasicBlock): boolean {
        return LOOP_CONTROL_TYPE.has(this.blockTypes.get(block)!);
    }

    public isForBlock(block: BasicBlock): boolean {
        return (this.blockTypes.get(block)! & BlockType.FOR) == BlockType.FOR;
    }

    public isNormalBlock(block: BasicBlock): boolean {
        return (this.blockTypes.get(block)! & BlockType.NORMAL) == BlockType.NORMAL;
    }

    public getForIncBlock(block: BasicBlock): BasicBlock | undefined {
        return this.forIncMap.get(block);
    }

    public getDoWhileBlock(block: BasicBlock): BasicBlock | undefined {
        return this.doWhilePair.get(block);
    }

    private identifyBlocks(cfg: Cfg) {
        let blocks = cfg.getBlocks();
        let visitor = new Set<BasicBlock>();
        this.blockTypes = new Map<BasicBlock, BlockType>();
        this.doWhilePair = new Map();

        for (const block of blocks) {
            if (visitor.has(block)) {
                continue;
            }
            visitor.add(block);
            this.blockTypes.set(block, BlockType.NORMAL);

            if (this.isLoopHeaderBB(block)) {
                if (this.isLoopControlBB(block, block)) {
                    this.blockTypes.set(block, BlockType.WHILE);
                    continue;
                }

                for (const edge of this.dominanceTree.getBackEdges()) {
                    if (edge[1] == block) {
                        if (this.isLoopControlBB(block, edge[0])) {
                            this.blockTypes.set(block, BlockType.DO_WHILE_START);
                            this.blockTypes.set(edge[0], BlockType.DO_WHILE);
                            this.doWhilePair.set(block, edge[0]);
                            visitor.add(edge[0]);
                            break;
                        }
                    }
                }
            }

            if (this.isIfStmtBB(block)) {
                if (this.isIfElseBB(block)) {
                    this.blockTypes.set(block, this.blockTypes.get(block)! | BlockType.IF_ELSE);
                } else {
                    this.blockTypes.set(block, this.blockTypes.get(block)! | BlockType.IF);
                }
                continue;
            }

            let successors = block.getSuccessors();
            if (
                successors.length == 1 &&
                this.blockTypes.get(successors[0]) == BlockType.WHILE &&
                block.getPredecessors().length > 1
            ) {
                this.blockTypes.set(block, BlockType.FOR_INC);
                this.blockTypes.set(successors[0], BlockType.FOR);
                this.forIncMap.set(successors[0], block);
            }
        }
    }

    private isIfStmtBB(block: BasicBlock): boolean {
        for (let stmt of block.getStmts()) {
            if (stmt instanceof ArkIfStmt) {
                return true;
            }
        }
        return false;
    }

    private isLoopHeaderBB(block: BasicBlock): boolean {
        return this.dominanceTree.isBackEdgeHeader(block);
    }

    private isLoopControlBB(header: BasicBlock, block: BasicBlock): boolean {
        let loopBlocks = this.loopPath.get(header);
        let succ = block.getSuccessors();
        if (succ.length < 2) {
            return false;
        }

        return !loopBlocks?.has(succ[1]) && this.isIfStmtBB(block);
    }

    private isIfElseBB(block: BasicBlock): boolean {
        for (const nextBlock of block.getSuccessors()) {
            for (const otherBlock of block.getSuccessors()) {
                if (nextBlock == otherBlock) {
                    continue;
                }

                for (const successor of nextBlock.getSuccessors()) {
                    if (successor == otherBlock) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    public getInnermostLoops(block: BasicBlock): Set<BasicBlock> | undefined {
        let innermost: Set<BasicBlock> | undefined = undefined;
        this.loopPath.forEach((value) => {
            if (value.has(block)) {
                if (!innermost || value.size < innermost.size) {
                    innermost = value;
                }
            }
        });

        return innermost;
    }

    private buildLoopsPath() {
        this.loopPath = new Map<BasicBlock, Set<BasicBlock>>();
        for (const edge of this.dominanceTree.getBackEdges()) {
            this.loopPath.set(edge[1], this.naturalLoops(edge[0], edge[1]));
        }
    }

    public naturalLoops(backEdgeStart: BasicBlock, backEdgeEnd: BasicBlock): Set<BasicBlock> {
        let loop: Set<BasicBlock> = new Set();
        let stack: BasicBlock[] = [];

        loop.add(backEdgeEnd);
        loop.add(backEdgeStart);

        stack.push(backEdgeStart);

        while (stack.length > 0) {
            let m = stack.shift()!;
            for (const pred of m.getPredecessors()) {
                if (loop.has(pred)) {
                    continue;
                }
                loop.add(pred);
                stack.push(pred);
            }
        }
        let sortedLoop = Array.from(loop);
        sortedLoop.sort((a, b) => {
            return a.getId() - b.getId();
        });
        return new Set(sortedLoop);
    }
}
