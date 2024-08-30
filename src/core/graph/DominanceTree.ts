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

import { BasicBlock } from './BasicBlock';
import { DominanceFinder } from './DominanceFinder';

export class DominanceTree {
    private blocks: BasicBlock[] = [];
    private blockToIdx = new Map<BasicBlock, number>();
    private children: number[][] = [];
    private parents: number[] = [];
    private doms: Array<Set<number>> = [];
    // d dom n && n -> d
    private backEdges: Set<number[]> = new Set<number[]>();
    // backEdges headers
    private headers: Set<number> = new Set<number>();

    constructor(dominanceFinder: DominanceFinder) {
        this.blocks = dominanceFinder.getBlocks();
        this.blockToIdx = dominanceFinder.getBlockToIdx();
        let idoms = dominanceFinder.getImmediateDominators();

        // build the tree
        let treeSize = this.blocks.length;
        this.children = new Array(treeSize);
        this.parents = new Array(treeSize);
        this.doms = new Array(treeSize);
        for (let i = 0; i < treeSize; i++) {
            this.children[i] = new Array();
            this.parents[i] = -1;
            this.doms[i] = new Set<number>();
            this.doms[i].add(i);
        }
        for (let i = 0; i < treeSize; i++) {
            if (idoms[i] != i) {
                this.parents[i] = idoms[i];
                this.children[idoms[i]].push(i);
            }

            this.doms[idoms[i]].forEach((value) => {
                this.doms[i].add(value);
            });
        }
    }

    public getAllNodesDFS(): BasicBlock[] {
        let dfsBlocks = new Array<BasicBlock>();
        let queue = new Array<BasicBlock>();
        queue.push(this.getRoot());
        while (queue.length != 0) {
            let curr = queue.splice(0, 1)[0];
            dfsBlocks.push(curr);
            let childList = this.getChildren(curr);
            if (childList.length != 0) {
                for (let i = childList.length - 1; i >= 0; i--) {
                    queue.splice(0, 0, childList[i]);
                }
            }
        }
        return dfsBlocks;
    }

    public getChildren(block: BasicBlock): BasicBlock[] {
        let childList = new Array<BasicBlock>();
        let idx = this.blockToIdx.get(block) as number;
        for (const i of this.children[idx]) {
            childList.push(this.blocks[i]);
        }
        return childList;
    }

    public getRoot(): BasicBlock {
        return this.blocks[0];
    }

    public getDominators(block: BasicBlock): BasicBlock[] {
        let dom = new Array<BasicBlock>();
        let idx = this.blockToIdx.get(block) as number;
        for (const i of this.doms[idx]) {
            dom.push(this.blocks[i]);
        }
        return dom;
    }

    public isBackEdgeHeader(block: BasicBlock): boolean {
        this.buildBackEdges();

        let idx = this.blockToIdx.get(block) as number;
        return this.headers.has(idx);
    }

    public getBackEdges(): Set<BasicBlock[]> {
        this.buildBackEdges();

        let edges = new Set<BasicBlock[]>();
        for (const edge of this.backEdges) {
            edges.add([this.blocks[edge[0]], this.blocks[edge[1]]]);
        }
        return edges;
    }

    private buildBackEdges() {
        if (this.backEdges.size > 0) {
            return;
        }
        this.backEdges = new Set();
        this.headers = new Set();
        for (let i = 0; i < this.blocks.length; i++) {
            for (const pred of this.blocks[i].getSuccessors()) {
                let predId = this.blockToIdx.get(pred) as number;
                if (this.doms[i].has(predId)) {
                    this.backEdges.add([i, predId]);
                    this.headers.add(predId);
                }
            }
        }
    }
}
