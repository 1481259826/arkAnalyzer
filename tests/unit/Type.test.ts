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
    AbstractExpr,
    AliasType,
    AliasTypeDeclaration,
    ArkAliasTypeDefineStmt,
    FileSignature,
    Scene,
    SceneConfig,
    Stmt,
} from '../../src';
import {
    AliasTypeMultiRef,
    AliasTypeOfBoolean,
    AliasTypeOfClassA,
    AliasTypeOfClassB, AliasTypeOfLiteralType,
    AliasTypeOfMultiQualifier,
    AliasTypeOfMultiTypeQuery,
    AliasTypeOfNumberA, AliasTypeOfQueryOfLiteralType,
    AliasTypeOfSingleTypeQuery,
    AliasTypeOfString,
    AliasTypeRef,
} from '../resources/type/expectedIR';

function buildScene(): Scene {
    let config: SceneConfig = new SceneConfig();
    config.buildFromProjectDir(path.join(__dirname, '../resources/type'));
    let projectScene: Scene = new Scene();
    projectScene.buildSceneFromProjectDir(config);
    projectScene.inferTypes();
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
    assert.equal(stmts.length, expectIR.length);
    for (let i = 0; i < stmts.length; i++) {
        if (expectIR[i].instanceof !== undefined) {
            assert.isTrue(stmts[i] instanceof expectIR[i].instanceof);
        }
        if (expectIR[i].typeAliasExpr !== undefined && stmts[i] instanceof ArkAliasTypeDefineStmt) {
            compareTypeAliasExpr((stmts[i] as ArkAliasTypeDefineStmt).getAliasTypeExpr(), expectIR[i].typeAliasExpr);
        }
        assert.equal(stmts[i].toString(), expectIR[i].toString);
        assert.equal(stmts[i].getOriginPositionInfo().getLineNo(), expectIR[i].line);
        assert.equal(stmts[i].getOriginPositionInfo().getColNo(), expectIR[i].column);

        if (expectIR[i].operandColumns === undefined) {
            continue;
        }
        for (let j = 0; j < expectIR[i].operandColumns.length; j++) {
            const expectedOpPosition = expectIR[i].operandColumns[j];
            const opPosition = stmts[i].getOperandOriginalPosition(j);
            assert.isNotNull(opPosition);
            const cols = [opPosition!.getFirstCol(), opPosition!.getLastCol()];
            assert.equal(cols[0], expectedOpPosition[0]);
            assert.equal(cols[1], expectedOpPosition[1]);
        }
    }
}

function compareTypeAliasExpr(expr: AbstractExpr, expectedExpr: any): void {
    if (expectedExpr.instanceof !== undefined) {
        assert.isTrue(expr instanceof expectedExpr.instanceof);
    }
    assert.equal(expr.toString(), expectedExpr.toString);
}

let projectScene = buildScene();
const fileId = new FileSignature(projectScene.getProjectName(), 'test.ts');

describe('Simple Alias Type Test', () => {
    const method = projectScene.getFile(fileId)?.getDefaultClass().getMethodWithName('simpleAliasType');
    const aliasTypeMap = method?.getBody()?.getAliasTypeMap();
    const stmts = method?.getBody()?.getCfg().getStmts();

    it('alias type of boolean', () => {
        const alias = aliasTypeMap?.get('BooleanAliasType');
        assert.isDefined(alias);
        if (AliasTypeOfBoolean.alias !== undefined) {
            compareTypeAlias(alias, AliasTypeOfBoolean.alias);
        }

        if (AliasTypeOfBoolean.stmts !== undefined) {
            assert.isDefined(stmts);
            const relatedStmts = stmts!.slice(1, 2);
            compareTypeAliasStmts(relatedStmts, AliasTypeOfBoolean.stmts);
        }
    });

    it('alias type of string', () => {
        const alias = aliasTypeMap?.get('StringAliasType');
        assert.isDefined(alias);
        if (AliasTypeOfString.alias !== undefined) {
            compareTypeAlias(alias, AliasTypeOfString.alias);
        }

        if (AliasTypeOfString.stmts !== undefined) {
            assert.isDefined(stmts);
            const relatedStmts = stmts!.slice(2, 3);
            compareTypeAliasStmts(relatedStmts, AliasTypeOfString.stmts);
        }
    });

    it('alias type using in params', () => {
        const method = projectScene.getFile(fileId)?.getDefaultClass().getMethodWithName('%useAliasTypeInParam$simpleAliasType');
        assert.isDefined(method);
        assert.isNotNull(method);
        const params = method!.getSubSignature().getParameters();
        assert.equal(params.length, 1);
        const booleanAliasType = '@type/test.ts: %dflt.simpleAliasType()#BooleanAliasType';
        const stringAliasType = '@type/test.ts: %dflt.simpleAliasType()#StringAliasType';
        assert.equal(params[0].getType().toString(), `${booleanAliasType}[]|${stringAliasType}`);
    });

    it('type alias should not in locals', () => {
        const locals = method?.getBody()?.getLocals();
        assert.isDefined(locals);
        assert.equal(locals!.size, 1);
    });
});

describe('Alias Type With Import Test', () => {
    const method = projectScene.getFile(fileId)?.getDefaultClass().getMethodWithName('aliasTypeWithImport');
    const aliasTypeMap = method?.getBody()?.getAliasTypeMap();
    const stmts = method?.getBody()?.getCfg().getStmts();

    it('alias type of exported class', () => {
        const alias = aliasTypeMap?.get('ClassAType');
        assert.isDefined(alias);
        if (AliasTypeOfClassA.alias !== undefined) {
            compareTypeAlias(alias, AliasTypeOfClassA.alias);
        }

        if (AliasTypeOfClassA.stmts !== undefined) {
            assert.isDefined(stmts);
            const relatedStmts = stmts!.slice(1, 2);
            compareTypeAliasStmts(relatedStmts, AliasTypeOfClassA.stmts);
        }
    });

    it('alias type of default exported class', () => {
        const alias = aliasTypeMap?.get('ClassBType');
        assert.isDefined(alias);
        if (AliasTypeOfClassB.alias !== undefined) {
            compareTypeAlias(alias, AliasTypeOfClassB.alias);
        }

        if (AliasTypeOfClassB.stmts !== undefined) {
            assert.isDefined(stmts);
            const relatedStmts = stmts!.slice(2, 3);
            compareTypeAliasStmts(relatedStmts, AliasTypeOfClassB.stmts);
        }
    });

    it('alias type of exported number type', () => {
        const alias = aliasTypeMap?.get('NumberAType');
        assert.isDefined(alias);
        if (AliasTypeOfNumberA.alias !== undefined) {
            compareTypeAlias(alias, AliasTypeOfNumberA.alias);
        }

        if (AliasTypeOfNumberA.stmts !== undefined) {
            assert.isDefined(stmts);
            const relatedStmts = stmts!.slice(3, 4);
            compareTypeAliasStmts(relatedStmts, AliasTypeOfNumberA.stmts);
        }
    });

    it('alias type of multiple qualifier', () => {
        const alias = aliasTypeMap?.get('MultiQualifierType');
        assert.isDefined(alias);
        if (AliasTypeOfMultiQualifier.alias !== undefined) {
            compareTypeAlias(alias, AliasTypeOfMultiQualifier.alias);
        }

        if (AliasTypeOfMultiQualifier.stmts !== undefined) {
            assert.isDefined(stmts);
            assert.isTrue(stmts!.length > 6);
            const relatedStmts = stmts!.slice(5, 6);
            compareTypeAliasStmts(relatedStmts, AliasTypeOfMultiQualifier.stmts);
        }
    });

    it('alias type using in body', () => {
        const method = projectScene.getFile(fileId)?.getDefaultClass().getMethodWithName('%useAliasTypeInBody$aliasTypeWithImport');
        assert.isDefined(method);
        assert.isNotNull(method);
        const localA = method!.getBody()?.getLocals().get('a');
        assert.isDefined(localA);
        assert.equal(localA!.getType().toString(), '@type/test.ts: %dflt.aliasTypeWithImport()#NumberAType[]');
    });

    it('type alias should not in locals', () => {
        const locals = method?.getBody()?.getLocals();

        const classAType = locals?.get('ClassAType');
        assert.isUndefined(classAType);

        const classBType = locals?.get('ClassBType');
        assert.isUndefined(classBType);

        const numberAType = locals?.get('NumberAType');
        assert.isUndefined(numberAType);

        const typeOfType = locals?.get('typeOfType');
        assert.isUndefined(typeOfType);

        const multiQualifierType = locals?.get('MultiQualifierType');
        assert.isUndefined(multiQualifierType);
    });
});

describe('Alias Type With Type Query Test', () => {
    const method = projectScene.getFile(fileId)?.getDefaultClass().getMethodWithName('aliasTypeWithTypeQuery');
    const aliasTypeMap = method?.getBody()?.getAliasTypeMap();
    const stmts = method?.getBody()?.getCfg().getStmts();

    it('alias type of single qualifier', () => {
        const alias = aliasTypeMap?.get('SingleTypeQuery');
        assert.isDefined(alias);
        if (AliasTypeOfSingleTypeQuery.alias !== undefined) {
            compareTypeAlias(alias, AliasTypeOfSingleTypeQuery.alias);
        }

        if (AliasTypeOfSingleTypeQuery.stmts !== undefined) {
            assert.isDefined(stmts);
            assert.isTrue(stmts!.length > 2);
            const relatedStmts = stmts!.slice(1, 2);
            compareTypeAliasStmts(relatedStmts, AliasTypeOfSingleTypeQuery.stmts);
        }
    });

    it('alias type of multiple qualifiers', () => {
        const alias = aliasTypeMap?.get('MultiTypeQuery');
        assert.isDefined(alias);
        if (AliasTypeOfMultiTypeQuery.alias !== undefined) {
            compareTypeAlias(alias, AliasTypeOfMultiTypeQuery.alias);
        }

        if (AliasTypeOfMultiTypeQuery.stmts !== undefined) {
            assert.isDefined(stmts);
            assert.isTrue(stmts!.length > 3);
            const relatedStmts = stmts!.slice(2, 3);
            compareTypeAliasStmts(relatedStmts, AliasTypeOfMultiTypeQuery.stmts);
        }
    });

    it('type alias should not in locals', () => {
        const locals = method?.getBody()?.getLocals();

        const singleTypeQuery = locals?.get('SingleTypeQuery');
        assert.isUndefined(singleTypeQuery);

        const multiTypeQuery = locals?.get('MultiTypeQuery');
        assert.isUndefined(multiTypeQuery);
    });

});

describe('Alias Type With Reference Test', () => {
    const method = projectScene.getFile(fileId)?.getDefaultClass().getMethodWithName('aliasTypeWithReference');
    const aliasTypeMap = method?.getBody()?.getAliasTypeMap();
    const stmts = method?.getBody()?.getCfg().getStmts();

    it('alias type', () => {
        const alias = aliasTypeMap?.get('ReferType');
        assert.isDefined(alias);
        if (AliasTypeRef.alias !== undefined) {
            compareTypeAlias(alias, AliasTypeRef.alias);
        }

        if (AliasTypeRef.stmts !== undefined) {
            assert.isDefined(stmts);
            assert.isTrue(stmts!.length > 2);
            const relatedStmts = stmts!.slice(1, 2);
            compareTypeAliasStmts(relatedStmts, AliasTypeRef.stmts);
        }
    });

    it('alias type of multiple reference', () => {
        const alias = aliasTypeMap?.get('MultiReferType');
        assert.isDefined(alias);
        if (AliasTypeMultiRef.alias !== undefined) {
            compareTypeAlias(alias, AliasTypeMultiRef.alias);
        }

        if (AliasTypeMultiRef.stmts !== undefined) {
            assert.isDefined(stmts);
            assert.isTrue(stmts!.length > 3);
            const relatedStmts = stmts!.slice(2, 3);
            compareTypeAliasStmts(relatedStmts, AliasTypeMultiRef.stmts);
        }
    });

    it('type alias should not in locals', () => {
        const locals = method?.getBody()?.getLocals();

        const referType = locals?.get('ReferType');
        assert.isUndefined(referType);

        const multiReferType = locals?.get('MultiReferType');
        assert.isUndefined(multiReferType);
    });
});

describe('Alias Type With Literal Type Test', () => {
    const method = projectScene.getFile(fileId)?.getDefaultClass().getMethodWithName('aliasTypeWithLiteralType');
    const aliasTypeMap = method?.getBody()?.getAliasTypeMap();
    const stmts = method?.getBody()?.getCfg().getStmts();

    it('alias type of literalType', () => {
        const alias = aliasTypeMap?.get('ABC');
        assert.isDefined(alias);
        if (AliasTypeOfLiteralType.alias !== undefined) {
            compareTypeAlias(alias, AliasTypeOfLiteralType.alias);
        }

        if (AliasTypeOfLiteralType.stmts !== undefined) {
            assert.isDefined(stmts);
            const relatedStmts = stmts!.slice(1, 2);
            compareTypeAliasStmts(relatedStmts, AliasTypeOfLiteralType.stmts);
        }
    });

    it('alias type of type query of literalType', () => {
        const alias = aliasTypeMap?.get('XYZ');
        assert.isDefined(alias);
        if (AliasTypeOfQueryOfLiteralType.alias !== undefined) {
            compareTypeAlias(alias, AliasTypeOfQueryOfLiteralType.alias);
        }

        if (AliasTypeOfQueryOfLiteralType.stmts !== undefined) {
            assert.isDefined(stmts);
            const relatedStmts = stmts!.slice(3, 4);
            compareTypeAliasStmts(relatedStmts, AliasTypeOfQueryOfLiteralType.stmts);
        }
    });

    it('type alias should not in locals', () => {
        const locals = method?.getBody()?.getLocals();
        assert.isDefined(locals);
        assert.equal(locals!.size, 2);

        const localABC = locals?.get('ABC');
        assert.isUndefined(localABC);

        const localXYZ = locals?.get('XYZ');
        assert.isUndefined(localXYZ);
    });
});