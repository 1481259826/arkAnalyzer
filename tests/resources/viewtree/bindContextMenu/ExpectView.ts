export const MenuBuilder_Expect_ViewTree = {
    name: 'Builder',
    children: [
        {
            name: 'Flex',
            children: [
                {
                    name: 'Text',
                    children: []
                },
                {
                    name: 'Divider',
                    children: []
                },
                {
                    name: 'Text',
                    children: []
                }
            ]
        }
    ]
};

export const bindContextMenuTest_Expect_ViewTree = {
    name: 'Column',
    children: [
        {
            name: 'Text',
            children: []
        },
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
};