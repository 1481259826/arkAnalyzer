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
    FileSignature,
    Scene,
    SceneConfig,
    Stmt,
} from '../../src';
import {
    AliasLocalType,
    AliasOriginalType,
    AliasTypeMultiRef,
    AliasTypeMultiRefStmts,
    AliasTypeOf,
    AliasTypeOfBoolean,
    AliasTypeOfClassA,
    AliasTypeOfClassAStmts,
    AliasTypeOfClassB,
    AliasTypeOfClassBStmts,
    AliasTypeOfMultiImport,
    AliasTypeOfMultiImportStmts,
    AliasTypeOfMultiRef,
    AliasTypeOfMultiRefStmts,
    AliasTypeOfNumberA,
    AliasTypeOfNumberAStmts,
    AliasTypeOfRef,
    AliasTypeOfRefStmts,
    AliasTypeOfStmts,
    AliasTypeOfString,
    AliasTypeRef,
    AliasTypeRefStmts,
} from '../resources/type/expectedIR';

function buildScene(): Scene {
    let config: SceneConfig = new SceneConfig();
    config.buildFromProjectDir(path.join(__dirname, '../resources/type'));
    let projectScene: Scene = new Scene();
    projectScene.buildSceneFromProjectDir(config);
    return projectScene;
}

function compareTypeAlias(alias: [AliasType, AliasTypeDeclaration] | undefined, expectIR: any): void {
    assert.isDefined(alias);
    const aliasType = (alias as [AliasType, AliasTypeDeclaration])[0];
    assert.isDefined(aliasType);
    assert.equal(aliasType!.getOriginalType().toString(), expectIR.aliasType.originalType);
    assert.equal(aliasType!.getName(), expectIR.aliasType.name);
    assert.equal(aliasType!.getModifiers(), expectIR.aliasType.modifiers);
    assert.equal(aliasType!.getSignature().toString(), expectIR.aliasType.signature);

    const aliasTypeDeclaration = (alias as [AliasType, AliasTypeDeclaration])[1];
    assert.isDefined(aliasTypeDeclaration);
    assert.equal(aliasTypeDeclaration!.getSourceCode(), expectIR.aliasTypeDeclaration.sourceCode);
    assert.equal(aliasTypeDeclaration!.getPosition().getLineNo(), expectIR.aliasTypeDeclaration.position.line);
    assert.equal(aliasTypeDeclaration!.getPosition().getColNo(), expectIR.aliasTypeDeclaration.position.column);
}

function compareTypeAliasStmts(stmts: Stmt[], expectIR: any): void {
    for (let i = 0; i < stmts.length; i++) {
        assert.equal(stmts[i].toString(), expectIR[i].toString);
        assert.equal(stmts[i].getOriginPositionInfo().getLineNo(), expectIR[i].line);
        assert.equal(stmts[i].getOriginPositionInfo().getColNo(), expectIR[i].column);

        if (expectIR[i].operandColumns === undefined) {
            continue;
        }
        let j = 0;
        let opPosition = stmts[i].getOperandOriginalPosition(j);
        while (opPosition !== null && opPosition !== undefined) {
            const cols = [opPosition.getFirstCol(), opPosition.getLastCol()];
            assert.equal(cols[0], expectIR[i].operandColumns[j][0]);
            assert.equal(cols[1], expectIR[i].operandColumns[j][1]);
            j++;
            opPosition = stmts[i].getOperandOriginalPosition(j);
        }
        assert.isUndefined(expectIR[i].operandColumns[j]);
    }
    assert.isUndefined(expectIR[stmts.length]);
}

describe('Simple Alias Type Test', () => {
    let projectScene = buildScene();
    const fileId = new FileSignature(projectScene.getProjectName(), 'test.ts');
    const aliasTypeMap = projectScene.getFile(fileId)?.getDefaultClass()
        .getMethodWithName('simpleAliasType')?.getBody()?.getAliasTypeMap();
    const stmts = projectScene.getFile(fileId)?.getDefaultClass().getMethodWithName('simpleAliasType')?.getBody()?.getCfg().getStmts();

    it('alias type of boolean', () => {
        const alias = aliasTypeMap?.get('BooleanAliasType');
        assert.isDefined(alias);
        compareTypeAlias(alias, AliasTypeOfBoolean);

        assert.isDefined(stmts);
        assert.equal(stmts!.length, 2);
    });

    it('alias type of string', () => {
        const alias = aliasTypeMap?.get('StringAliasType');
        assert.isDefined(alias);
        compareTypeAlias(alias, AliasTypeOfString);

        assert.isDefined(stmts);
        assert.isDefined(stmts);
        assert.equal(stmts!.length, 2);
    });
});

describe('Alias Type With Import Test', () => {
    let projectScene = buildScene();
    const fileId = new FileSignature(projectScene.getProjectName(), 'test.ts');
    const aliasTypeMap = projectScene.getFile(fileId)?.getDefaultClass()
        .getMethodWithName('aliasTypeWithImport')?.getBody()?.getAliasTypeMap();
    const stmts = projectScene.getFile(fileId)?.getDefaultClass().getMethodWithName('aliasTypeWithImport')?.getBody()?.getCfg().getStmts();

    it('alias type of exported class', () => {
        const alias = aliasTypeMap?.get('ClassAType');
        assert.isDefined(alias);
        compareTypeAlias(alias, AliasTypeOfClassA);

        assert.isDefined(stmts);
        assert.isTrue(stmts!.length > 3);
        const relatedStmts = stmts!.slice(1, 3);
        compareTypeAliasStmts(relatedStmts, AliasTypeOfClassAStmts);
    });

    it('alias type of default exported class', () => {
        const alias = aliasTypeMap?.get('ClassBType');
        assert.isDefined(alias);
        compareTypeAlias(alias, AliasTypeOfClassB);

        assert.isDefined(stmts);
        assert.isTrue(stmts!.length > 5);
        const relatedStmts = stmts!.slice(3, 5);
        compareTypeAliasStmts(relatedStmts, AliasTypeOfClassBStmts);
    });

    it('alias type of exported number type', () => {
        const alias = aliasTypeMap?.get('NumberAType');
        assert.isDefined(alias);
        compareTypeAlias(alias, AliasTypeOfNumberA);

        assert.isDefined(stmts);
        assert.isTrue(stmts!.length > 7);
        const relatedStmts = stmts!.slice(5, 7);
        compareTypeAliasStmts(relatedStmts, AliasTypeOfNumberAStmts);
    });

    it('alias type of typeof import', () => {
        const alias = aliasTypeMap?.get('typeOfType');
        assert.isDefined(alias);
        compareTypeAlias(alias, AliasTypeOf);

        assert.isDefined(stmts);
        assert.isTrue(stmts!.length > 9);
        const relatedStmts = stmts!.slice(7, 9);
        compareTypeAliasStmts(relatedStmts, AliasTypeOfStmts);
    });

    it('alias type of multiple import path', () => {
        const alias = aliasTypeMap?.get('MultiImportType');
        assert.isDefined(alias);
        compareTypeAlias(alias, AliasTypeOfMultiImport);

        assert.isDefined(stmts);
        assert.isTrue(stmts!.length > 13);
        const relatedStmts = stmts!.slice(9,13);
        compareTypeAliasStmts(relatedStmts, AliasTypeOfMultiImportStmts);
    });
});

describe('Alias Type With TypeOf Test', () => {
    let projectScene = buildScene();
    const fileId = new FileSignature(projectScene.getProjectName(), 'test.ts');
    const aliasTypeMap = projectScene.getFile(fileId)?.getDefaultClass()
        .getMethodWithName('aliasTypeWithTypeOf')?.getBody()?.getAliasTypeMap();
    const stmts = projectScene.getFile(fileId)?.getDefaultClass().getMethodWithName('aliasTypeWithTypeOf')?.getBody()?.getCfg().getStmts();

    it('alias type of reference', () => {
        const alias = aliasTypeMap?.get('ReferTypeOf');
        assert.isDefined(alias);
        compareTypeAlias(alias, AliasTypeOfRef);

        assert.isDefined(stmts);
        assert.isTrue(stmts!.length > 2);
        const relatedStmts = stmts!.slice(1, 2);
        compareTypeAliasStmts(relatedStmts, AliasTypeOfRefStmts);
    });

    it('alias type of multiple reference', () => {
        const alias = aliasTypeMap?.get('MultiReferTypeOf');
        assert.isDefined(alias);
        compareTypeAlias(alias, AliasTypeOfMultiRef);

        assert.isDefined(stmts);
        assert.isTrue(stmts!.length > 5);
        const relatedStmts = stmts!.slice(2, 5);
        compareTypeAliasStmts(relatedStmts, AliasTypeOfMultiRefStmts);
    });
});

describe('Alias Type With Reference Test', () => {
    let projectScene = buildScene();
    const fileId = new FileSignature(projectScene.getProjectName(), 'test.ts');
    const aliasTypeMap = projectScene.getFile(fileId)?.getDefaultClass()
        .getMethodWithName('aliasTypeWithReference')?.getBody()?.getAliasTypeMap();
    const stmts = projectScene.getFile(fileId)?.getDefaultClass().getMethodWithName('aliasTypeWithReference')?.getBody()?.getCfg().getStmts();

    it('alias type', () => {
        const alias = aliasTypeMap?.get('ReferType');
        assert.isDefined(alias);
        compareTypeAlias(alias, AliasTypeRef);

        assert.isDefined(stmts);
        assert.isTrue(stmts!.length > 2);
        const relatedStmts = stmts!.slice(1, 2);
        compareTypeAliasStmts(relatedStmts, AliasTypeRefStmts);
    });

    it('alias type of multiple reference', () => {
        const alias = aliasTypeMap?.get('MultiReferType');
        assert.isDefined(alias);
        compareTypeAlias(alias, AliasTypeMultiRef);

        assert.isDefined(stmts);
        assert.isTrue(stmts!.length > 4);
        const relatedStmts = stmts!.slice(2, 4);
        compareTypeAliasStmts(relatedStmts, AliasTypeMultiRefStmts);
    });
});

describe('Using Alias Type in Method Test', () => {
    let projectScene = buildScene();
    projectScene.inferTypes();
    const fileId = new FileSignature(projectScene.getProjectName(), 'test.ts');

    it('alias type in params case', () => {
        const method = projectScene.getFile(fileId)?.getDefaultClass().getMethodWithName('%useAliasTypeInParam$simpleAliasType');
        assert.isDefined(method);
        assert.isNotNull(method);
        const params = method!.getSubSignature().getParameters();
        assert.equal(params.length, 1);
        assert.equal(params[0].getType().toString(), 'BooleanAliasType[]|StringAliasType');
    });

    it('alias type in body case', () => {
        const method = projectScene.getFile(fileId)?.getDefaultClass().getMethodWithName('%useAliasTypeInBody$aliasTypeWithImport');
        assert.isDefined(method);
        assert.isNotNull(method);
        const localA = method!.getBody()?.getLocals().get('a');
        assert.isDefined(localA);
        assert.equal(localA!.getType().toString(), 'number[]');
    });
});

describe('Original Type After Type Infer', () => {
    let projectScene = buildScene();
    projectScene.inferTypes();
    const fileId = new FileSignature(projectScene.getProjectName(), 'test.ts');

    it('simple alias type', () => {
        const aliasTypeMap = projectScene.getFile(fileId)?.getDefaultClass()
            .getMethodWithName('simpleAliasType')?.getBody()?.getAliasTypeMap();

        const booleanAliasType = aliasTypeMap?.get('BooleanAliasType')
        assert.isDefined(booleanAliasType);
        assert.equal(booleanAliasType![0].getOriginalType().toString(), AliasOriginalType.BooleanAliasType);

        const stringAliasType = aliasTypeMap?.get('StringAliasType')
        assert.isDefined(stringAliasType);
        assert.equal(stringAliasType![0].getOriginalType().toString(), AliasOriginalType.StringAliasType);
    });

    it('alias type with import', () => {
        const aliasTypeMap = projectScene.getFile(fileId)?.getDefaultClass()
            .getMethodWithName('aliasTypeWithImport')?.getBody()?.getAliasTypeMap();

        const classAType = aliasTypeMap?.get('ClassAType')
        assert.isDefined(classAType);
        assert.equal(classAType![0].getOriginalType().toString(), AliasOriginalType.ClassAType);

        const classBType = aliasTypeMap?.get('ClassBType')
        assert.isDefined(classBType);
        assert.equal(classBType![0].getOriginalType().toString(), AliasOriginalType.ClassBType);

        const numberAType = aliasTypeMap?.get('NumberAType')
        assert.isDefined(numberAType);
        assert.equal(numberAType![0].getOriginalType().toString(), AliasOriginalType.NumberAType);

        const typeOfType = aliasTypeMap?.get('typeOfType')
        assert.isDefined(typeOfType);
        assert.equal(typeOfType![0].getOriginalType().toString(), AliasOriginalType.typeOfType);

        const multiImportType = aliasTypeMap?.get('MultiImportType')
        assert.isDefined(multiImportType);
        assert.equal(multiImportType![0].getOriginalType().toString(), AliasOriginalType.MultiImportType);
    });

    it('alias type with typeof', () => {
        const aliasTypeMap = projectScene.getFile(fileId)?.getDefaultClass()
            .getMethodWithName('aliasTypeWithTypeOf')?.getBody()?.getAliasTypeMap();

        const referTypeOf = aliasTypeMap?.get('ReferTypeOf')
        assert.isDefined(referTypeOf);
        assert.equal(referTypeOf![0].getOriginalType().toString(), AliasOriginalType.ReferTypeOf);

        const multiReferTypeOf = aliasTypeMap?.get('MultiReferTypeOf')
        assert.isDefined(multiReferTypeOf);
        assert.equal(multiReferTypeOf![0].getOriginalType().toString(), AliasOriginalType.MultiReferTypeOf);
    });

    it('alias type with reference', () => {
        const aliasTypeMap = projectScene.getFile(fileId)?.getDefaultClass()
            .getMethodWithName('aliasTypeWithReference')?.getBody()?.getAliasTypeMap();

        const referType = aliasTypeMap?.get('ReferType')
        assert.isDefined(referType);
        assert.equal(referType![0].getOriginalType().toString(), AliasOriginalType.ReferType);

        const multiReferType = aliasTypeMap?.get('MultiReferType')
        assert.isDefined(multiReferType);
        assert.equal(multiReferType![0].getOriginalType().toString(), AliasOriginalType.MultiReferType);
    });
});

describe('Local Type After Type Inference', () => {
    let projectScene = buildScene();
    projectScene.inferTypes();
    const fileId = new FileSignature(projectScene.getProjectName(), 'test.ts');

    it('simple alias type', () => {
        const locals = projectScene.getFile(fileId)?.getDefaultClass()
            .getMethodWithName('simpleAliasType')?.getBody()?.getLocals();
        assert.isDefined(locals);
        assert.equal(locals!.size, 1);
    });

    it('alias type with import', () => {
        const locals = projectScene.getFile(fileId)?.getDefaultClass()
            .getMethodWithName('aliasTypeWithImport')?.getBody()?.getLocals();

        const classAType = locals?.get('ClassAType')
        assert.isDefined(classAType);
        assert.equal(classAType!.getType().toString(), AliasLocalType.ClassAType);

        const classBType = locals?.get('ClassBType')
        assert.isDefined(classBType);
        assert.equal(classBType!.getType().toString(), AliasLocalType.ClassBType);

        const numberAType = locals?.get('NumberAType')
        assert.isDefined(numberAType);
        assert.equal(numberAType!.getType().toString(), AliasLocalType.NumberAType);

        const typeOfType = locals?.get('typeOfType')
        assert.isDefined(typeOfType);
        assert.equal(typeOfType!.getType().toString(), AliasLocalType.typeOfType);

        const multiImportType = locals?.get('MultiImportType')
        assert.isDefined(multiImportType);
        assert.equal(multiImportType!.getType().toString(), AliasLocalType.MultiImportType);
    });

    it('alias type with typeof', () => {
        const locals = projectScene.getFile(fileId)?.getDefaultClass()
            .getMethodWithName('aliasTypeWithTypeOf')?.getBody()?.getLocals();

        const referTypeOf = locals?.get('ReferTypeOf')
        assert.isDefined(referTypeOf);
        assert.equal(referTypeOf!.getType().toString(), AliasLocalType.ReferTypeOf);

        const multiReferTypeOf = locals?.get('MultiReferTypeOf')
        assert.isDefined(multiReferTypeOf);
        assert.equal(multiReferTypeOf!.getType().toString(), AliasLocalType.MultiReferTypeOf);
    });

    it('alias type with reference', () => {
        const locals = projectScene.getFile(fileId)?.getDefaultClass()
            .getMethodWithName('aliasTypeWithReference')?.getBody()?.getLocals();

        const referType = locals?.get('ReferType')
        assert.isDefined(referType);
        assert.equal(referType!.getType().toString(), AliasLocalType.ReferType);

        const multiReferType = locals?.get('MultiReferType')
        assert.isDefined(multiReferType);
        assert.equal(multiReferType!.getType().toString(), AliasLocalType.MultiReferType);
    });
});