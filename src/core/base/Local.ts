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

import { Stmt } from './Stmt';
import { Type, UnknownType } from './Type';
import { Value } from './Value';
import { ArkClass } from '../model/ArkClass';
import { TypeInference } from '../common/TypeInference';
import { ArkExport, ExportType } from '../model/ArkExport';
import { Decorator } from './Decorator';
import { ClassSignature, LocalSignature, MethodSignature } from '../model/ArkSignature';
import { ArkSignatureBuilder } from '../model/builder/ArkSignatureBuilder';
import { UNKNOWN_METHOD_NAME } from '../common/Const';

/**
 * @category core/base
 */
export class Local implements Value, ArkExport {
    private name: string;
    private type: Type;

    private originalValue: Value | null;

    private declaringStmt: Stmt | null;
    private usedStmts: Stmt[];
    private signature?: LocalSignature;
    private constFlag: boolean = false;

    constructor(name: string, type: Type = UnknownType.getInstance()) {
        this.name = name;
        this.type = type;

        this.originalValue = null;
        this.declaringStmt = null;
        this.usedStmts = [];
    }

    public inferType(arkClass: ArkClass): Local {
        if (TypeInference.isUnclearType(this.type)) {
            const type = TypeInference.inferUnclearReferenceType(this.name, arkClass);
            if (type) {
                this.type = type;
            }
        }
        return this;
    }

    public getName(): string {
        return this.name;
    }

    public setName(name: string): void {
        this.name = name;
    }

    public getType(): Type {
        return this.type;
    }

    public setType(newType: Type): void {
        this.type = newType;
    }

    public getOriginalValue(): Value | null {
        return this.originalValue;
    }

    public setOriginalValue(originalValue: Value): void {
        this.originalValue = originalValue;
    }

    public getDeclaringStmt(): Stmt | null {
        return this.declaringStmt;
    }

    public setDeclaringStmt(declaringStmt: Stmt) {
        this.declaringStmt = declaringStmt;
    }

    public getUses(): Value[] {
        return [];
    }

    public addUsedStmt(usedStmt: Stmt) {
        this.usedStmts.push(usedStmt);
    }

    public getUsedStmts(): Stmt[] {
        return this.usedStmts;
    }

    public toString(): string {
        return this.getName();
    }

    public getExportType(): ExportType {
        return ExportType.LOCAL;
    }

    public getModifiers(): Set<string | Decorator> {
        return new Set();
    }

    public getSignature(): LocalSignature {
        return this.signature ?? new LocalSignature(this.name, new MethodSignature(ClassSignature.DEFAULT,
            ArkSignatureBuilder.buildMethodSubSignatureFromMethodName(UNKNOWN_METHOD_NAME)));
    }

    public setSignature(signature: LocalSignature): void {
        this.signature = signature;
    }

    public getConstFlag(): boolean {
        return this.constFlag;
    }

    public setConstFlag(newConstFlag: boolean): void {
        this.constFlag = newConstFlag;
    }
}