/*
 * Copyright (c) 2024-2025 Huawei Device Co., Ltd.
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
import { ArkClass, ArkMethod, ClassSignature, MethodSignature, Stmt } from '../../../../src';
import path from 'path';
import { assertStmtsEqual, buildScene } from '../../common';
import { Class_With_Static_Init_Block_Expect } from '../../../resources/model/class/ClassExpect';

describe('ArkClass Test', () => {
    const scene = buildScene(path.join(__dirname, '../../../resources/model/class'));

    it('get method with matched signature', async () => {
        const arkFile = scene.getFiles().find((file) => file.getName() === 'class.ts');
        const arkClass = arkFile?.getClassWithName('TestClass');
        const arkMethod = arkClass?.getMethodWithName('testMethod');

        assert.isNotNull(arkClass);
        assert.isDefined(arkMethod);
        assert.isNotNull(arkMethod);
        const matchedSignature = new MethodSignature((arkClass as ArkClass).getSignature(), (arkMethod as ArkMethod).getSubSignature());
        const method = arkClass?.getMethod(matchedSignature);
        assert.isDefined(method);
        assert.isNotNull(method);
        expect(method?.getLine()).toEqual(19);
    });

    it('get method with unmatched signature', async () => {
        const arkFile = scene.getFiles().find((file) => file.getName() === 'class.ts');
        const arkClass = arkFile?.getClassWithName('TestClass');
        const arkMethod = arkClass?.getMethodWithName('testMethod');

        assert.isNotNull(arkClass);
        assert.isDefined(arkMethod);
        assert.isNotNull(arkMethod);
        const clsSignature = new ClassSignature('newClass', (arkClass as ArkClass).getDeclaringArkFile().getFileSignature());
        const unmatchedSignature = new MethodSignature(clsSignature, (arkMethod as ArkMethod).getSubSignature());
        const method = arkClass?.getMethod(unmatchedSignature);
        assert.isNull(method);
    });

    it('static block', async () => {
        const arkFile = scene.getFiles().find((file) => file.getName() === 'ClassWithStaticInitBlock.ts');
        assert.isDefined(arkFile);

        const staticInitNamePrefix = '%stat';
        const assertStaticBlockEqual = (arkClass: ArkClass, classExpect: any) => {
            for (const arkMethod of arkClass.getMethods(true)) {
                const methodName = arkMethod.getName();
                if (methodName.startsWith(staticInitNamePrefix)) {
                    const methodExpect = classExpect[methodName];
                    const methodSignature = arkMethod.getSignature();
                    const methodSignatureExpect = methodExpect.methodSignature;
                    expect(methodSignature.toString()).toEqual(methodSignatureExpect);

                    assertStmtsEqual(arkMethod.getCfg()?.getStmts() as Stmt[], methodExpect.stmts, false);
                }
            }
        };

        const classCase1 = arkFile?.getClassWithName('Case1');
        assert.isTrue(classCase1 instanceof ArkClass);
        const classCase1Expect = Class_With_Static_Init_Block_Expect.Case1;
        assertStaticBlockEqual(classCase1 as ArkClass, classCase1Expect);

        const classCase2 = arkFile?.getClassWithName('Case2');
        assert.isTrue(classCase2 instanceof ArkClass);
        const classCase2Expect = Class_With_Static_Init_Block_Expect.Case2;
        assertStaticBlockEqual(classCase2 as ArkClass, classCase2Expect);

        const classCase3 = arkFile?.getClassWithName('Case3');
        assert.isTrue(classCase3 instanceof ArkClass);
        const classCase3Expect = Class_With_Static_Init_Block_Expect.Case3;
        assertStaticBlockEqual(classCase3 as ArkClass, classCase3Expect);
    });
});


