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

import ts from 'typescript';
import { buildModifiers } from '../../utils/builderUtils';
import Logger from "../../utils/logger";
import { Decorator } from '../base/Decorator';

const logger = Logger.getLogger();
export class NamespaceInfo {
    private name: string;
    private modifiers: Set<string | Decorator> = new Set<string | Decorator>();

    constructor() { }

    public getName() {
        return this.name;
    }

    public setName(name: string) {
        this.name = name;
    }

    public getModifiers() {
        return this.modifiers;
    }

    public addModifier(modifier: string | Decorator) {
        this.modifiers.add(modifier);
    }
}

export function buildNamespaceInfo4NamespaceNode(node: ts.ModuleDeclaration, sourceFile: ts.SourceFile): NamespaceInfo {
    let namespaceInfo = new NamespaceInfo();
    if (node.modifiers) {
        buildModifiers(node.modifiers, sourceFile).forEach((modifier) => {
            namespaceInfo.addModifier(modifier);
        });
    }
    if (ts.isIdentifier(node.name)) {
        namespaceInfo.setName(node.name.text);
    }
    else if (ts.isStringLiteral(node.name)) {
        namespaceInfo.setName(node.name.text);
    }
    else {
        logger.warn("New namespace name type found. Please contact developers to add support for this!")
    }
    return namespaceInfo;
}