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

import { assert, describe, expect, it } from 'vitest';
import path from 'path';
import { FileSignature, Local, Scene, SceneConfig } from '../../src';


describe("export Test", () => {
    let config: SceneConfig = new SceneConfig();
    config.getSdksObj().push({ moduleName: "", name: "etsSdk", path: path.join(__dirname, "../resources/Sdk") })
    config.getSdksObj().push({
        moduleName: '',
        name: 'lottie',
        path: path.join(__dirname, '../resources/lottieModule'),
    });
    config.buildFromProjectDir(path.join(__dirname, "../resources/exports"));
    let projectScene: Scene = new Scene();
    projectScene.buildSceneFromProjectDir(config);
    projectScene.inferTypes();
    it('debug case', () => {
        const fileId = new FileSignature(projectScene.getProjectName(), 'test.ts');
        const file = projectScene.getFile(fileId);
        assert.equal(file?.getExportInfos().length, 2);
        assert.equal(file?.getImportInfos().length, 2);
        const stmts = file?.getDefaultClass().getMethodWithName('cc')?.getCfg()?.getStmts();
        assert.isNotEmpty(stmts);
    })

    it('namespace export case', () => {
        const fileId = new FileSignature(projectScene.getProjectName(), 'test.ts');
        const file = projectScene.getFile(fileId);
        const stmts = file?.getDefaultClass().getMethodWithName('cc')?.getCfg()?.getStmts();
        assert.isNotEmpty(stmts);
        if (stmts) {
            assert.equal(stmts[10].toString(), 'staticinvoke <@exports/exportSample.ts: %dflt.write()>()');
            assert.equal(stmts[2].toString(), '%0 = @exports/exportSample.ts: %dflt.[static]z');
            assert.equal(stmts[9].toString(), '%2 = @exports/exportSample.ts: %dflt.[static]MyNameSpace');
        }
    })

    it('supperClass Test case', () => {
        const fileId = new FileSignature(projectScene.getProjectName(), 'exportSample.ts');
        assert.isDefined(projectScene.getFile(fileId)?.getClassWithName('d')?.getSuperClass());
    })

    it('import index case', () => {
        const fileId = new FileSignature(projectScene.getProjectName(), 'exportSample.ts');
        assert.isNotNull(projectScene.getFile(fileId)?.getImportInfoBy('Constants')?.getLazyExportInfo());
    })

    it('sdk case', () => {
        const fileId = new FileSignature(projectScene.getProjectName(), 'test.ts');
        assert.isDefined(projectScene.getFile(fileId)?.getImportInfoBy('hilog')?.getLazyExportInfo());
    })

    it('namespace case', () => {
        const fileId = new FileSignature(projectScene.getProjectName(), 'else.ts');
        const stmts = projectScene.getFile(fileId)?.getDefaultClass()
            .getMethodWithName('something')?.getCfg()?.getStmts();
        assert.isNotEmpty(stmts);
        if (stmts) {
            assert.equal(stmts[2].toString(), 'staticinvoke <@etsSdk/api/@ohos.web.webview.d.ts: webview.WebviewController.[static]setWebDebuggingAccess(boolean)>(false)');
            assert.equal(stmts[6].toString(), 'instanceinvoke controller.<@etsSdk/api/@ohos.web.webview.d.ts: webview.WebviewController.loadUrl(string|Resource, Array<WebHeader>)>(\'\')')
            assert.equal(stmts[7].toString(), 'staticinvoke <@etsSdk/api/@ohos.hilog.d.ts: hilog.%dflt.info(number, string, string, any[])>(0, \'func\', \'%{public}\', \'Ability onCreate\')')
        }
    })

    it('thirdModule case', () => {
        const fileId = new FileSignature(projectScene.getProjectName(), 'Lottie_Report.ets');
        const arkExport = projectScene.getFile(fileId)?.getImportInfoBy('lottie')
            ?.getLazyExportInfo()?.getArkExport();
        assert.isTrue(arkExport instanceof Local);
    });

    it('all case', () => {
        let unknownCount = 0;
        projectScene.getMethods(true).forEach(m => {
            m.getCfg()?.getStmts().forEach(s => {
                const text = s.toString();
                if (text.includes('Unknown')) {
                    unknownCount++;
                    console.debug(text + ' warning ' + m.getSignature().toString());
                }
            })
        })
        expect(unknownCount).lessThanOrEqual(9);
    })
})

describe("function Test", () => {
    it('thirdModule index case', () => {
        let config: SceneConfig = new SceneConfig();
        config.getSdksObj().push({ moduleName: "", name: "etsSdk", path: path.join(__dirname, "../resources/Sdk") })
        config.getSdksObj().push({
            moduleName: "",
            name: "lottie",
            path: path.join(__dirname, "../resources/lottieModule")
        });
        config.buildFromProjectDir(path.join(__dirname, "../resources/exports"));
        let scene: Scene = new Scene();
        scene.buildSceneFromProjectDir(config);
        scene.inferTypes();
        const fileId = new FileSignature(scene.getProjectName(), 'Lottie_Report.ets');
        const signature = scene.getFile(fileId)?.getImportInfoBy('lottie')?.getLazyExportInfo()
            ?.getArkExport()?.toString();
        assert.equal(signature, 'Lottie')
    })
})