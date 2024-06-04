export const CustomContainer_Expect_ViewTree = {
    name: 'Column',
    children: [
        {
            name: 'Text',
            children: [],
            stateValues: ['header']
        },
        {
            name: 'BuilderParam',
            children: [],
            builderParam: 'closer'
        }
    ]
}

export const SpecificParam_Expect_ViewTree = {
    name: 'Column',
    children: [
        {
            name: 'Text', children: []
        },
        {
            name: 'Text', children: []
        }
    ]
}

export const BuilderParamTest_Expect_ViewTree = {
    name: 'Column',
    children: [
        {
            name: 'View',
            children: [
                {
                    name: 'Column',
                    children: [
                        {
                            name: 'Text',
                            children: [],
                            stateValues: ['header']
                        },
                        {
                            name: 'Column',
                            children: [
                                {
                                    name: 'Builder',
                                    children: [SpecificParam_Expect_ViewTree]
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ]
}

export const Case1_BuilderParamTest_Expect_ViewTree = {
    name: 'Column',
    children: [
        {
            name: 'View',
            children: [
                {
                    name: 'Column',
                    children: [
                        {
                            name: 'Builder',
                            children: [
                                {
                                    name: 'Text',
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

export const Case2_BuilderParamTest_Expect_ViewTree = {
    name: 'Column',
    children: [
        {
            name: 'Builder',
            children: [
                {
                    name: 'Text', children: []
                }
            ]
        },
        {
            name: 'View',
            children: [
                {
                    name: 'Column',
                    children: [
                        {
                            name: 'Builder',
                            children: [
                                {
                                    name: 'Text',
                                    children: []
                                }
                            ]
                        },
                        {
                            name: 'Builder',
                            children: [
                                {
                                    name: 'Text',
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

export const Case3_BuilderParamTest_Expect_ViewTree = {
    name: 'Column',
    children: [
        {
            name: 'Builder',
            children: [
                {
                    name: 'Text', children: []
                }
            ]
        },
        {
            name: 'View',
            children: [
                {
                    name: 'Column',
                    children: [
                        {
                            name: 'Builder',
                            children: [
                                {
                                    name: 'Text',
                                    children: []
                                }
                            ]
                        },
                        {
                            name: 'Builder',
                            children: [
                                {
                                    name: 'Text',
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