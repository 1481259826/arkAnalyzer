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

import { Scene } from "../../../Scene";
import { AbstractInvokeExpr } from "../../base/Expr";
import { ModelUtils } from "../../common/ModelUtils";
import { ArkMethod } from "../../model/ArkMethod";

export abstract class AbstractAnalysis {
    private scene: Scene
    constructor(s: Scene) {
        this.scene = s
    }

    public getScene(): Scene {
        return this.scene
    }

    public resolveInvokeExpr(invokeExpr: AbstractInvokeExpr): ArkMethod | undefined {
        const method = this.scene.getMethod(invokeExpr.getMethodSignature())
        if (method != null) {
            return method
        }

        const methodSignature = invokeExpr.getMethodSignature()
        const sdkFiles = this.scene.getSdkArkFilesMap().values()
        for (let sdkFile of sdkFiles) {
            if (methodSignature.getDeclaringClassSignature().getDeclaringFileSignature().toString() == 
            sdkFile.getFileSignature().toString()) {
                const methods = ModelUtils.getAllMethodsInFile(sdkFile);
                for (let methodUnderFile of methods) {
                    if (methodSignature.toString() == methodUnderFile.getSignature().toString()) {
                        return methodUnderFile;
                    }
                }
            }
        }
    }

    public abstract buildAnalysis(): void

}