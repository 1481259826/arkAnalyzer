export const DestBody_Expect_ViewTree = {
    name: 'Column',
    children: []
};

export const Fade_Expect_ViewTree = {
    name: 'View',
    children: [
        DestBody_Expect_ViewTree
    ]
};

export const Explode_Expect_ViewTree = {
    name: 'View',
    children: [
        {
            name: 'Row',
            children: []
        }
    ]
};

export const PageMap_Expect_ViewTree = {
    name: 'Builder',
    children: [
        {
            name: 'If',
            children: [
                {
                    name: 'IfBranch',
                    children: [
                        Fade_Expect_ViewTree
                    ]
                },
                {
                    name: 'IfBranch',
                    children: [
                        {
                            name: 'If',
                            children: [
                                {
                                    name: 'IfBranch',
                                    children: [
                                        Explode_Expect_ViewTree
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ]
};

export const navDestinationTest_Expect_ViewTree = {
    name: 'Navigation',
    stateValues: ['stack'],
    children: [
        PageMap_Expect_ViewTree
    ]
};