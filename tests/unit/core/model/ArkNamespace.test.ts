/*
 * Copyright (c) 2025 Huawei Device Co., Ltd.
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
import { buildScene } from '../../common';
import path from 'path';
import { Namespaces_With_The_Same_Name } from '../../../resources/model/namespace/NamespaceExpect';
import { ArkNamespace } from '../../../../src';

describe('namespace Test', () => {
    const scene = buildScene(path.join(__dirname, '../../../resources/model/namespace'));
    it('namespace with the same name', async () => {
        const arkFile = scene.getFiles().find((file) => file.getName() === 'NamespacesWithTheSameName.ts');
        assert.isDefined(arkFile);

        const namespaces = arkFile!.getNamespaces();
        assertNamespaceEqual(namespaces, Namespaces_With_The_Same_Name);
    });
});

function assertNamespaceEqual(namespaces: ArkNamespace[], expectNamespaces: any): void {
    assert.deepEqual(namespaces.length, expectNamespaces.length);
    for (const expectNamespace of expectNamespaces) {
        const expectNamespaceName = expectNamespace.namespaceName;
        const namespace = namespaces.find((namespace) => namespace.getName() === expectNamespaceName);
        assert.isDefined(namespace);
        assert.deepEqual(namespace!.getNamespaceSignature().toString(), expectNamespace.namespaceSignature);
        assert.deepEqual(namespace!.getLineColPairs(), expectNamespace.linCols);

        const classes = namespace!.getClasses();
        const expectClasses = expectNamespace.classes;
        assert.deepEqual(classes.length, expectClasses.length);
        for (const expectClass of expectClasses) {
            const expectClassName = expectClass.className;
            const arkClass = classes.find((arkClass) => arkClass.getName() === expectClassName);
            assert.isDefined(arkClass);
            assert.deepEqual(arkClass!.getSignature().toString(), expectClass.classSignature);
        }

        const nestedNamespaces = namespace!.getNamespaces();
        assertNamespaceEqual(nestedNamespaces, expectNamespace.nestedNamespaces);
    }

}