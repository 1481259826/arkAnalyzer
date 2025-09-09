export const TRY_CATCH_EXPECT_CASE1 = {
    blocks: [
        {
            id: 0,
            stmts: [
                'this = this: @tryCatch/TryCatchSample.ts: %dflt',
                'i = 0',
            ],
            preds: [],
            succes: [1],
        },
        {
            id: 1,
            stmts: [
                'if i !== 0',
            ],
            preds: [0],
            succes: [2, 4],
        },
        {
            id: 2,
            stmts: [
                'y = 10 / i',
            ],
            preds: [1],
            succes: [4],
        },
        {
            id: 3,
            stmts: [
                'e = caughtexception: unknown',
                "instanceinvoke console.<@%unk/%unk: .log()>('i === 0')"
            ],
            preds: [],
            succes: [4],
        },
        {
            id: 4,
            stmts: [
                'return',
            ],
            preds: [1, 2, 3],
            succes: [],
        },
    ],
};