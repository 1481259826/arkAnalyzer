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

import ts from "ohos-typescript";
import path from 'path';
import { ArkFile } from "../ArkFile";
import { LineColPosition } from "../../base/Position";
import { ImportInfo } from "../ArkImport";
import { buildModifiers } from "./builderUtils";
import { Decorator } from "../../base/Decorator";
import { ExportInfo, ExportType, FromInfo } from "../ArkExport";
import { FileSignature } from "../ArkSignature";
import Logger from "../../../utils/logger";
import { Scene } from "../../../Scene";
import { transfer2UnixPath } from "../../../utils/pathTransfer";

const logger = Logger.getLogger();
const moduleMap: Map<string, string> = new Map<string, string>();

export function expandExportInfo(arkFile: ArkFile): void {
    let exportInfos = arkFile.getExportInfos();
    exportInfos.forEach(exportInfo => {
        if (exportInfo.getNameBeforeAs() === '*') {
            let formFile = getArkFile(exportInfo);
            if (formFile) {
                expandExportInfo(formFile);
                let prefix = exportInfo.getExportClauseName() === '*' ? '' : exportInfo.getExportClauseName() + '.';
                formFile.getExportInfos().forEach(eInfo => {
                    let e = setTypeForExportInfo(eInfo);
                    let newInfo = new ExportInfo.Builder()
                        .exportClauseName(prefix + e.getExportClauseName())
                        .nameBeforeAs(e.getExportClauseName())
                        .exportClauseType(e.getExportClauseType())
                        .modifiers(exportInfo.getModifiers())
                        .typeSignature(e.getTypeSignature())
                        .originTsPosition(e.getOriginTsPosition())
                        .declaringArkFile(e.getDeclaringArkFile())
                        .build();
                    arkFile.addExportInfo(newInfo);
                })
                arkFile.addExportInfo(setTypeForExportInfo(exportInfo));
            }
        }
    })
}

export function getArkFile(im: FromInfo): ArkFile | null | undefined {
    const from = im.getFrom();
    if (!from) {
        return null;
    }
    if (/^\.{1,2}\//.test(from)) {
        const originPath = path.resolve(path.dirname(im.getDeclaringArkFile().getFilePath()), from);
        return getArkFileFromScene(im, originPath);
    } else if (/^@[a-z|\-]+?\//.test(from)) {
        return getOriginArkFile(im);
    } else {
        const sdkMap = im.getDeclaringArkFile()?.getScene()?.getSdkArkFilesMap();
        let prefix = /^@kit\./.test(from) ? '@etsSdk/kits/' : '@etsSdk/api/';
        return sdkMap?.get(prefix + from + ': ');
    }
}


export function findExportInfo(fromInfo: FromInfo): ExportInfo | null {
    let file = getArkFile(fromInfo);
    if (file === undefined || file === null) {
        logger.warn(fromInfo.getOriginName() + ' ' + fromInfo.getFrom() + ' file not found: '
            + fromInfo.getDeclaringArkFile()?.getFileSignature()?.toString());
        return null;
    }
    let exportInfo = findExportInfoInfile(fromInfo, file);
    if (exportInfo === null) {
        logger.warn('export info not found, ' + fromInfo.getFrom() + ' in file: '
            + fromInfo.getDeclaringArkFile().getFileSignature().toString());
        return null;
    }
    return exportInfo;
}

export function setTypeForExportInfo(eInfo: ExportInfo): ExportInfo {
    if (eInfo.getTypeSignature()) {
        return eInfo;
    } else if (!eInfo.getFrom()) {
        if (eInfo.getExportClauseType() === ExportType.LOCAL) {
            findDefaultMethodSetType(eInfo);
        } else {
            let found = findClassSetType(eInfo);
            if (!found) {
                found = findNameSpaceSetType(eInfo);
            }
            if (!found) {
                findDefaultMethodSetType(eInfo);
            }
        }
        return eInfo;
    } else if (eInfo.getExportClauseType() === ExportType.UNKNOWN) {
        let result = findExportInfo(eInfo);
        if (result !== null) {
            eInfo = result;
            return result;
        }
        logger.warn(eInfo.getFrom() + 'trace end at' + eInfo.getDeclaringArkFile().getFileSignature().toString());
    } else {
        logger.error("unknown branch" + eInfo.getTsSourceCode(), eInfo.getDeclaringArkFile().getFileSignature().toString());
    }
    return eInfo;
}

function getArkFileFromScene(im: FromInfo, originPath: string) {
    let fileName = path.relative(im.getDeclaringArkFile().getProjectDir(), originPath);
    const scene = im.getDeclaringArkFile().getScene();
    if (originPath.indexOf('.') > 0) {
        const fromSignature = new FileSignature();
        fromSignature.setProjectName(im.getDeclaringArkFile().getProjectName());
        fromSignature.setFileName(fileName);
        return scene.getFile(fromSignature);
    }
    let arkFile = getArkFileFormSceneMap(im.getDeclaringArkFile().getProjectName()
        , fileName, '.ets: ', '.d.ts: ', scene);
    if (arkFile) {
        return arkFile;
    }
    return getArkFileFormSceneMap(im.getDeclaringArkFile().getProjectName(), fileName, '.ts: ', '.d.ets: ', scene);
}

function getArkFileFormSceneMap(projectName: string, fileName: string, suffix: string, etsSdkSuffix: string, scene: Scene) {
    if (projectName === 'etsSdk') {
        return scene.getSdkArkFilesMap().get(transfer2UnixPath(`@${projectName}/${fileName}${etsSdkSuffix}`));
    }
    return scene.getFilesMap().get(transfer2UnixPath(`@${projectName}/${fileName}${suffix}`));
}

function buildDefaultClassExportInfo(im: FromInfo, file: ArkFile) {
    return new ExportInfo.Builder()
        .exportClauseType(ExportType.CLASS)
        .exportClauseName(im.getOriginName())
        .declaringArkFile(file)
        .typeSignature(file.getDefaultClass().getSignature())
        .build();
}

function findExportInfoInfile(fromInfo: FromInfo, file: ArkFile) {
    if (fromInfo.getOriginName() === '*') {
        return buildDefaultClassExportInfo(fromInfo, file);
    }
    let exportInfo = null;
    if (fromInfo.isDefault()) {
        exportInfo = file.getExportInfos().find(p => p.isDefault());
        if (exportInfo) {
            return setTypeForExportInfo(exportInfo);
        }
        if (file.getName().endsWith('.d.ts')) {
            return buildDefaultClassExportInfo(fromInfo, file);
        }
    }
    return file.getExportInfoBy(fromInfo.getOriginName());
}


function findDefaultMethodSetType(info: ExportInfo): boolean {
    let locals = info.getDeclaringArkFile().getDefaultClass().getDefaultArkMethod()?.getBody()?.getLocals();
    if (locals) {
        for (const local of locals) {
            if (local.getName() === info.getOriginName()) {
                info.setExportClauseType(ExportType.LOCAL);
                info.setTypeSignature(local);
                return true;
            }
        }
    }
    return false;
}

function findClassSetType(info: ExportInfo): boolean {
    const clazz = info.getDeclaringArkFile().getClassWithName(info.getOriginName());
    if (clazz) {
        info.setExportClauseType(ExportType.CLASS);
        info.setTypeSignature(clazz.getSignature());
        return true;
    }
    return false;
}

function findNameSpaceSetType(info: ExportInfo): boolean {
    const space = info.getDeclaringArkFile().getNamespaceWithName(info.getOriginName());
    if (space) {
        info.setExportClauseType(ExportType.NAME_SPACE);
        info.setTypeSignature(space.getSignature());
        return true;
    }
    return false;
}

export function buildImportInfo(node: ts.ImportEqualsDeclaration | ts.ImportDeclaration, sourceFile: ts.SourceFile): ImportInfo[] {
    if (ts.isImportDeclaration(node)) {
        return buildImportDeclarationNode(node, sourceFile);
    } else if (ts.isImportEqualsDeclaration(node)) {
        return buildImportEqualsDeclarationNode(node, sourceFile);
    }
    return [];
}

function buildImportDeclarationNode(node: ts.ImportDeclaration, sourceFile: ts.SourceFile): ImportInfo[] {
    const originTsPosition = LineColPosition.buildFromNode(node, sourceFile);
    const tsSourceCode = node.getText(sourceFile);

    let importInfos: ImportInfo[] = [];
    let importFrom: string = '';
    if (ts.isStringLiteral(node.moduleSpecifier)) {
        importFrom = node.moduleSpecifier.text;
    }

    const modifiers: Set<string | Decorator> = new Set<string | Decorator>()
    if (node.modifiers) {
        buildModifiers(node, sourceFile).forEach((modifier) => {
            modifiers.add(modifier);
        });
    }

    // just like: import '../xxx'
    if (!node.importClause) {
        let importClauseName = '';
        let importType = '';
        let importInfo = new ImportInfo();
        importInfo.build(importClauseName, importType, importFrom, originTsPosition, modifiers);
        importInfo.setTsSourceCode(tsSourceCode);
        importInfos.push(importInfo);
    }

    //just like: import fs from 'fs'
    if (node.importClause && node.importClause.name && ts.isIdentifier(node.importClause.name)) {
        let importClauseName = node.importClause.name.text;
        let importType = "Identifier";
        let importInfo = new ImportInfo();
        importInfo.build(importClauseName, importType, importFrom, originTsPosition, modifiers);
        importInfo.setTsSourceCode(tsSourceCode);
        importInfos.push(importInfo);
    }

    // just like: import {xxx} from './yyy'
    if (node.importClause && node.importClause.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
        let importType = "NamedImports";
        if (node.importClause.namedBindings.elements) {
            node.importClause.namedBindings.elements.forEach((element) => {
                if (element.name && ts.isIdentifier(element.name)) {
                    let importClauseName = element.name.text;
                    if (element.propertyName && ts.isIdentifier(element.propertyName)) {
                        let importInfo = new ImportInfo();
                        importInfo.build(importClauseName, importType, importFrom, originTsPosition, modifiers, element.propertyName.text);
                        importInfo.setTsSourceCode(tsSourceCode);
                        importInfos.push(importInfo);
                    } else {
                        let importInfo = new ImportInfo();
                        importInfo.build(importClauseName, importType, importFrom, originTsPosition, modifiers);
                        importInfo.setTsSourceCode(tsSourceCode);
                        importInfos.push(importInfo);
                    }
                }
            });
        }
    }

    // just like: import * as ts from 'ohos-typescript'
    if (node.importClause && node.importClause.namedBindings && ts.isNamespaceImport(node.importClause.namedBindings)) {
        let importType = "NamespaceImport";
        if (node.importClause.namedBindings.name && ts.isIdentifier(node.importClause.namedBindings.name)) {
            let importClauseName = node.importClause.namedBindings.name.text;
            let importInfo = new ImportInfo();
            let nameBeforeAs = '*';
            importInfo.build(importClauseName, importType, importFrom, originTsPosition, modifiers, nameBeforeAs);
            importInfo.setTsSourceCode(tsSourceCode);
            importInfos.push(importInfo);
        }
    }

    return importInfos;
}

function buildImportEqualsDeclarationNode(node: ts.ImportEqualsDeclaration, sourceFile: ts.SourceFile): ImportInfo[] {
    const originTsPosition = LineColPosition.buildFromNode(node, sourceFile);
    const tsSourceCode = node.getText(sourceFile);

    let importInfos: ImportInfo[] = [];
    let importType = "EqualsImport";
    const modifiers: Set<string | Decorator> = new Set<string | Decorator>()
    if (node.modifiers) {
        buildModifiers(node, sourceFile).forEach((modifier) => {
            modifiers.add(modifier);
        });
    }
    if (node.moduleReference && ts.isExternalModuleReference(node.moduleReference) &&
        node.moduleReference.expression && ts.isStringLiteral(node.moduleReference.expression)) {
        let importFrom = node.moduleReference.expression.text;
        let importClauseName = node.name.text;
        let importInfo = new ImportInfo()
        importInfo.build(importClauseName, importType, importFrom, originTsPosition, modifiers);
        importInfo.setTsSourceCode(tsSourceCode);
        importInfos.push(importInfo);
    }
    return importInfos;
}

function getOriginArkFile(fromInfo: FromInfo) {
    const from = fromInfo.getFrom();
    if (moduleMap.size === 0) {
        generateModuleMap(fromInfo.getDeclaringArkFile());
    }
    let index: number;
    let file;
    let modulePath;
    if ((index = from.indexOf('src')) > 0 || (index = from.indexOf('Index')) > 0 || (index = from.indexOf('index')) > 0) {
        modulePath = moduleMap.get(from.substring(0, index).replace(/\/*$/, '')) ?? '';
        file = getArkFileFromScene(fromInfo, path.join(modulePath ?? '', from.substring(index)));
    } else {
        modulePath = moduleMap.get(from) ?? '';
        file = getArkFileFromScene(fromInfo, path.join(modulePath, 'index.ets')) ?? getArkFileFromScene(fromInfo, path.join(modulePath, 'Index.ets'))
    }
    if (file && findExportInfoInfile(fromInfo, file)) {
        return file;
    } else {
        return getArkFileFromScene(fromInfo, path.join(modulePath, '/src/main/ets/TsIndex.ts'));
    }
}

function generateModuleMap(arkFile: ArkFile) {
    arkFile.getScene().getOhPkgContentMap().forEach((content, filePath) => {
        if (content.dependencies) {
            Object.entries(content.dependencies).forEach(([name, value]) => {
                let modulePath = value;
                if (/^(file:)?\.{1,2}\//.test(value)) { //判断相对路径
                    modulePath = path.resolve(path.dirname(filePath), value.replace('file:', ''));
                }
                moduleMap.set(name, modulePath);
            })
        }
    })
}
