export const TabBuilder_Expect_ViewTree = {
    name: 'Builder',
    stateValues: ['selectIndex'],
    children: [
        {
            name: 'Column',
            children: [
                {
                    name: 'Text',
                    children: []
                }
            ]
        }
    ]
};

export const TabBar_Expect_ViewTree = {
    name: 'TabBar',
    children: [TabBuilder_Expect_ViewTree]
};

export const TabContent_Expect_ViewTree = {
    name: 'TabContent',
    stateValues: ['selectIndex'],
    children: [
        {
            name: 'Text',
            children: []
        },TabBar_Expect_ViewTree,
    ]
};
export const TabbarTest_Expect_ViewTree = {
    name: 'Column',
    children: [
        {
            name: 'Tabs',
            stateValues: ['selectIndex'],
            children: [
                // 首页
                TabBuilder_Expect_ViewTree,
                TabContent_Expect_ViewTree,
                // 发现
                TabBuilder_Expect_ViewTree,
                TabContent_Expect_ViewTree,
                // 推荐
                TabBuilder_Expect_ViewTree,
                TabContent_Expect_ViewTree,
                // 我的
                TabBuilder_Expect_ViewTree,
                TabContent_Expect_ViewTree
            ]
        },
        // 额外的 Builder（tabBuilder('首页', this.selectIndex)）
        TabBuilder_Expect_ViewTree
    ]
};