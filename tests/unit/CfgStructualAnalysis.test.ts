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

import { BasicBlock, Cfg, Stmt } from '../../src/index';
import { describe, expect, it } from 'vitest';
import { DominanceFinder } from '../../src/core/graph/DominanceFinder';
import { DominanceTree } from '../../src/core/graph/DominanceTree';
import { CfgStructualAnalysis } from '../../src/utils/CfgStructualAnalysis';

describe('CfgStructualAnalysisTest', () => {
    /**
     *        0
     *       /  \
     *      1 -- 2
     *           | \
     *           | /
     *           3
     *          / \
     *         4   5
     *          \ /
     *           6
     *           |
     *           7
     *          / \
     *         8   9
     */
    let cfg = new Cfg();
    let bbs: BasicBlock[] = [];
    let startingStmt: Stmt = new Stmt();

    for (let i = 0; i < 10; i++) {
        let bb = new BasicBlock();
        bb.setId(i);
        bbs.push(bb);
    }

    bbs[0].addStmtToFirst(startingStmt);

    bbs[0].addSuccessorBlock(bbs[1]);
    bbs[0].addSuccessorBlock(bbs[2]);
    bbs[0].addPredecessorBlock(bbs[8]);

    bbs[1].addSuccessorBlock(bbs[2]);
    bbs[1].addPredecessorBlock(bbs[0]);

    bbs[2].addSuccessorBlock(bbs[3]);
    bbs[2].addPredecessorBlock(bbs[0]);
    bbs[2].addPredecessorBlock(bbs[3]);
    bbs[2].addPredecessorBlock(bbs[7]);

    bbs[3].addSuccessorBlock(bbs[2]);
    bbs[3].addSuccessorBlock(bbs[4]);
    bbs[3].addSuccessorBlock(bbs[5]);
    bbs[3].addPredecessorBlock(bbs[2]);
    bbs[3].addPredecessorBlock(bbs[6]);

    bbs[4].addSuccessorBlock(bbs[6]);
    bbs[4].addPredecessorBlock(bbs[3]);

    bbs[5].addSuccessorBlock(bbs[6]);
    bbs[5].addPredecessorBlock(bbs[3]);

    bbs[6].addSuccessorBlock(bbs[3]);
    bbs[6].addSuccessorBlock(bbs[7]);
    bbs[6].addPredecessorBlock(bbs[4]);
    bbs[6].addPredecessorBlock(bbs[5]);
    bbs[6].addPredecessorBlock(bbs[9]);

    bbs[7].addSuccessorBlock(bbs[8]);
    bbs[7].addSuccessorBlock(bbs[9]);
    bbs[7].addSuccessorBlock(bbs[2]);
    bbs[7].addPredecessorBlock(bbs[6]);

    bbs[8].addSuccessorBlock(bbs[0]);
    bbs[8].addPredecessorBlock(bbs[7]);

    bbs[9].addSuccessorBlock(bbs[6]);
    bbs[9].addPredecessorBlock(bbs[7]);

    cfg.setStartingStmt(startingStmt);

    for (let i = 0; i < 10; i++) {
        cfg.addBlock(bbs[i]);
    }

    it('case1: dominance tree', () => {
        let finder = new DominanceFinder(cfg);
        let idom = finder.getImmediateDominators();
        expect(idom.join(',')).eq([0, 0, 0, 2, 3, 3, 3, 6, 7, 7].join(','));

        let tree = new DominanceTree(finder);
        let dom2 = tree.getDominators(bbs[2]);
        expect(dom2.length).eq(2);

        let dom9 = tree.getDominators(bbs[9]);
        expect(dom9.length).eq(6);

        let cfgUtils = new CfgStructualAnalysis(cfg);

        let loop32 = cfgUtils.naturalLoops(bbs[3], bbs[2]);
        expect(loop32.size).eq(7);

        let loop96 = cfgUtils.naturalLoops(bbs[9], bbs[6]);
        expect(loop96.size).eq(3);
    
    });
});
