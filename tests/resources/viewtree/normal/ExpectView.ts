export const SubComponent_Expect_ViewTree: any = {
    name: 'Column',
    children: [
        {
            name: 'Text',
            children: []
        }
    ]
}

export const CommonTest_Expect_ViewTree = {
    name: '__Common__',
    children: [
        {
            name: 'ViewPU',
            children: [
                SubComponent_Expect_ViewTree
            ]
        }
    ]
}

export const ControlCenterComplexToggleLayout_Expect_ViewTree = {
    name: 'Grid',
    children: [
        {
            name: 'ForEach',
            children: [
                {
                    name: 'GridItem',
                    children: [ ]
                }
            ],
            stateValues: ['mComplexToggleLayout']
        }
    ],
    stateValues: ['mComplexToggleLayout', 'style']
}

export const CountDownComponent_Expect_ViewTree = {
    name: 'Column',
    children: [
        {
            name: 'If',
            children: [
                {
                    name: 'IfBranch',
                    children: [
                        {name: 'Text', children: [], stateValues: ['count']}
                    ]
                },
                {
                    name: 'IfBranch',
                    children: [
                        {name: 'Text', children: []}
                    ]
                }
            ],
            stateValues: ['count']
        },
        {
            name: 'Button',
            children: [
                {name: 'Text', children: []}
            ],
            stateValues: ['count']
        }
    ]
}

export const ParentComponent_Expect_ViewTree = {
    name: 'Column',
    children: [
        {
            name: 'Text',
            children: [],
            stateValues: ['countDownStartValue']
        },
        {
            name: 'Button',
            children: [
                {
                    name: 'Text',
                    children: []
                }
            ],
            stateValues: ['countDownStartValue']
        },
        {
            name: 'Button',
            children: [
                {
                    name: 'Text',
                    children: []
                }
            ],
            stateValues: ['countDownStartValue']
        },
        {
            name: 'ViewPU',
            children: [
                CountDownComponent_Expect_ViewTree
            ]
        }

    ]
}

export const ControlCenterSimpleToggleLayout_Expect_ViewTree = {
    name: 'Grid',
    children: [
        {
            name: 'ForEach',
            children: [
                {
                    name: 'GridItem',
                    children: [
                    ]
                }
            ],
            stateValues: ['mSimpleToggleLayout']
        }
    ],
    stateValues: ['mSimpleToggleLayout', 'mColumnCount', 'style']
}

export const ControlCenterComponent_Expect_ViewTree = {
    name: 'Column',
    children: [
        {
            name: 'If',
            children: [
                {
                    name: 'IfBranch',
                    children: [
                        {
                            name: 'Column',
                            children: [
                                {
                                    name: 'Column',
                                    children: [],
                                    stateValues: ['style']
                                },
                                {
                                    name: 'Row',
                                    children: [
                                        {
                                            name: 'Column',
                                            children: [
                                                {
                                                    name: 'ViewPU',
                                                    children: [ControlCenterComplexToggleLayout_Expect_ViewTree]
                                                },
                                                {
                                                    name: 'Column',
                                                    children: [
                                                        {
                                                            name: 'ViewPU',
                                                            children: [ControlCenterSimpleToggleLayout_Expect_ViewTree]
                                                        },
                                                        {
                                                            name: 'Column',
                                                            children: [],
                                                            stateValues: ['style']
                                                        }
                                                    ],
                                                    stateValues: ['style']
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                },
                {
                    name: 'IfBranch',
                    children: [
                        {
                            name: 'Column',
                            children: []
                        }
                    ]
                }
            ],
            stateValues: ['mIsEditSimpleToggleLayout']
        }
    ]
}

export const NotificationItem_Expect_ViewTree = {
    name: 'Column',
    children: [
        
    ]
}