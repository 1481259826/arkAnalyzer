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

import { ArkBody } from '../model/ArkBody';
import { ArkMethod } from '../model/ArkMethod';
import { MethodSignature } from '../model/ArkSignature';
import { CfgBuilder } from './CfgBuilder';
import * as ts from 'ohos-typescript';

export class BodyBuilder {
    private cfgBuilder: CfgBuilder;
    private methodSignature: MethodSignature;

    constructor(methodSignature: MethodSignature, sourceAstNode: ts.Node, declaringMethod: ArkMethod, sourceFile: ts.SourceFile) {
        this.methodSignature = methodSignature;
        this.cfgBuilder = new CfgBuilder(sourceAstNode, this.methodSignature.getMethodSubSignature().getMethodName(), declaringMethod, sourceFile);
    }

    public build(): ArkBody {
        this.cfgBuilder.buildCfgBuilder();
        const {cfg, originalCfg, stmtToOriginalStmt, locals} = this.cfgBuilder.buildCfgAndOriginalCfg();
        cfg.buildDefUseStmt();

        return new ArkBody(this.methodSignature, locals, originalCfg, cfg, stmtToOriginalStmt);
    }
}