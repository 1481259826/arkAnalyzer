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
import {
    AliasType,
    AliasTypeDeclaration,
    DEFAULT_ARK_CLASS_NAME,
    DEFAULT_ARK_METHOD_NAME,
    FileSignature,
    Scene,
    SceneConfig
} from '../../src';
import {
    AliasTypeOfBoolean,
    AliasTypeOfClassA,
    AliasTypeOfClassB,
    AliasTypeOfNumberA,
    AliasTypeOfString,
} from '../resources/type/expectedIR';

function buildScene(): Scene {
    let config: SceneConfig = new SceneConfig();
    config.buildFromProjectDir(path.join(__dirname, '../resources/type'));
    let projectScene: Scene = new Scene();
    projectScene.buildSceneFromProjectDir(config);
    projectScene.inferTypes();
    return projectScene;
}

let projectScene = buildScene();

function compareTypeAlias(alias: [AliasType, AliasTypeDeclaration] | undefined, expectIR: any): void {
    assert.isDefined(alias);
    const aliasType = (alias as [AliasType, AliasTypeDeclaration])[0];
    assert.isDefined(aliasType);
    assert.equal(aliasType!.getOriginalType().toString(), expectIR.aliasType.originalType);
    assert.equal(aliasType!.getName(), expectIR.aliasType.name);
    assert.equal(aliasType!.getSignature().toString(), expectIR.aliasType.signature);

    const aliasTypeDeclaration = (alias as [AliasType, AliasTypeDeclaration])[1];
    assert.isDefined(aliasTypeDeclaration);
    assert.equal(aliasTypeDeclaration!.getSourceCode(), expectIR.aliasTypeDeclaration.sourceCode);
    assert.equal(aliasTypeDeclaration!.getPosition().getLineNo(), expectIR.aliasTypeDeclaration.position.line);
    assert.equal(aliasTypeDeclaration!.getPosition().getColNo(), expectIR.aliasTypeDeclaration.position.column);
}

describe('Alias Type With Import Test', () => {
    const fileId = new FileSignature(projectScene.getProjectName(), 'test.ts');
    const aliasTypeMap = projectScene.getFile(fileId)?.getDefaultClass()
        .getDefaultArkMethod()?.getBody()?.getAliasTypeMap();

    it('alias type of exported class', () => {
        const alias = aliasTypeMap?.get('ClassAType');
        assert.isDefined(alias);
        compareTypeAlias(alias, AliasTypeOfClassA);
    });

    it('alias type of default exported class', () => {
        const alias = aliasTypeMap?.get('ClassBType');
        assert.isDefined(alias);
        compareTypeAlias(alias, AliasTypeOfClassB);
    });

    it('alias type of exported alias type', () => {
        const alias = aliasTypeMap?.get('numberAType');
        assert.isDefined(alias);
        compareTypeAlias(alias, AliasTypeOfNumberA);
    });
});

describe('Alias Type Test', () => {
    const fileId = new FileSignature(projectScene.getProjectName(), 'test.ts');
    const aliasTypeMap = projectScene.getFile(fileId)?.getDefaultClass()
        .getDefaultArkMethod()?.getBody()?.getAliasTypeMap();

    it('alias type of boolean', () => {
        const alias = aliasTypeMap?.get('BooleanAliasType');
        assert.isDefined(alias);
        compareTypeAlias(alias, AliasTypeOfBoolean);
    });

    it('export alias type of boolean', () => {
        const alias = aliasTypeMap?.get('StringAliasType');
        assert.isDefined(alias);
        compareTypeAlias(alias, AliasTypeOfString);
    });
});

describe('Using Alias Type in Method Test', () => {
    const fileId = new FileSignature(projectScene.getProjectName(), 'test.ts');

    it('alias type in params case', () => {
        const method = projectScene.getFile(fileId)?.getDefaultClass().getMethodWithName('useAliasTypeInParam');
        assert.isDefined(method);
        assert.isNotNull(method);
        const params = method!.getSubSignature().getParameters();
        assert.equal(params.length, 1);
        const param = params[0].getType();
        const typePrefix = `@type/test.ts: ${DEFAULT_ARK_CLASS_NAME}.[static]${DEFAULT_ARK_METHOD_NAME}()`;
        assert.equal(param.toString(), `${typePrefix}#BooleanAliasType[]|${typePrefix}#StringAliasType`);
    });

    it('alias type in body case', () => {
        const method = projectScene.getFile(fileId)?.getDefaultClass().getMethodWithName('useAliasTypeInBody');
        assert.isDefined(method);
        assert.isNotNull(method);
        const localA = method!.getBody()?.getLocals().get('a');
        assert.isDefined(localA);
        const localAType = localA!.getType().toString();
        assert.equal(localAType, `@type/test.ts: ${DEFAULT_ARK_CLASS_NAME}.[static]${DEFAULT_ARK_METHOD_NAME}()#numberAType[]`);
    });
});