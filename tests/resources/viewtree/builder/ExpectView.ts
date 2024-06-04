
export const HelloComponent_Expect_ViewTree = {
    name: 'Row',
    children: [
        {
            name: 'Text',
            children: [],
            stateValues: ['message']
        }
    ]
}

export const HelloChildComponent_Expect_ViewTree = {
    name: 'Row',
    children: [
        {
            name: 'Text',
            children: [],
            stateValues: ['message']
        }
    ]
}

export const HelloGrandsonComponent_Expect_ViewTree = {
    name: 'Row',
    children: [
        {
            name: 'Text',
            children: [],
            stateValues: ['message']
        }
    ]
}

export const GrandsonBuilder_Expect_ViewTree = {
    name: 'Row',
    children: [
        {
            name: 'Column',
            children: [
                {
                    name: 'Text', children: []
                },
                {
                    name: 'View',
                    children: [
                        HelloGrandsonComponent_Expect_ViewTree
                    ]
                }
            ]
        }
    ]
}

export const ChildBuilder_Expect_ViewTree = {
    name: 'Row',
    children: [
        {
            name: 'Column',
            children: [
                {
                    name: 'Text',
                    children: []
                },
                {
                    name: 'View',
                    children: [HelloChildComponent_Expect_ViewTree]
                },
                {
                    name: 'Builder',
                    children: [
                        GrandsonBuilder_Expect_ViewTree
                    ]
                }
            ]
        }
    ]
}

export const ParentBuilder_Expect_ViewTree = {
    name: 'Row',
    children: [
        {
            name: 'Column',
            children: [
                {
                    name: 'Text',
                    children: []
                },
                {
                    name: 'View',
                    children: [HelloComponent_Expect_ViewTree]
                },
                {
                    name: 'Builder',
                    children: [
                        ChildBuilder_Expect_ViewTree
                    ]
                }
            ]
        }
    ]
}

export const BuilderTest_Expect_ViewTree = {
    name: 'Column',
    children: [
        {
            name: 'Builder',
            children: [
                ParentBuilder_Expect_ViewTree
            ]
        },
        {
            name: 'Button',
            children: [],
            stateValues: ['label']
        }
    ]
}

export const Case1_OverBuilder_Expect_ViewTree = {
    name: 'Row',
    children: [
        {
            name: 'Text',
            children: []
        }
    ]
}

export const Case1_BuilderTest_Expect_ViewTree = {
    name: 'Column',
    children: [
        {
            name: 'Builder',
            children: [Case1_OverBuilder_Expect_ViewTree]
        },
        {
            name: 'Button',
            children: [],
            stateValues: ['label']
        }
    ]
}

export const Case2_HelloComponent_Expect_ViewTree = {
    name: 'Row',
    children: [
        {
            name: 'Text',
            children: [],
            stateValues: ['message']
        }
    ]
}

export const Case2_OverBuilder_Expect_ViewTree = {
    name: 'Row',
    children: [
        {
            name: 'Text',
            children: []
        },
        {
            name: 'View',
            children: [Case2_HelloComponent_Expect_ViewTree]
        }
    ]
}

export const Case2_BuilderTest_Expect_ViewTree = {
    name: 'Column',
    children: [
        {
            name: 'Builder',
            children: [Case2_OverBuilder_Expect_ViewTree]
        },
        {
            name: 'Button',
            children: [],
            stateValues: ['label']
        }
    ]
}

export const Case3_OverBuilder_Expect_ViewTree = {
    name: 'Row',
    children: [
        {
            name: 'Text',
            children: []
        }
    ]
}

export const Case3_BuilderTest_Expect_ViewTree = {
    name: 'Column',
    children: [
        {
            name: 'Builder',
            children: [Case3_OverBuilder_Expect_ViewTree]
        }
    ]
}