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

export const Namespaces_With_The_Same_Name = [
    {
        namespaceName: 'NamespaceA',
        namespaceSignature: '@namespace/NamespacesWithTheSameName.ts: NamespaceA',
        linCols: [
            [16, 1],
            [31, 1],
        ],
        classes: [
            {
                className: 'ClassA',
                classSignature: '@namespace/NamespacesWithTheSameName.ts: NamespaceA.ClassA',
            },
            {
                className: 'ClassB',
                classSignature: '@namespace/NamespacesWithTheSameName.ts: NamespaceA.ClassB',
            },
            {
                className: '%dflt',
                classSignature: '@namespace/NamespacesWithTheSameName.ts: NamespaceA.%dflt',
            },
        ],
        nestedNamespaces: [
            {
                namespaceName: 'NamespaceB',
                namespaceSignature: '@namespace/NamespacesWithTheSameName.ts: NamespaceA.NamespaceB',
                linCols: [
                    [20, 5],
                    [35, 5],
                    [40, 5],
                ],
                classes: [
                    {
                        className: 'ClassC',
                        classSignature: '@namespace/NamespacesWithTheSameName.ts: NamespaceA.NamespaceB.ClassC',
                    },
                    {
                        className: 'ClassD',
                        classSignature: '@namespace/NamespacesWithTheSameName.ts: NamespaceA.NamespaceB.ClassD',
                    },
                    {
                        className: 'ClassE',
                        classSignature: '@namespace/NamespacesWithTheSameName.ts: NamespaceA.NamespaceB.ClassE',
                    },
                    {
                        className: '%dflt',
                        classSignature: '@namespace/NamespacesWithTheSameName.ts: NamespaceA.NamespaceB.%dflt',
                    },
                ],
                nestedNamespaces: [],
            },
            {
                namespaceName: 'NamespaceC',
                namespaceSignature: '@namespace/NamespacesWithTheSameName.ts: NamespaceA.NamespaceC',
                linCols: [
                    [25, 5],
                ],
                classes: [
                    {
                        className: 'ClassF',
                        classSignature: '@namespace/NamespacesWithTheSameName.ts: NamespaceA.NamespaceC.ClassF',
                    },
                    {
                        className: '%dflt',
                        classSignature: '@namespace/NamespacesWithTheSameName.ts: NamespaceA.NamespaceC.%dflt',
                    },
                ],
                nestedNamespaces: [],
            },
        ],
    },
];