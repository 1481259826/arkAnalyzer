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

import { Local } from '../base/Local';
import { Cfg } from '../graph/Cfg';
import { Stmt } from '../base/Stmt';
import { AliasType, AliasTypeDeclaration } from '../base/Type';

export class ArkBody {
    private locals: Map<string, Local>;
    private originalCfg: Cfg;
    private cfg: Cfg;
    private stmtToOriginalStmt: Map<Stmt, Stmt>;
    private aliasTypeMap: Map<string, [AliasType, AliasTypeDeclaration]> = new Map();

    constructor(locals: Set<Local>, originalCfg: Cfg, cfg: Cfg, stmtToOriginalStmt: Map<Stmt, Stmt>, aliasTypeMap: Map<string, [AliasType, AliasTypeDeclaration]>) {
        this.originalCfg = originalCfg;
        this.cfg = cfg;
        this.stmtToOriginalStmt = stmtToOriginalStmt;
        this.aliasTypeMap = aliasTypeMap;
        this.locals = new Map<string, Local>();
        locals.forEach(local => this.locals.set(local.getName(), local));
    }

    public getLocals(): Map<string, Local> {
        return this.locals;
    }

    public setLocals(locals: Set<Local>): void {
        if (!this.locals) {
            this.locals = new Map<string, Local>();
        }
        locals.forEach(local => this.locals.set(local.getName(), local));
    }

    public getCfg(): Cfg {
        return this.cfg;
    }

    public setCfg(cfg: Cfg): void {
        this.cfg = cfg;
    }

    public getOriginalCfg(): Cfg {
        return this.originalCfg;
    }

    public setOriginalCfg(originalCfg: Cfg): void {
        this.originalCfg = originalCfg;
    }

    public getStmtToOriginalStmt(): Map<Stmt, Stmt> {
        return this.stmtToOriginalStmt;
    }

    public getAliasTypeMap(): Map<string, [AliasType, AliasTypeDeclaration]> {
        return this.aliasTypeMap;
    }

    public getAliasTypeByName(name: string): AliasType | null {
        const aliasTypeInfo: [AliasType, AliasTypeDeclaration] | undefined = this.aliasTypeMap.get(name);
        if (aliasTypeInfo) {
            return aliasTypeInfo[0];
        }
        return null;
    }
}