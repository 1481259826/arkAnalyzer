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

import { Constant } from '../core/base/Constant';
import { Local } from '../core/base/Local';
import { ArkInstanceFieldRef } from '../core/base/Ref';
import { ArkAssignStmt, ArkIfStmt, Stmt } from '../core/base/Stmt';
import { Value } from '../core/base/Value';
import { BasicBlock } from '../core/graph/BasicBlock';
import { Cfg } from '../core/graph/Cfg';
import { DominanceFinder } from '../core/graph/DominanceFinder';
import { DominanceTree } from '../core/graph/DominanceTree';

enum BlockType {
    NORMAL,
    WHILE,
    FOR,
    FOR_INC,
    CONTINUE,
    BREAK,
    IF,
    IF_ELSE,
}

const LoopHeaderType = new Set([BlockType.WHILE, BlockType.FOR, BlockType.FOR_INC]);

export class CfgUitls {
    /** key: loop header, value: loop node dfs */
    private loopPath: Map<BasicBlock, Set<BasicBlock>>;
    private blockTypes: Map<BasicBlock, BlockType>;
    private forIncMap: Map<BasicBlock, BasicBlock>;
    private blockSize: number;
    private dominanceTree: DominanceTree;
    private cfg: Cfg;

    public constructor(cfg: Cfg) {
        this.cfg = cfg;
        this.blockSize = cfg.getBlocks().size;
        this.dominanceTree = new DominanceTree(new DominanceFinder(cfg));
        this.forIncMap = new Map();
        this.buildLoopsPath();
        this.identifyBlocks(cfg);
    }

    public getLoopPath(block: BasicBlock): Set<BasicBlock> | undefined {
        return this.loopPath.get(block);
    }

    public isIfBlock(block: BasicBlock): boolean {
        return this.blockTypes.get(block) == BlockType.IF;
    }

    public isIfElseBlock(block: BasicBlock): boolean {
        return this.blockTypes.get(block) == BlockType.IF_ELSE;
    }

    public isWhileBlock(block: BasicBlock): boolean {
        return this.blockTypes.get(block) == BlockType.WHILE;
    }

    public isLoopHeader(block: BasicBlock): boolean {
        return LoopHeaderType.has(this.blockTypes.get(block)!);
    }

    public isForBlock(block: BasicBlock): boolean {
        return this.blockTypes.get(block) == BlockType.FOR;
    }

    public isConinueBlock(block: BasicBlock): boolean {
        return this.blockTypes.get(block) == BlockType.CONTINUE;
    }

    public isBreakBlock(block: BasicBlock): boolean {
        return this.blockTypes.get(block) == BlockType.BREAK;
    }

    public isNormalBlock(block: BasicBlock): boolean {
        return this.blockTypes.get(block) == BlockType.NORMAL;
    }

    public getForIncBlock(block: BasicBlock): BasicBlock | undefined {
        return this.forIncMap.get(block);
    }

    private identifyBlocks(cfg: Cfg) {
        let blocks = cfg.getBlocks();
        let visitor = new Set<BasicBlock>();
        this.blockTypes = new Map<BasicBlock, BlockType>();

        for (const block of blocks) {
            if (visitor.has(block)) {
                continue;
            }
            visitor.add(block);
            if (this.isIfStmtBB(block) && this.isLoopBB(block)) {
                this.blockTypes.set(block, BlockType.WHILE);
            } else if (this.isIfStmtBB(block)) {
                if (this.isIfElseBB(block)) {
                    this.blockTypes.set(block, BlockType.IF_ELSE);
                } else {
                    this.blockTypes.set(block, BlockType.IF);
                }
                // successorBlocks continue or break

                // } else if (this.isGotoStmtBB(block)) {
                //     if (this.isContinueBB(block, this.blockTypes)) {
                //         this.blockTypes.set(block, BlockType.CONTINUE);
                //     } else {
                //         this.blockTypes.set(block, BlockType.BREAK);
                //     }
            } else {
                let successors = block.getSuccessors();
                if (successors.length == 1 && this.blockTypes.get(successors[0]) == BlockType.WHILE && block.getPredecessors().length > 1) {
                    this.blockTypes.set(block, BlockType.FOR_INC);
                    this.blockTypes.set(successors[0], BlockType.FOR);
                    this.forIncMap.set(successors[0], block);
                } else {
                    this.blockTypes.set(block, BlockType.NORMAL);
                }
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

    private isLoopBB(block: BasicBlock): boolean {
        return this.dominanceTree.isBackEdgeHeader(block);
    }

    private isGotoStmtBB(block: BasicBlock): boolean {
        // for (let stmt of block.getStmts()) {
        //     if (stmt instanceof ArkGotoStmt) {
        //         return true;
        //     }
        // }
        return false;
    }

    private isContinueBB(block: BasicBlock, blockTypes: Map<BasicBlock, BlockType>): boolean {
        let type = blockTypes.get(block.getSuccessors()[0]);
        let toLoop = false;
        if (type == BlockType.FOR || type == BlockType.WHILE) {
            toLoop = true;
        }

        if (!toLoop) {
            return false;
        }

        let parentLoop: BasicBlock = block;
        let minSize: number = this.blockSize;
        for (let [key, value] of this.loopPath) {
            if (value.has(block) && value.size < minSize) {
                minSize = value.size;
                parentLoop = key;
            }
        }

        if (parentLoop == block.getSuccessors()[0]) {
            return true;
        }

        return false;
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
                if (!innermost || (value.size < innermost.size)) {
                    innermost = value;
                }
            }
        });

        return innermost;
    }

    private buildLoopsPath() {
        this.loopPath = new Map<BasicBlock, Set<BasicBlock>>();
        for (const edge of this.dominanceTree.getBackEdges()) {
            this.loopPath.set(edge[1], CfgUitls.naturalLoops(edge[0], edge[1]));
        }
    }

    public static naturalLoops(backEdgeStart: BasicBlock, backEdgeEnd: BasicBlock): Set<BasicBlock> {
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
