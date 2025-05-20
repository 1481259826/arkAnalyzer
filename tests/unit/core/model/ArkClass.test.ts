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
import { ArkClass, ArkMethod, ClassSignature, ClassType, MethodSignature, Stmt } from '../../../../src';
import path from 'path';
import { assertStmtsEqual, buildScene } from '../../common';
import {
    Class_With_Static_Init_Block_Expect,
    ClassWithFieldAndConstructor,
    ClassWithFieldAndParamConstructor,
    ClassWithGeneratedConstructor,
    ClassWithParamProperty,
    ClassWithSuperConstructor,
    EnumClass,
    InterfaceClass,
    ObjClass,
    SubObjClass,
    SubTypeLiteralClass,
    TypeLiteralClass,
} from '../../../resources/model/class/ClassExpect';
import { ArkIRClassPrinter } from '../../../../src/save/arkir/ArkIRClassPrinter';

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

describe('ArkClass Constructor and Init Method Test', () => {
    const scene = buildScene(path.join(__dirname, '../../../resources/model/class'));
    const arkFile = scene.getFiles().find((file) => file.getName() === 'ClassWithConstructor.ts');

    it('class with generated constructor', async () => {
        const arkClass = arkFile?.getClassWithName('ClassWithNoConstructor');
        assert.isDefined(arkClass);
        assert.isNotNull(arkClass);
        let printer = new ArkIRClassPrinter(arkClass!);
        let ir = printer.dump();
        assert.equal(ir, ClassWithGeneratedConstructor);
        assert.isTrue(arkClass?.getMethodWithName('test')?.isPublic());
    });

    it('class with field and constructor', async () => {
        const arkClass = arkFile?.getClassWithName('ClassWithNoParamConstructor');
        assert.isDefined(arkClass);
        assert.isNotNull(arkClass);
        let printer = new ArkIRClassPrinter(arkClass!);
        let ir = printer.dump();
        assert.equal(ir, ClassWithFieldAndConstructor);
        assert.isTrue(arkClass?.getFieldWithName('a')?.isPublic());
    });

    it('class with static field and constructor has params', async () => {
        const arkClass = arkFile?.getClassWithName('ClassWithParamsConstructor');
        assert.isDefined(arkClass);
        assert.isNotNull(arkClass);
        let printer = new ArkIRClassPrinter(arkClass!);
        let ir = printer.dump();
        assert.equal(ir, ClassWithFieldAndParamConstructor);
        assert.isTrue(arkClass?.getStaticFieldWithName('a')?.isPublic());
    });

    it('class with super constructor', async () => {
        const arkClass = arkFile?.getClassWithName('ClassWithSuperConstructor');
        assert.isDefined(arkClass);
        assert.isNotNull(arkClass);
        let printer = new ArkIRClassPrinter(arkClass!);
        let ir = printer.dump();
        assert.equal(ir, ClassWithSuperConstructor);
        assert.isTrue(arkClass?.getFieldWithName('c')?.isPublic());
    });

    it('class with param property', async () => {
        const arkClass = arkFile?.getClassWithName('ClassWithParamProperty');
        assert.isDefined(arkClass);
        assert.isNotNull(arkClass);
        let printer = new ArkIRClassPrinter(arkClass!);
        let ir = printer.dump();
        assert.equal(ir, ClassWithParamProperty);
    });
});

describe('ArkClass with Other Category Test', () => {
    const scene = buildScene(path.join(__dirname, '../../../resources/model/class'));
    const arkFile = scene.getFiles().find((file) => file.getName() === 'ClassWithOtherCategory.ts');

    it('interface class', async () => {
        const arkClass = arkFile?.getClassWithName('TestInterface');
        assert.isDefined(arkClass);
        assert.isNotNull(arkClass);
        let printer = new ArkIRClassPrinter(arkClass!);
        let ir = printer.dump();
        assert.equal(ir, InterfaceClass);
    });

    it('enum class', async () => {
        const arkClass = arkFile?.getClassWithName('TestEnum');
        assert.isDefined(arkClass);
        assert.isNotNull(arkClass);
        let printer = new ArkIRClassPrinter(arkClass!);
        let ir = printer.dump();
        assert.equal(ir, EnumClass);
    });

    it('type literal class', async () => {
        const typeLiteral = arkFile?.getDefaultClass().getDefaultArkMethod()?.getBody()?.getAliasTypeByName('TestLiteral');
        assert.isDefined(typeLiteral);
        assert.isNotNull(typeLiteral);

        assert.isTrue(typeLiteral!.getOriginalType() instanceof ClassType);
        const className = (typeLiteral!.getOriginalType() as ClassType).getClassSignature().getClassName();
        const literalClass = arkFile?.getClassWithName(className);
        assert.isDefined(literalClass);
        assert.isNotNull(literalClass);
        let printer = new ArkIRClassPrinter(literalClass!);
        let ir = printer.dump();
        assert.equal(ir, TypeLiteralClass);

        const subLiteralClassType = literalClass?.getFieldWithName('b')?.getType();
        assert.isDefined(subLiteralClassType);
        assert.isTrue(subLiteralClassType instanceof ClassType);
        const subClassName = (subLiteralClassType as ClassType).getClassSignature().getClassName();
        const subLiteralClass = arkFile?.getClassWithName(subClassName);
        assert.isDefined(subLiteralClass);
        assert.isNotNull(subLiteralClass);
        let subClassPrinter = new ArkIRClassPrinter(subLiteralClass!);
        let subIr = subClassPrinter.dump();
        assert.equal(subIr, SubTypeLiteralClass);
    });


    it('object class', async () => {
        const objectClassLocal = arkFile?.getDefaultClass().getDefaultArkMethod()?.getBody()?.getLocals().get('testObj');
        assert.isDefined(objectClassLocal);

        assert.isTrue(objectClassLocal!.getType() instanceof ClassType);
        const objClassName = (objectClassLocal!.getType() as ClassType).getClassSignature().getClassName();
        const objClass = arkFile?.getClassWithName(objClassName);
        assert.isDefined(objClass);
        assert.isNotNull(objClass);
        let printer = new ArkIRClassPrinter(objClass!);
        let ir = printer.dump();
        assert.equal(ir, ObjClass);

        const subObjClassType = objClass?.getFieldWithName('b')?.getType();
        assert.isDefined(subObjClassType);
        assert.isTrue(subObjClassType instanceof ClassType);
        const subObjClassName = (subObjClassType as ClassType).getClassSignature().getClassName();
        const subObjClass = arkFile?.getClassWithName(subObjClassName);
        assert.isDefined(subObjClass);
        assert.isNotNull(subObjClass);
        let subClassPrinter = new ArkIRClassPrinter(subObjClass!);
        let subIr = subClassPrinter.dump();
        assert.equal(subIr, SubObjClass);
    });
});

describe('ArkClass with Heritage Class Test', () => {
    const scene = buildScene(path.join(__dirname, '../../../resources/model/class'));
    const arkFile = scene.getFiles().find((file) => file.getName() === 'ClassWithHeritage.ts');

    it('extended class without constructor', async () => {
        const arkClass = arkFile?.getClassWithName('A');
        assert.isDefined(arkClass);
        assert.isNotNull(arkClass);
        const extendedClass = arkClass!.getExtendedClasses().get('B');
        assert.isDefined(extendedClass);
        assert.equal(extendedClass!.getSignature().toString(), '@class/ClassWithHeritage.ts: B');
    });

    it('extended class with constructor', async () => {
        const arkClass = arkFile?.getClassWithName('B');
        assert.isDefined(arkClass);
        assert.isNotNull(arkClass);
        const extendedClass = arkClass!.getExtendedClasses().get('Q');
        assert.isDefined(extendedClass);
        assert.equal(extendedClass!.getSignature().toString(), '@class/ClassWithHeritage.ts: Q');
    });
});