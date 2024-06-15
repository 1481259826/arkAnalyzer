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

import * as ts from "ohos-typescript";
import {LineColPosition} from "../../base/Position";
import {ArkExport, ExportInfo, ExportType, TypeSignature} from "../ArkExport";
import {Decorator} from "../../base/Decorator";
import {buildModifiers} from "./builderUtils";
import {ArkFile} from "../ArkFile";

export {buildExportInfo, initExportAssignment, initExportDeclaration};

function buildExportInfo(arkInstance: ArkExport, arkFile: ArkFile, line: LineColPosition): ExportInfo {
    return new ExportInfo.Builder()
        .exportClauseName(arkInstance.getName())
        .exportClauseType(arkInstance.getType())
        .nameBeforeAs(arkInstance.getName())
        .modifiers(arkInstance.getModifiers())
        .typeSignature(arkInstance.getSignature() as TypeSignature)
        .originTsPosition(line)
        .declaringArkFile(arkFile)
        .build();
}

function initExportDeclaration(node: ts.ExportDeclaration, sourceFile: ts.SourceFile, arkFile: ArkFile): ExportInfo[] {
    const originTsPosition = LineColPosition.buildFromNode(node, sourceFile);
    const tsSourceCode = node.getText(sourceFile);
    const modifiers = node.modifiers ? buildModifiers(node, sourceFile) : new Set<string | Decorator>();
    let exportFrom = '';
    if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        exportFrom = node.moduleSpecifier.text;
    }
    let exportInfos: ExportInfo[] = [];
    // just like: export {xxx as x} from './yy'
    if (node.exportClause && ts.isNamedExports(node.exportClause) && node.exportClause.elements) {
        node.exportClause.elements.forEach((element) => {
            let nameBeforeAs = element.propertyName && ts.isIdentifier(element.propertyName)
                ? element.propertyName.text : element.name.text
            let builder = new ExportInfo.Builder()
                .exportClauseType(ExportType.UNKNOWN)
                .exportClauseName(element.name.text)
                .nameBeforeAs(nameBeforeAs)
                .tsSourceCode(tsSourceCode)
                .exportFrom(exportFrom)
                .originTsPosition(originTsPosition)
                .declaringArkFile(arkFile)
                .modifiers(modifiers);
            exportInfos.push(builder.build());
        });
        return exportInfos;
    }

    let builder1 = new ExportInfo.Builder()
        .exportClauseType(ExportType.UNKNOWN)
        .nameBeforeAs('*')
        .modifiers(modifiers)
        .tsSourceCode(tsSourceCode)
        .exportFrom(exportFrom)
        .declaringArkFile(arkFile)
        .originTsPosition(originTsPosition);
    if (node.exportClause && ts.isNamespaceExport(node.exportClause) && ts.isIdentifier(node.exportClause.name)) { // just like: export * as xx from './yy'
        exportInfos.push(builder1.exportClauseName(node.exportClause.name.text).build());
    } else if (!node.exportClause && node.moduleSpecifier) { // just like: export * from './yy'
        exportInfos.push(builder1.exportClauseName('*').build());
    }
    return exportInfos;
}

function initExportAssignment(node: ts.ExportAssignment, sourceFile: ts.SourceFile, arkFile: ArkFile): ExportInfo[] {
    let exportInfos: ExportInfo[] = [];
    if (!node.expression) {
        return exportInfos;
    }
    const originTsPosition = LineColPosition.buildFromNode(node, sourceFile);
    const tsSourceCode = node.getText(sourceFile);
    const modifiers = buildModifiers(node, sourceFile);
    if(isKeyword(node.getChildren(sourceFile),ts.SyntaxKind.DefaultKeyword)){
        modifiers.add(ts.SyntaxKind[ts.SyntaxKind.DefaultKeyword]);
    }
    if (ts.isIdentifier(node.expression)) { //export default xx
        const exportInfo = new ExportInfo.Builder()
            .exportClauseName(node.expression.text)
            .exportClauseType(ExportType.UNKNOWN)
            .modifiers(modifiers)
            .tsSourceCode(tsSourceCode)
            .originTsPosition(originTsPosition)
            .declaringArkFile(arkFile)
            .build();
        exportInfos.push(exportInfo);
    } else if (ts.isObjectLiteralExpression(node.expression) && node.expression.properties) { //export default {a,b,c}
        node.expression.properties.forEach((property) => {
            if (property.name && ts.isIdentifier(property.name)) {
                let exportClauseName = property.name.text;
                const exportInfo = new ExportInfo.Builder()
                    .exportClauseName(property.name.text)
                    .exportClauseType(ExportType.UNKNOWN)
                    .nameBeforeAs(property.name.text)
                    .modifiers(modifiers)
                    .tsSourceCode(tsSourceCode)
                    .originTsPosition(originTsPosition)
                    .declaringArkFile(arkFile)
                    .build();
                exportInfos.push(exportInfo);
            }
        });
    }
    return exportInfos;
}

/**
 * export const c = '', b = 1;
 * @param node
 * @param sourceFile
 * @param arkFile
 */
export function initExportVariableStatement(node: ts.VariableStatement, sourceFile: ts.SourceFile, arkFile: ArkFile): ExportInfo[] {
    let exportInfos: ExportInfo[] = [];
    const originTsPosition = LineColPosition.buildFromNode(node, sourceFile);
    const modifiers = node.modifiers ? buildModifiers(node, sourceFile) : new Set<string | Decorator>();
    const tsSourceCode = node.getText(sourceFile);
    node.declarationList.declarations.forEach(dec => {
        const exportInfo = new ExportInfo.Builder()
            .exportClauseName(dec.name.getText(sourceFile))
            .exportClauseType(ExportType.LOCAL)
            .modifiers(modifiers)
            .tsSourceCode(tsSourceCode)
            .originTsPosition(originTsPosition)
            .declaringArkFile(arkFile)
            .build();
        exportInfos.push(exportInfo);
    })
    return exportInfos;
}

/**
 * export type MyType = string;
 * @param node
 * @param sourceFile
 * @param arkFile
 */
export function initExportTypeAliasDeclaration(node: ts.TypeAliasDeclaration, sourceFile: ts.SourceFile, arkFile: ArkFile): ExportInfo[] {
    let exportInfos: ExportInfo[] = [];
    const originTsPosition = LineColPosition.buildFromNode(node, sourceFile);
    const modifiers = node.modifiers ? buildModifiers(node, sourceFile) : new Set<string | Decorator>();
    const tsSourceCode = node.getText(sourceFile);
    const exportInfo = new ExportInfo.Builder()
        .exportClauseName(node.name.text)
        .exportClauseType(ExportType.LOCAL)
        .tsSourceCode(tsSourceCode)
        .modifiers(modifiers)
        .originTsPosition(originTsPosition)
        .declaringArkFile(arkFile)
        .build();
    exportInfos.push(exportInfo);
    return exportInfos;
}

export function isExported(modifierArray: ts.NodeArray<ts.ModifierLike> | undefined): boolean {
    if (!modifierArray) {
        return false;
    }
    for (let child of modifierArray) {
        if (child.kind === ts.SyntaxKind.ExportKeyword) {
            return true;
        }
    }
    return false;
}

function isKeyword(modifierArray: ts.Node[] | undefined, keyword: ts.SyntaxKind): boolean {
    if (!modifierArray) {
        return false;
    }
    for (let child of modifierArray) {
        if (child.kind === keyword) {
            return true;
        }
    }
    return false;
}