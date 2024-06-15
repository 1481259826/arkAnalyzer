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
import path from 'path';
import fs from 'fs';
import {ArkFile} from "../ArkFile";
import {LineColPosition} from "../../base/Position";
import {ImportInfo} from "../ArkImport";
import {buildModifiers} from "./builderUtils";
import {Decorator} from "../../base/Decorator";
import {ExportInfo, ExportType, FromInfo, TypeSignature} from "../ArkExport";
import {FileSignature} from "../ArkSignature";
import Logger from "../../../utils/logger";
import {Scene} from "../../../Scene";

const logger = Logger.getLogger();

function getProjectArkFile(im: FromInfo, originPath: string) {
    const fromSignature = new FileSignature();
    fromSignature.setProjectName(im.getDeclaringArkFile().getProjectName());
    fromSignature.setFileName(path.relative(im.getDeclaringArkFile().getProjectDir(), originPath));
    return im.getDeclaringArkFile().getScene().getFile(fromSignature);
}

export function expandExportInfo(arkFile: ArkFile) {
    let exportInfosMap = arkFile.getExportInfosMap();
    exportInfosMap.forEach((v, k) => {
        if (v.getNameBeforeAs() === '*') {
            let formFile = getArkFile(v);
            if (formFile) {
                expandExportInfo(formFile);
                let prefix = v.getExportClauseName() === '*' ? '' : v.getExportClauseName() + '.';
                formFile.getExportInfos().forEach(eInfo => {
                    let e = enrichType(eInfo);
                    let newInfo = new ExportInfo.Builder()
                        .exportClauseName(prefix + e.getExportClauseName())
                        .nameBeforeAs(e.getExportClauseName())
                        .exportClauseType(e.getExportClauseType())
                        .modifiers(v.getModifiers())
                        .typeSignature(e.getTypeSignature())
                        .originTsPosition(e.getOriginTsPosition())
                        .declaringArkFile(e.getDeclaringArkFile())
                        .build();
                    exportInfosMap.set(newInfo.getExportClauseName(), newInfo);
                })
                exportInfosMap.set(k, enrichType(v));
            }
        }
    })
}

export function getArkFile(im: FromInfo) {
    const from = im.getFrom();
    if (!from) {
        return null;
    }
    if (/^\.{1,2}\//.test(from)) {
        const originPath = path.resolve(path.dirname(im.getDeclaringArkFile().getFilePath()), from);
        return getProjectArkFile(im, originPath);
    } else if (/^@ohos\//.test(from)) {
        const originPath = getOriginPath(from, im.getDeclaringArkFile());
        const fromSignature = new FileSignature();
        fromSignature.setProjectName(im.getDeclaringArkFile().getProjectName());
        fromSignature.setFileName(path.relative(im.getDeclaringArkFile().getProjectDir(), originPath));
        return im.getDeclaringArkFile().getScene().getFile(fromSignature);
    } else {
        const sdkMap = im.getDeclaringArkFile()?.getScene()?.getSdkArkFilesMap();
        let prefix = /^@kit\./.test(from) ? '@etsSdk/kits/' : '@etsSdk/api/';
        return sdkMap?.get(prefix + from + ': ');
    }
}

export function findExportInfo(im: FromInfo): ExportInfo | null {
    let file = getArkFile(im);
    if (file === undefined || file === null) {
        logger.warn(im.getFrom() + ' file not found: ' + im.getDeclaringArkFile()?.getFileSignature()?.toString());
        return null;
    }
    if (im.getOriginName() === '*' || (im.isDefault() && file.getName().endsWith('.d.ts'))) {
        return new ExportInfo.Builder()
            .exportClauseType(ExportType.CLASS)
            .exportClauseName(im.getOriginName())
            .declaringArkFile(file)
            .typeSignature(file.getDefaultClass().getSignature())
            .build();
    }
    let eInfo = im.isDefault() ? file.getExportInfos().find(p => p.isDefault()) : file.getExportInfosMap().get(im.getOriginName());
    if (eInfo === undefined) {
        logger.warn('export info not found, ' + im.getFrom() + ' in file: ' + im.getDeclaringArkFile().getFileSignature().toString());
        return null;
    }

    return enrichType(eInfo);
}

function enrichType(eInfo: ExportInfo) {
    if (eInfo.getTypeSignature()) {
        return eInfo;
    } else if (!eInfo.getFrom()) {
        if (eInfo.getExportClauseType() === ExportType.LOCAL) {
            findDefaultMethod(eInfo);
        } else {
            let found = findClasses(eInfo);
            if (!found) {
                found = findNameSpaces(eInfo);
            }
            if (!found) {
                findDefaultMethod(eInfo);
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

function findDefaultMethod(info: ExportInfo): boolean {
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

function findClasses(info: ExportInfo): boolean {
    let classes = info.getDeclaringArkFile().getClasses();
    for (const clazz of classes) {
        if (clazz.getName() === info.getOriginName()) {
            info.setExportClauseType(ExportType.CLASS);
            info.setTypeSignature(clazz.getSignature());
            return true;
        }
    }
    return false;
}

function findNameSpaces(info: ExportInfo): boolean {
    let namespaces = info.getDeclaringArkFile().getNamespaces();
    for (const space of namespaces) {
        if (space.getName() === info.getOriginName()) {
            info.setExportClauseType(ExportType.NAME_SPACE);
            info.setTypeSignature(space.getSignature());
            return true;
        }
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

export function getOriginPath(importFrom: string, arkFile: ArkFile) {
    let index: number = -1;
    if ((index = importFrom.indexOf('src')) > 0 || (index = importFrom.indexOf('Index')) > 0 || (index = importFrom.indexOf('index')) > 0) {
        const modulePath = arkFile.getScene().getModuleScene(importFrom.substring(6, index - 1))?.getModulePath();
        return path.join(modulePath ?? '', importFrom.substring(index));
    }
    let res = '';
    const projectScene: Scene = arkFile.getScene();
    const ohPkgContentMap = projectScene.getOhPkgContentMap();

    const moduleScene = arkFile.getModuleScene();
    if (moduleScene) {
        const moduleOhPkgContent = moduleScene.getOhPkgContent();
        const moduleOhPkgFilePath = moduleScene.getOhPkgFilePath();
        if (moduleOhPkgContent != undefined) {
            res = ohPkgMatch(moduleOhPkgContent.dependencies, importFrom, moduleOhPkgFilePath, ohPkgContentMap);
        }
    }

    if (res === '') {
        const projectOhPkgContent = projectScene.getOhPkgContent();
        const projectOhPkgFilePath = projectScene.getOhPkgFilePath();
        if (projectOhPkgContent) {
            res = ohPkgMatch(projectOhPkgContent.dependencies, importFrom, projectOhPkgFilePath, ohPkgContentMap);
        }
    }
    return res;
}

function ohPkgMatch(dependencies: unknown, importFrom: string, ohFilePath: string,
                    ohPkgContentMap: Map<string, { [k: string]: unknown }>): string {
    let originPath = '';
    if (!fs.existsSync(ohFilePath) || !fs.statSync(ohFilePath).isDirectory()) {
        ohFilePath = path.dirname(ohFilePath);
    }
    if (dependencies instanceof Object) {
        Object.entries(dependencies).forEach(([k, v]) => {
            if (importFrom.startsWith(k)) {
                const pattern = new RegExp("^(\\.\\.\\/\|\\.\\/)");
                if (typeof (v) === 'string') {
                    if (pattern.test(v)) {
                        originPath = path.join(ohFilePath, v);
                    } else if (v.startsWith('file:')) {
                        originPath = path.join(ohFilePath, v.replace(/^file:/, ''));
                    }
                    // check originPath: file? dir? hap? etc.
                    if ((fs.existsSync(originPath)) && (fs.statSync(originPath).isDirectory())) {
                        let info = ohPkgContentMap.get(path.join(originPath, 'oh-package.json5'));
                        if (info != undefined) {
                            let fileName = info.main;
                            if (typeof (fileName) === 'string') {
                                originPath = path.join(originPath, fileName);
                            }
                        }
                    }
                }
            }
        });
    }
    return originPath;
}