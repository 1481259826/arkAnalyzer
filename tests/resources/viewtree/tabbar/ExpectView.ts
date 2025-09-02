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