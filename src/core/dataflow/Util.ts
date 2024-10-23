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

import { ArkInvokeStmt } from "../base/Stmt";
import { FunctionType } from "../base/Type";
import { ArkClass } from "../model/ArkClass";
import { ArkMethod } from "../model/ArkMethod";
import { ArkNamespace } from "../model/ArkNamespace";
import { Scene } from "../../Scene";


export const INTERNAL_PARAMETER_SOURCE: string[] = [
    '@ohos.app.ability.Want.d.ts: Want'
]

export const INTERNAL_SINK_METHOD: string[] = [
    'console.<@_UnknownProjectName/_UnknownFileName: .log()>',
    'console.<@_UnknownProjectName/_UnknownFileName: .error()>',
    'console.<@_UnknownProjectName/_UnknownFileName: .info()>',
    'console.<@_UnknownProjectName/_UnknownFileName: .warn()>',
    'console.<@_UnknownProjectName/_UnknownFileName: .assert()>'
]

const filenamePrefix = '@etsSdk/api/'

export function Json2ArkMethod(str: string, scene: Scene): ArkMethod | null {
    const mes = str.split(': ');
    const fileName = filenamePrefix + mes[0] + ': ';
    const otherMes = mes.slice(1).join(': ').split('.');
    if (otherMes.length < 3) {
        return null;
    }
    const namespaceName = otherMes[0], className = otherMes[1], methodName = otherMes[2].split('(')[0];
    let paramNames: string[] = [];
    if (otherMes[2]) {
        if (!otherMes[2].match(/\((.*?)\)/)) {
            return null;
        }
        paramNames = otherMes[2].match(/\((.*?)\)/)![1].split(',').map((item: string) => item.replace(/\s/g, '')).filter((item: string) => item !== '');
    }
    
    const file = scene.getSdkArkFilesMap().get(fileName);
    if (!file) {
        // console.log("no file: " + fileName);
        return null;
    }
    let arkClass: ArkClass | null = null;
    if (namespaceName == "_") {
        if (className == '_') {
            arkClass = file.getDefaultClass();
        } else {
            for (const clas of file.getClasses()) {
                if (clas.getName() == className) {
                    arkClass = clas;
                    break;
                }
            }
        }
    } else {
        let arkNamespace: ArkNamespace | null = null;
        for (const ns of file.getNamespaces()) {
            if (ns.getName() == namespaceName) {
                arkNamespace = ns;
                break;
            }
        }
        if (arkNamespace) {
            if (className == '_') {
                arkClass = arkNamespace.getDefaultClass()
            } else {
                for (const clas of arkNamespace.getClasses()) {
                    if (clas.getName() == className) {
                        arkClass = clas;
                        break;
                    }
                }
            }
        } else {
            // console.log("no namespace: " + namespaceName);
            return null;
        }
    }
    if (!arkClass) {
        // console.log("no class: " + className);
        return null;
    } else {
        let arkMethod: ArkMethod | null = null;
        for (const method of arkClass.getMethods()) {
            if (method.getName() == methodName) {
                arkMethod = method;
                break;
            }
        }
        if (arkMethod && arkMethod.getParameters().length == paramNames.length) {
            let paramEqual = true;
            for (let i = 0; i < arkMethod.getParameters().length; i++) {
                const param = arkMethod.getParameters()[i]
                if (param.getName() + ':' + param.getType().toString() != paramNames[i]) {
                    paramEqual = false;
                    break;
                }
            }
            if (paramEqual) {
                return arkMethod;
            }
        } else {
            // console.log("no method: " + methodName);
            return null;
        }
    }
    return null;
}

// 如果调用回调函数的函数是项目内函数就不用管，会进函数内部执行，只有是sdk函数才需要分析
export function getRecallMethodInParam(stmt: ArkInvokeStmt): ArkMethod | null {
    for (const param of stmt.getInvokeExpr().getArgs()) {
        if (param.getType() instanceof FunctionType) {
            const methodSignature = (param.getType() as FunctionType).getMethodSignature();
            const method = stmt.getCfg()?.getDeclaringMethod().getDeclaringArkClass().getMethod(methodSignature);
            if (method) {
                return method;
            }
        }
    }
    return null;
}