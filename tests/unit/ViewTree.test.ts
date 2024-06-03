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

import { SceneConfig } from "../../src/Config";
import { assert, describe, it, expect } from "vitest";
import { Scene } from "../../src/Scene";
import path from "path";
import { Decorator } from "../../src/core/base/Decorator";
import { ArkField } from "../../src/core/model/ArkField";

describe("ViewTree Test", () => {
    let config: SceneConfig = new SceneConfig();
    config.buildFromProjectDir(path.join(__dirname, "../../tests/resources/viewtree"));
    let scene = new Scene(config);
    scene.inferTypes();

    it('test if stateValues', async () => {
        let arkFile =  scene.getFiles().find(file => file.getName() == 'ParentComponent.ets');
        let arkClass = arkFile?.getClassWithName('CountDownComponent');
        if (arkClass == null) {
            assert.isNotNull(arkClass);
            return;
        }

        let vt = await arkClass.getViewTree();
        let stateValues = vt.getStateValues();
        expect(stateValues.size).eq(1);
        expect(stateValues.get(arkClass.getFieldWithName('count') as ArkField)?.size).eq(3);
    })

    it('test ForEach stateValues', async () => {
        let arkFile =  scene.getFiles().find(file => file.getName() == 'ControlCenterComponent.ets');
        let arkClass = arkFile?.getClassWithName('ControlCenterComplexToggleLayout');
        if (arkClass == null) {
            assert.isNotNull(arkClass);
            return;
        }
        let vt = await arkClass.getViewTree();
        let type = vt.getClassFieldType('mComplexToggleLayout');
        expect((type as Decorator).getKind()).equals('StorageLink');
        let stateValues = vt.getStateValues();
        expect(stateValues.size).eq(2);
        expect(stateValues.get(arkClass.getFieldWithName('mComplexToggleLayout') as ArkField)?.size).eq(2);
    })

    it('test class.hasEntryDecorator()', async ()=> {
        let arkFile =  scene.getFiles().find(file => file.getName() == 'ParentComponent.ets');
        let arkClass = arkFile?.getClassWithName('ParentComponent');
        if (arkClass == null) {
            assert.isNotNull(arkClass);
            return;
        }
        
        // let isEntry = await arkClass.hasEntryDecorator();
        // expect(isEntry).eq(true);
    })

    it('test __Common__', async () => {
        let arkFile =  scene.getFiles().find(file => file.getName() == 'Common.ets');
        let arkClass = arkFile?.getClassWithName('OutComponent');
        if (arkClass == null) {
            assert.isNotNull(arkClass);
            return;
        }
        let vt = await arkClass.getViewTree();
        vt.buildViewTree();
        
        let root = vt.getRoot();
        expect(root.name).equals('__Common__');
        expect(root.children[0].name).equals('ViewPU');
    })

    it ('test ForEach', async () => {
        let arkFile =  scene.getFiles().find(file => file.getName() == 'ControlCenterComponent.ets');
        let arkClass = arkFile?.getClassWithName('ControlCenterComplexToggleLayout');
        if (arkClass == null) {
            assert.isNotNull(arkClass);
            return;
        }

        let vt = await arkClass.getViewTree();
        let root = vt.getRoot();
        expect(root.name).eq('Grid');
        expect(root.children[0].name).eq('ForEach');
        expect(root.children[0].children[0].name).eq('GridItem');
    })

    it('test @State', async () => {
        let arkFile =  scene.getFiles().find(file => file.getName() == 'ControlCenterComponent.ets');
        let arkClass = arkFile?.getClassWithName('ControlCenterComponent');
        if (arkClass == null) {
            assert.isNotNull(arkClass);
            return;
        }
        let vt = await arkClass.getViewTree();
        vt.buildViewTree();
         
        let type = vt.getClassFieldType('mSimpleToggleColumnCount');
        expect((type as Decorator).getKind()).equals('State');

        let root = vt.getRoot();
        expect(root.name).equals('Column');
        expect(root.children[0].children[0].children[0].children[1].children[0].children[0].children[0].name).equals('Grid');
    })

    it('test If', async () => {
        let arkFile =  scene.getFiles().find(file => file.getName() == 'ParentComponent.ets');
        let arkClass = arkFile?.getClassWithName('ParentComponent');
        if (arkClass == null) {
            assert.isNotNull(arkClass);
            return;
        }
        let vt = await arkClass.getViewTree();
        let type = vt.getClassFieldType('countDownStartValue');

        expect((type as Decorator).getKind()).equals('State'); 

        let root = vt.getRoot();
        expect(root.name).equals('Column');
        expect(root.children[3].children[0].children[0].children[0].name).equals('IfBranch');
    })

    it('test @Builder-function-Decorator', async () => {
        let arkFile =  scene.getFiles().find(file => file.getName() == 'Builder.ets');
        let arkDefaultClass = arkFile?.getDefaultClass();
        let method = arkDefaultClass?.getMethodWithName('childBuilder');
        if (method) {
            let hasBuilder = false;
            for (let decorator of await method.getDecorators()) {
                if (decorator.getKind() == 'Builder') {
                    hasBuilder = true;
                }
            }

            expect(hasBuilder).eq(true);
        }
    })

    it('test @Builder', async () => {
        let arkFile =  scene.getFiles().find(file => file.getName() == 'Builder.ets');
        let arkClass = arkFile?.getClassWithName('Parent');
        if (arkClass == null) {
            assert.isNotNull(arkClass);
            return;
        }

        let arkDefaultClass = arkFile?.getDefaultClass();
        let method = arkDefaultClass?.getMethodWithName('grandsonBuilder');
        if (!method) {
            assert.isNotNull(method);
            return;
        }

        let vt = await method.getViewTree();
        expect(vt.getRoot().name).eq('Row');
        
        vt = await arkClass.getViewTree();
        let root = vt.getRoot();
        let parentBuilder = root.children[0];
        let childBuilder = parentBuilder.children[0].children[0].children[2];
        let grandsonBuilder = childBuilder.children[0].children[0].children[2];
        expect(parentBuilder.name).eq('Builder');
        expect(childBuilder.name).eq('Builder');
        expect(grandsonBuilder.name).eq('Builder');
    })

    it('test @BuilderParam', async () => {
        let arkFile =  scene.getFiles().find(file => file.getName() == 'SwipeLayout.ets');
        let arkClass = arkFile?.getClassWithName('SwipeLayout');
        if (arkClass == null) {
            assert.isNotNull(arkClass);
            return;
        }
        let vt = await arkClass.getViewTree();
        let type = vt.getClassFieldType('__SurfaceComponent');
        expect((type as Decorator).getKind()).equals('BuilderParam');
        let root = vt.getRoot();
        expect(root.children[0].children[0].children[0].name).equals('BuilderParam');
        expect(root.children[0].children[0].children[0].builderParam).equals('SurfaceComponent');
    })
})
