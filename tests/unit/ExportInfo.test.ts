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

import { assert, describe, it } from 'vitest';
import path from 'path';
import { FileSignature, Scene, SceneConfig } from "../../src";

describe("export Test", () => {
    let config: SceneConfig = new SceneConfig();
    config.getSdksObj().push({ moduleName: "", name: "etsSdk", path: path.join(__dirname, "../resources/Sdk") })
    config.getSdksObj().push({ moduleName: "", name: "lottie", path: path.join(__dirname, "../resources/thirdModule") });
    config.buildFromProjectDir(path.join(__dirname, "../resources/exports"));
    let projectScene: Scene = new Scene();
    projectScene.buildSceneFromProjectDir(config);
    projectScene.collectProjectImportInfos();
    projectScene.inferTypes();
    it('debug case', () => {
        const fileId = new FileSignature();
        fileId.setFileName("test.ts");
        fileId.setProjectName(projectScene.getProjectName());
        const file = projectScene.getFile(fileId);
        assert.equal(file?.getExportInfos().length, 2);
        assert.equal(file?.getImportInfos().length, 2);
        const stmts = file?.getDefaultClass().getMethodWithName('cc')?.getCfg()?.getStmts();
        assert.isNotEmpty(stmts);
    })

    it('namespace export case', () => {
        const fileId = new FileSignature();
        fileId.setFileName("test.ts");
        fileId.setProjectName(projectScene.getProjectName());
        const file = projectScene.getFile(fileId);
        const stmts = file?.getDefaultClass().getMethodWithName('cc')?.getCfg()?.getStmts();
        assert.isNotEmpty(stmts);
        if (stmts) {
            assert.equal(stmts[10].toString(), 'staticinvoke <@exports/exportSample.ts: _DEFAULT_ARK_CLASS.write()>()');
        }
    })

    it('supperClass Test case', () => {
        const fileId = new FileSignature();
        fileId.setFileName("exportSample.ts");
        fileId.setProjectName(projectScene.getProjectName());
        assert.isDefined(projectScene.getFile(fileId)?.getClassWithName('d')?.getSuperClass());
    })

    it('import index case', () => {
        const fileId = new FileSignature();
        fileId.setFileName("exportSample.ts");
        fileId.setProjectName(projectScene.getProjectName());
        assert.isNotNull(projectScene.getFile(fileId)?.getImportInfoBy('Constants')?.getLazyExportInfo());
    })

    it('sdk case', () => {
        const fileId = new FileSignature();
        fileId.setFileName("test.ts");
        fileId.setProjectName(projectScene.getProjectName());
        assert.isDefined(projectScene.getFile(fileId)?.getImportInfoBy('hilog')?.getLazyExportInfo());
    })

    it('namespace case', () => {
        const fileId = new FileSignature();
        fileId.setFileName("else.ts");
        fileId.setProjectName(projectScene.getProjectName());
        const stmts = projectScene.getFile(fileId)?.getDefaultClass()
            .getMethodWithName('something')?.getCfg()?.getStmts();
        assert.isNotEmpty(stmts);
        if (stmts) {
            assert.equal(stmts[2].toString(), 'staticinvoke <@etsSdk/api/@ohos.web.webview.d.ts: webview.WebviewController.[static]setWebDebuggingAccess(boolean)>(false)');
            assert.equal(stmts[6].toString(), 'instanceinvoke controller.<@etsSdk/api/@ohos.web.webview.d.ts: webview.WebviewController.loadUrl(string|Resource, Array<WebHeader>)>(\'https://www.example.com/cn\')')
            assert.equal(stmts[7].toString(), 'staticinvoke <@etsSdk/api/@ohos.hilog.d.ts: hilog._DEFAULT_ARK_CLASS.info(number, string, any[])>(0, \'func\', \'%{public}\', \'Ability onCreate\')')
        }
    })

    it('thirdModule case', () => {
        const fileId = new FileSignature();
        fileId.setFileName("Lottie_Report.ets");
        fileId.setProjectName(projectScene.getProjectName());
        const signature = projectScene.getFile(fileId)?.getImportInfoBy('lottie')?.getLazyExportInfo()?.getTypeSignature().toString();
        assert.equal(signature, '@lottie/@ohos/lottie.d.ts: LottiePlayer')
    })

    it('all case', () => {
        projectScene.getMethods().forEach(m => {
            m.getCfg()?.getStmts().forEach(s => {
                const text = s.toString();
                if (text.includes('Unknown')) {
                    console.log(text + ' warning ' + m.getSignature().toString());
                }
            })
        })
    })
})

describe("function Test", () => {
    it('debug case', () => {

        assert.isTrue(/^index/i.test('Index.ets'));
        assert.isTrue(/^index/i.test('index.ets'));
        assert.isTrue(/^index/i.test('INdex.ts'));
    })
})