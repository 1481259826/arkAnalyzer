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

import { ArkInstanceInvokeExpr } from '../../core/base/Expr';
import { Local } from '../../core/base/Local';
import { ArkAssignStmt, ArkGotoStmt, ArkIfStmt, ArkInvokeStmt, ArkSwitchStmt, Stmt } from '../../core/base/Stmt';
import { BasicBlock } from '../../core/graph/BasicBlock';
import { ArkBody } from '../../core/model/ArkBody';
import { ArkMethod } from '../../core/model/ArkMethod';
import Logger from '../../utils/logger';
import { ArkCodeBuffer } from '../ArkStream';
import {
    SourceBreakStmt,
    SourceCaseStmt,
    SourceCompoundEndStmt,
    SourceContinueStmt,
    SourceElseStmt,
    SourceForStmt,
    SourceIfStmt,
    SourceStmt,
    SourceSwitchStmt,
    SourceWhileStmt,
    stmt2SourceStmt,
    StmtPrinterContext,
} from './SourceStmt';
import { CfgUitls } from '../../utils/CfgUtils';
import { ArkClass } from '../../core/model/ArkClass';
import { ArkFile } from '../../core/model/ArkFile';
import { ClassSignature, MethodSignature } from '../../core/model/ArkSignature';
import { ModelUtils } from '../../core/common/ModelUtils';
import { SourceUtils } from './SourceUtils';

const logger = Logger.getLogger();

export class SourceBody implements StmtPrinterContext {
    protected printer: ArkCodeBuffer;
    private arkBody: ArkBody;
    private stmts: SourceStmt[] = [];
    private method: ArkMethod;
    private cfgUtils: CfgUitls;
    private tempCodeMap: Map<string, string>;
    private tempVisitor: Set<string>;
    private stmtReader: StmtReader;
    private definedLocals: Set<Local>;
    private inBuilder: boolean;

    public constructor(indent: string, method: ArkMethod, inBuilder: boolean) {
        this.printer = new ArkCodeBuffer(indent);
        this.method = method;
        this.arkBody = method.getBody()!;
        this.cfgUtils = new CfgUitls(method.getCfg()!);
        this.tempCodeMap = new Map();
        this.tempVisitor = new Set();
        this.definedLocals = new Set();
        this.inBuilder = inBuilder;
        this.buildSourceStmt();
    }

    isInBuilderMethod(): boolean {
        return this.inBuilder;
    }
    isInDefaultMethod(): boolean {
        return this.method.isDefaultArkMethod();
    }
    public getArkFile(): ArkFile {
        return this.method.getDeclaringArkFile();
    }

    public getMethod(signature: MethodSignature): ArkMethod | null {
        let method = this.method.getDeclaringArkFile().getScene().getMethod(signature);
        if (method) {
            return method;
        }
        return this.method.getDeclaringArkClass().getMethodWithName(signature.getMethodSubSignature().getMethodName())
    }

    public getClass(signature: ClassSignature): ArkClass | null {
        return ModelUtils.getClass(this.method, signature);
    }

    public getLocals(): Map<string, Local> {
        return this.arkBody.getLocals();
    }

    public defineLocal(local: Local): void {
        this.definedLocals.add(local);
    }

    public isLocalDefined(local: Local): boolean {
        return this.definedLocals.has(local);
    }

    public getStmtReader(): StmtReader {
        return this.stmtReader;
    }

    public setTempCode(temp: string, code: string): void {
        this.tempCodeMap.set(temp, code);
    }

    public transTemp2Code(temp: Local): string {
        if (this.tempCodeMap.has(temp.getName()) && SourceUtils.isTemp(temp.getName())) {
            this.tempVisitor.add(temp.getName());
            return this.tempCodeMap.get(temp.getName())!;
        }

        return temp.getName();
    }

    public getTempCodeMap(): Map<string, string> {
        return this.tempCodeMap;
    }

    public hasTempVisit(temp: string): boolean {
        return this.tempVisitor.has(temp);
    }

    public setTempVisit(temp: string): void {
        this.tempVisitor.add(temp);
    }

    public getPrinter(): ArkCodeBuffer {
        return this.printer;
    }

    public dump(): string {
        this.printStmts();
        return this.printer.toString();
    }

    private buildSourceStmt(): void {
        let blocks = this.arkBody.getCfg().getBlocks();
        let visitor = new Set<BasicBlock>();

        for (const block of blocks) {
            if (visitor.has(block)) {
                continue;
            }
            visitor.add(block);
            this.buildBasicBlock(block, visitor, null);
        }
    }

    private buildBasicBlock(block: BasicBlock, visitor: Set<BasicBlock>, parent: Stmt | null): void {
        let originalStmts: Stmt[] = this.sortStmt(block.getStmts());
        this.stmtReader = new StmtReader(originalStmts);
        while (this.stmtReader.hasNext()) {
            let stmt = this.stmtReader.next();
            if (stmt instanceof ArkIfStmt) {
                let isLoop = false;
                if (this.cfgUtils.isForBlock(block)) {
                    this.pushStmt(new SourceForStmt(this, stmt));
                    isLoop = true;
                } else if (this.cfgUtils.isWhileBlock(block)) {
                    this.pushStmt(new SourceWhileStmt(this, stmt));
                    isLoop = true;
                }
                if (isLoop) {
                    for (const sub of this.cfgUtils.getLoopPath(block) as Set<BasicBlock>) {
                        if (visitor.has(sub)) {
                            continue;
                        }
                        visitor.add(sub);
                        this.buildBasicBlock(sub, visitor, parent);
                    }
                    this.pushStmt(new SourceCompoundEndStmt(this, stmt, '}'));
                } else {
                    this.pushStmt(new SourceIfStmt(this, stmt));
                    let successorBlocks = block.getSuccessors();
                    if (successorBlocks.length > 0 && !visitor.has(successorBlocks[0])) {
                        visitor.add(successorBlocks[0]);
                        this.buildBasicBlock(successorBlocks[0], visitor, stmt);
                    }

                    if (
                        successorBlocks.length > 1 &&
                        this.cfgUtils.isIfElseBlock(block) &&
                        !visitor.has(successorBlocks[1])
                    ) {
                        this.pushStmt(new SourceElseStmt(this, stmt));
                        visitor.add(successorBlocks[1]);
                        this.buildBasicBlock(successorBlocks[1], visitor, stmt);
                    }
                    this.pushStmt(new SourceCompoundEndStmt(this, stmt, '}'));
                }
            } else if (stmt instanceof ArkSwitchStmt) {
                this.pushStmt(new SourceSwitchStmt(this, stmt));
                let caseIdx = 0;
                for (const sub of block.getSuccessors()) {
                    if (!visitor.has(sub)) {
                        visitor.add(sub);
                        let caseStmt = new SourceCaseStmt(this, stmt, caseIdx);
                        this.pushStmt(caseStmt);
                        this.buildBasicBlock(sub, visitor, stmt);
                        if (caseStmt.isDefault()) {
                            this.pushStmt(new SourceCompoundEndStmt(this, stmt, ''));
                        }
                    }
                    caseIdx++;
                }
                this.pushStmt(new SourceCompoundEndStmt(this, stmt, '}'));
            } else if (stmt instanceof ArkGotoStmt) {
                if (parent instanceof ArkSwitchStmt) {
                    this.pushStmt(new SourceCompoundEndStmt(this, stmt, '    break;'));
                } else {
                    if (this.cfgUtils.isConinueBlock(block)) {
                        this.pushStmt(new SourceContinueStmt(this, stmt));
                    } else {
                        this.pushStmt(new SourceBreakStmt(this, stmt));
                    }
                }
            } else {
                this.pushStmt(stmt2SourceStmt(this, stmt));
            }
        }
    }

    private printStmts(): void {
        for (let stmt of this.stmts) {
            this.printer.write(stmt.dump());
        }
    }

    public getStmts(): SourceStmt[] {
        return this.stmts;
    }

    public pushStmt(stmt: SourceStmt): void {
        let lastLine = this.getLastLine();
        if (stmt.getLine() < lastLine) {
            stmt.setLine(lastLine + 0.1);
        }
        stmt.transfer2ts();
        this.stmts.push(stmt);
    }

    private getLastLine(): number {
        if (this.stmts.length > 0) {
            return this.stmts[this.stmts.length - 1].getLine();
        }

        return 0;
    }

    /*
     * temp9 = new <>.<>();                            temp10 = new Array<number>(3);
     * temp10 = new Array<number>(3);                  temp10[0] = 'Cat';
     * temp10[0] = 'Cat';                        ==>   temp10[1] = 'Dog';
     * temp10[1] = 'Dog';                              temp10[2] = 'Hamster';
     * temp10[2] = 'Hamster';                          temp9 = new <>.<>();
     * temp9.constructor(temp10);                      temp9.constructor(temp10);
     */
    private sortStmt(stmts: Stmt[]): Stmt[] {
        for (let i = stmts.length - 1; i > 0; i--) {
            if (stmts[i] instanceof ArkInvokeStmt && (stmts[i].getInvokeExpr() as ArkInstanceInvokeExpr)) {
                let instanceInvokeExpr = stmts[i].getInvokeExpr() as ArkInstanceInvokeExpr;
                if ('constructor' == instanceInvokeExpr.getMethodSignature().getMethodSubSignature().getMethodName()) {
                    let localName = instanceInvokeExpr.getBase().getName();
                    let newExprIdx = findNewExpr(i, localName);
                    if (newExprIdx >= 0 && newExprIdx < i - 1) {
                        moveStmt(i, newExprIdx);
                    }
                }
            }
        }
        return stmts;

        function findNewExpr(constructorIdx: number, name: string): number {
            for (let j = constructorIdx - 1; j >= 0; j--) {
                if (!(stmts[j] instanceof ArkAssignStmt)) {
                    continue;
                }
                if ((stmts[j] as ArkAssignStmt).getLeftOp() instanceof Local) {
                    if (((stmts[j] as ArkAssignStmt).getLeftOp() as Local).getName() == name) {
                        return j;
                    }
                }
            }
            return -1;
        }

        function moveStmt(constructorIdx: number, newExprIdx: number): void {
            let back = stmts[newExprIdx];
            for (let i = newExprIdx; i < constructorIdx - 1; i++) {
                stmts[i] = stmts[i + 1];
            }
            stmts[constructorIdx - 1] = back;
        }
    }
}

export class StmtReader {
    private stmts: Stmt[] = [];
    private pos: number;

    constructor(stmts: Stmt[]) {
        this.stmts = stmts;
        this.pos = 0;
    }

    first(): Stmt {
        return this.stmts[0];
    }

    hasNext(): boolean {
        return this.pos < this.stmts.length;
    }

    next(): Stmt {
        if (!this.hasNext()) {
            logger.error('SourceBody: StmtReader->next No more stmt.');
            throw new Error('No more stmt.');
        }
        let stmt = this.stmts[this.pos];
        this.pos++;
        return stmt;
    }

    rollback(): void {
        if (this.pos == 0) {
            logger.error('SourceBody: StmtReader->rollback No more stmt to rollback.');
            throw new Error('No more stmt to rollback.');
        }
        this.pos--;
    }
}
