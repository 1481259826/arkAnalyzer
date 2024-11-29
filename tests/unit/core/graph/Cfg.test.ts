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

import { ArkErrorCode } from '../../../../src/core/common/ArkError';
import {
    ArkConditionExpr,
    ArkIfStmt,
    ArkReturnVoidStmt,
    BasicBlock,
    Cfg,
    Local,
    RelationalBinaryOperator,
    Stmt,
    ValueUtil,
} from '../../../../src/index';
import { describe, expect, it } from 'vitest';

describe('CfgTest', () => {
    it('case1: patching interface', () => {
        let cfg = new Cfg();
        let bb: BasicBlock = new BasicBlock();
        let startingStmt: Stmt = new ArkReturnVoidStmt();
        startingStmt.setCfg(cfg);
        bb.addStmtToFirst(startingStmt);
        cfg.setStartingStmt(startingStmt);

        cfg.addBlock(bb);
        let stmt0 = new ArkIfStmt(
            new ArkConditionExpr(new Local('%0'), ValueUtil.getOrCreateNumberConst(0),
                RelationalBinaryOperator.Equality),
        );
        let ans = cfg.insertAfter(stmt0, startingStmt);
        expect(ans).eq(1);

        let err0 = bb.validate();
        expect(err0.errCode).eq(ArkErrorCode.BB_MORE_THAN_ONE_BRANCH_RET_STMT);

        let stmt1 = new ArkIfStmt(
            new ArkConditionExpr(new Local('%1'), ValueUtil.getOrCreateNumberConst(1),
                RelationalBinaryOperator.Equality),
        );
        let stmt2 = new ArkIfStmt(
            new ArkConditionExpr(new Local('%2'), ValueUtil.getOrCreateNumberConst(2),
                RelationalBinaryOperator.Equality),
        );
        ans = cfg.insertAfter([stmt1, stmt2], startingStmt);
        expect(ans).eq(2);
        expect(
            cfg
                .getStmts()
                .map((stmt) => stmt.toString())
                .join('\n')
        ).eq([startingStmt, stmt1, stmt2, stmt0].map((stmt) => stmt.toString()).join('\n'));

        let stmt3 = new ArkIfStmt(
            new ArkConditionExpr(new Local('%3'), ValueUtil.getOrCreateNumberConst(1),
                RelationalBinaryOperator.Equality),
        );
        let stmt4 = new ArkIfStmt(
            new ArkConditionExpr(new Local('%4'), ValueUtil.getOrCreateNumberConst(2),
                RelationalBinaryOperator.Equality),
        );

        ans = cfg.insertBefore([stmt3, stmt4], startingStmt);
        expect(ans).eq(2);
        expect(
            cfg
                .getStmts()
                .map((stmt) => stmt.toString())
                .join('\n')
        ).eq([stmt3, stmt4, startingStmt, stmt1, stmt2, stmt0].map((stmt) => stmt.toString()).join('\n'));

        cfg.remove(stmt4);
        expect(
            cfg
                .getStmts()
                .map((stmt) => stmt.toString())
                .join('\n')
        ).eq([stmt3, startingStmt, stmt1, stmt2, stmt0].map((stmt) => stmt.toString()).join('\n'));

        ans = cfg.insertAfter(stmt3, stmt4);
        expect(ans).eq(0);

        let err = cfg.validate();
        expect(err.errCode).eq(ArkErrorCode.OK);
    });
});
