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

import ts from 'ohos-typescript';
import path from 'path';
import { ArkFile } from '../ArkFile';
import { LineColPosition } from '../../base/Position';
import { ImportInfo } from '../ArkImport';
import { buildModifiers } from './builderUtils';
import { Decorator } from '../../base/Decorator';
import { ExportInfo, ExportType, FromInfo } from '../ArkExport';
import { FileSignature, LocalSignature } from '../ArkSignature';
import Logger, { LOG_MODULE_TYPE } from '../../../utils/logger';
import { transfer2UnixPath } from '../../../utils/pathTransfer';
import { FileUtils, ModulePath } from '../../../utils/FileUtils';
import { Sdk } from '../../../Config';
import { AliasType } from '../../base/Type';

const logger = Logger.getLogger(LOG_MODULE_TYPE.ARKANALYZER, 'ArkImportBuilder');
let moduleMap: Map<string, ModulePath> | undefined = undefined;
const fileSuffixArray = ['.ets: ', '.ts: ', '.d.ets: ', '.d.ts: '];

export function getArkFile(im: FromInfo): ArkFile | null | undefined {
    const from = im.getFrom();
    if (!from) {
        return null;
    }
    if (/^([^@]*\/)([^\/]*)$/.test(from)) { //relative path
        const parentPath = /^\.{1,2}\//.test(from) ? path.dirname(im.getDeclaringArkFile().getFilePath())
            : im.getDeclaringArkFile().getProjectDir();
        const originPath = path.resolve(parentPath, from);
        return getArkFileFromScene(im, originPath);
    } else if (/^@[a-z|\-]+?\//.test(from)) { //module path
        const arkFile = getArkFileFromOtherModule(im);
        if (arkFile) {
            return arkFile;
        }
    }
    //sdk path
    const scene = im.getDeclaringArkFile().getScene();
    for (const sdk of scene.getProjectSdkMap().values()) {
        const arkFile = getArkFileFormMap(processSdkPath(sdk, from), scene.getSdkArkFilesMap());
        if (arkFile) {
            return arkFile;
        }
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
    if (eInfo.getArkExport()) {
        return eInfo;
    } else if (!eInfo.getFrom()) {
        if (eInfo.getExportClauseType() === ExportType.LOCAL) {
            findLocalSetType(eInfo);
        } else if (eInfo.getExportClauseType() === ExportType.TYPE) {
            findTypeSetType(eInfo);
        } else {
            let found = findClassSetType(eInfo);
            if (!found) {
                found = findMethodSetType(eInfo);
            }
            if (!found) {
                found = findNameSpaceSetType(eInfo);
            }
            if (!found) {
                findLocalSetType(eInfo);
            }
            if (!found) {
                findImportSetType(eInfo);
            }
        }
        return eInfo;
    } else if (eInfo.getExportClauseType() === ExportType.UNKNOWN) {
        const result = findExportInfo(eInfo);
        if (result) {
            eInfo.setExportClauseType(result.getExportClauseType());
            eInfo.setArkExport(result.getArkExport());
        }
    }
    if (!eInfo.getArkExport()) {
        logger.warn(eInfo.getExportClauseName() + ' get type signature fail from ' + eInfo.getFrom() + ' at '
            + eInfo.getDeclaringArkFile().getFileSignature().toString());
    }
    return eInfo;
}

function processSdkPath(sdk: Sdk, formPath: string): string {
    const sdkName = sdk.name;
    let dir;
    if (formPath.startsWith('@ohos.') || formPath.startsWith('@hms.') || formPath.startsWith('@system.')) {
        dir = 'api';
    } else if (formPath.startsWith('@kit.')) {
        dir = 'kits';
    } else if (formPath.startsWith('@arkts.')) {
        dir = 'arkts';
    } else {
        let originPath = path.join(sdk.path, formPath);
        if (FileUtils.isDirectory(originPath)) {
            formPath = path.join(formPath, FileUtils.getIndexFileName(originPath));
        }
        return `@${sdkName}/${formPath}`;
    }
    return `@${sdkName}/${dir}/${formPath}`;
}

function getArkFileFromScene(im: FromInfo, originPath: string) {
    if (FileUtils.isDirectory(originPath)) {
        originPath = path.join(originPath, FileUtils.getIndexFileName(originPath));
    }
    const fileName = path.relative(im.getDeclaringArkFile().getProjectDir(), originPath);
    const scene = im.getDeclaringArkFile().getScene();
    if (/\.e?ts$/.test(originPath)) {
        const fromSignature = new FileSignature();
        fromSignature.setProjectName(im.getDeclaringArkFile().getProjectName());
        fromSignature.setFileName(fileName);
        return scene.getFile(fromSignature);
    }
    const projectName = im.getDeclaringArkFile().getProjectName();
    const filePath = `@${projectName}/${fileName}`;
    if (projectName !== scene.getProjectName()) {
        return getArkFileFormMap(filePath, scene.getSdkArkFilesMap());
    }
    return getArkFileFormMap(filePath, scene.getFilesMap());
}

function getArkFileFormMap(filePath: string, map: Map<string, ArkFile>) {
    if (/\.e?ts$/.test(filePath)) {
        return map.get(transfer2UnixPath(filePath) + ': ');
    }
    for (const suffix of fileSuffixArray) {
        const arkFile = map.get(transfer2UnixPath(filePath) + suffix);
        if (arkFile) {
            return arkFile;
        }
    }
}

function buildDefaultClassExportInfo(im: FromInfo, file: ArkFile) {
    return new ExportInfo.Builder()
        .exportClauseType(ExportType.CLASS)
        .exportClauseName(im.getOriginName())
        .declaringArkFile(file)
        .arkExport(file.getDefaultClass())
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
        if (/\.d\.e?ts$/.test(file.getName())) {
            return buildDefaultClassExportInfo(fromInfo, file);
        }
    }
    return file.getExportInfoBy(fromInfo.getOriginName());
}

function findLocalSetType(info: ExportInfo): boolean {
    let defaultArkMethod = info.getDeclaringArkFile().getDefaultClass().getDefaultArkMethod();
    let local = defaultArkMethod?.getBody()?.getLocals()
        .get(info.getOriginName());
    if (defaultArkMethod && local) {
        local.setSignature(new LocalSignature(local.getName(), defaultArkMethod.getSignature()));
        info.setExportClauseType(ExportType.LOCAL);
        info.setArkExport(local);
        return true;
    }
    return false;
}

function findMethodSetType(info: ExportInfo): boolean {
    const method = info.getDeclaringArkFile().getDefaultClass().getMethodWithName(info.getOriginName());
    if (method) {
        info.setExportClauseType(ExportType.METHOD);
        info.setArkExport(method);
        return true;
    }
    return false;
}

function findTypeSetType(info: ExportInfo): boolean {
    const aliasType = info.getDeclaringArkFile().getDefaultClass().getDefaultArkMethod()?.getBody()
        ?.getAliasTypeMap().get(info.getOriginName());
    if (aliasType instanceof AliasType) {
        info.setExportClauseType(ExportType.TYPE);
        info.setArkExport(aliasType);
        return true;
    }
    return false;
}

function findClassSetType(info: ExportInfo): boolean {
    const clazz = info.getDeclaringArkFile().getClassWithName(info.getOriginName());
    if (clazz) {
        info.setExportClauseType(ExportType.CLASS);
        info.setArkExport(clazz);
        return true;
    }
    return false;
}

function findImportSetType(info: ExportInfo): boolean {
    const importInfo = info.getDeclaringArkFile().getImportInfoBy(info.getOriginName());
    if (importInfo) {
        const result = findExportInfo(importInfo);
        if (result) {
            info.setExportClauseType(result.getExportClauseType());
            info.setArkExport(result.getArkExport());
            return true;
        }
    }
    return false;
}

function findNameSpaceSetType(info: ExportInfo): boolean {
    const space = info.getDeclaringArkFile().getNamespaceWithName(info.getOriginName());
    if (space) {
        info.setExportClauseType(ExportType.NAME_SPACE);
        info.setArkExport(space);
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

    const modifiers: Set<string | Decorator> = new Set<string | Decorator>();
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
        let importType = 'Identifier';
        let importInfo = new ImportInfo();
        importInfo.build(importClauseName, importType, importFrom, originTsPosition, modifiers);
        importInfo.setTsSourceCode(tsSourceCode);
        importInfos.push(importInfo);
    }

    // just like: import {xxx} from './yyy'
    if (node.importClause && node.importClause.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
        let importType = 'NamedImports';
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
        let importType = 'NamespaceImport';
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
    let importType = 'EqualsImport';
    const modifiers: Set<string | Decorator> = new Set<string | Decorator>();
    if (node.modifiers) {
        buildModifiers(node, sourceFile).forEach((modifier) => {
            modifiers.add(modifier);
        });
    }
    if (node.moduleReference && ts.isExternalModuleReference(node.moduleReference) &&
        node.moduleReference.expression && ts.isStringLiteral(node.moduleReference.expression)) {
        let importFrom = node.moduleReference.expression.text;
        let importClauseName = node.name.text;
        let importInfo = new ImportInfo();
        importInfo.build(importClauseName, importType, importFrom, originTsPosition, modifiers);
        importInfo.setTsSourceCode(tsSourceCode);
        importInfos.push(importInfo);
    }
    return importInfos;
}

function getArkFileFromOtherModule(fromInfo: FromInfo) {
    if (moduleMap === undefined) {
        moduleMap = FileUtils.generateModuleMap(fromInfo.getDeclaringArkFile().getScene().getOhPkgContentMap());
    }
    if (!moduleMap || moduleMap.size === 0) {
        return;
    }
    const from = fromInfo.getFrom()!;
    let index: number;
    let file;
    let modulePath;
    //find file by given from like '@ohos/module/src/xxx' '@ohos/module/index'
    if ((index = from.indexOf('src')) > 0 || (index = from.indexOf('Index')) > 0 || (index = from.indexOf('index')) > 0) {
        modulePath = moduleMap.get(from.substring(0, index).replace(/\/*$/, ''));
        file = findFileInModule(fromInfo, modulePath, from.substring(index));
    }
    if (file) {
        return file;
    }
    modulePath = modulePath ?? moduleMap.get(from);
    if (!modulePath) {
        return file;
    }
    //find file in module json main path
    if (modulePath.main) {
        file = getArkFileFromScene(fromInfo, modulePath.main);
    }
    //find file in module path Index.ts
    if (!file && FileUtils.isDirectory(modulePath.path)) {
        file = findFileInModule(fromInfo, modulePath, FileUtils.getIndexFileName(modulePath.path));
    }
    //find file in module path/src/main/ets/TsIndex.ts
    if (!file) {
        file = findFileInModule(fromInfo, modulePath, '/src/main/ets/TsIndex.ts');
    }
    return file;
}

function findFileInModule(fromInfo: FromInfo, modulePath: ModulePath | undefined, contentPath: string) {
    if (!modulePath) {
        return;
    }
    const originPath = path.join(modulePath.path, contentPath);
    let file;
    if (originPath !== modulePath.main) {
        file = getArkFileFromScene(fromInfo, originPath);
    }
    if (file && findExportInfoInfile(fromInfo, file)) {
        return file;
    }
}

