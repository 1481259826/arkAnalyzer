export const MenuBuilder_Expect_ViewTree = {
    name: 'Builder',
    children: [
        {
            name: 'Flex',
            children: [
                {
                    name: 'ForEach',
                    stateValues: ['listData'],
                    children: [
                        {
                            name: 'Column',
                            children: [
                                {
                                    name: 'Row',
                                    children: [
                                        {
                                            name: 'Image',
                                            children: []
                                        },
                                        {
                                            name: 'Text',
                                            children: []
                                        }
                                    ]
                                },
                                {
                                    name: 'If',
                                    stateValues: ['listData'],
                                    children: [
                                        {
                                            name: 'IfBranch',
                                            children: [
                                                {
                                                    name: 'Divider',
                                                    children: []
                                                }
                                            ]
                                        }
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

export const bindMenuTest_Expect_ViewTree = {
    name: 'Column',
    children: [
        {
            name: 'Text',
            stateValues: ['listData'],
            children: [
                {
                    name: 'If',
                    children: [
                        {
                            name: 'Menu',
                            children: [
                                MenuBuilder_Expect_ViewTree
                            ]
                        }
                    ]
                }
            ]
        }
    ]
};