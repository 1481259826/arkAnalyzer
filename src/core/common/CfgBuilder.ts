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

import * as ts from 'ohos-typescript';
import Logger from '../../utils/logger';
import { Local } from '../base/Local';
import { ArkParameterRef, ArkThisRef } from '../base/Ref';
import { ArkAssignStmt, ArkGotoStmt, ArkIfStmt, ArkReturnVoidStmt, Stmt } from '../base/Stmt';
import {
    AnnotationNamespaceType,
    AnnotationTypeQueryType,
    ArrayType,
    TupleType,
    Type,
    UnionType,
    UnknownType,
} from '../base/Type';
import { BasicBlock } from '../graph/BasicBlock';
import { Cfg } from '../graph/Cfg';
import { ArkClass } from '../model/ArkClass';
import { ArkMethod } from '../model/ArkMethod';
import { TypeInference } from './TypeInference';
import { ArkIRTransformer } from './ArkIRTransformer';
import { LineColPosition } from '../base/Position';
import { COMPONENT_BUILD_FUNCTION } from './EtsConst';

const logger = Logger.getLogger();

class StatementBuilder {
    type: string;
    //节点对应源代码    
    code: string;
    next: StatementBuilder | null;
    lasts: Set<StatementBuilder>;
    walked: boolean;
    index: number;
    // TODO:以下两个属性需要获取    
    line: number;//行号//ast节点存了一个start值为这段代码的起始地址，可以从start开始往回查原文有几个换行符确定行号    
    column: number; // 列  
    astNode: ts.Node | null;//ast节点对象
    scopeID: number;
    addressCode3: string[];
    threeAddressStmts: Stmt[];
    block: Block | null;
    ifExitPass: boolean;
    passTmies: number = 0;
    numOfIdentifier: number = 0;
    isDoWhile: boolean = false;

    constructor(type: string, code: string, astNode: ts.Node | null, scopeID: number) {
        this.type = type;
        this.code = code;
        this.next = null;
        this.lasts = new Set();
        this.walked = false;
        this.index = 0;
        this.line = -1;
        this.column = -1;
        this.astNode = astNode;
        this.scopeID = scopeID;
        this.threeAddressStmts = [];
        this.block = null;
        this.ifExitPass = false;
    }
}

class ConditionStatementBuilder extends StatementBuilder {
    nextT: StatementBuilder | null;
    nextF: StatementBuilder | null;
    loopBlock: Block | null;
    condition: string;
    doStatement: StatementBuilder | null = null;

    constructor(type: string, code: string, astNode: ts.Node, scopeID: number) {
        super(type, code, astNode, scopeID);
        this.nextT = null;
        this.nextF = null;
        this.loopBlock = null;
        this.condition = '';
    }
}

class SwitchStatementBuilder extends StatementBuilder {
    nexts: StatementBuilder[];
    cases: Case[] = [];
    default: StatementBuilder | null = null;

    constructor(type: string, code: string, astNode: ts.Node, scopeID: number) {
        super(type, code, astNode, scopeID);
        this.nexts = [];
    }
}

class TryStatementBuilder extends StatementBuilder {
    tryFirst: StatementBuilder | null = null;
    tryExit: StatementBuilder | null = null;
    catchStatement: StatementBuilder | null = null;
    catchError: string = '';
    finallyStatement: StatementBuilder | null = null;

    constructor(type: string, code: string, astNode: ts.Node, scopeID: number) {
        super(type, code, astNode, scopeID);
    }
}

class Case {
    value: string;
    stmt: StatementBuilder;

    constructor(value: string, stmt: StatementBuilder) {
        this.value = value;
        this.stmt = stmt;
    }
}

class DefUseChain {
    def: StatementBuilder;
    use: StatementBuilder;

    constructor(def: StatementBuilder, use: StatementBuilder) {
        this.def = def;
        this.use = use;
    }
}

class Variable {
    name: string;
    lastDef: StatementBuilder;
    defUse: DefUseChain[];
    properties: Variable[] = [];
    propOf: Variable | null = null;

    constructor(name: string, lastDef: StatementBuilder) {
        this.name = name;
        this.lastDef = lastDef;
        this.defUse = [];
    }
}

class Scope {
    id: number;
    level: number;
    parent: Scope | null;

    constructor(id: number, variable: Set<String>, level: number) {
        this.id = id;
        this.level = level;
        this.parent = null;
    }
}

class Block {
    id: number;
    stmts: StatementBuilder[];
    nexts: Set<Block>;
    lasts: Set<Block>;
    walked: boolean = false;

    constructor(stmts: StatementBuilder[]) {
        this.stmts = stmts;
        this.nexts = new Set();
        this.lasts = new Set();
    }
}

class Catch {
    errorName: string;
    from: number;
    to: number;
    withLabel: number;

    constructor(errorName: string, from: number, to: number, withLabel: number) {
        this.errorName = errorName;
        this.from = from;
        this.to = to;
        this.withLabel = withLabel;
    }
}

class textError extends Error {
    constructor(message: string) {
        // 调用父类的构造函数，并传入错误消息
        super(message);

        // 设置错误类型的名称
        this.name = 'textError';
    }
}

export class CfgBuilder {
    name: string;
    astRoot: ts.Node;
    entry: StatementBuilder;
    exit: StatementBuilder;
    loopStack: ConditionStatementBuilder[];
    switchExitStack: StatementBuilder[];
    functions: CfgBuilder[];
    breakin: string;
    statementArray: StatementBuilder[];
    dotEdges: number[][];
    scopes: Scope[];
    scopeLevel: number;
    tempVariableNum: number;
    current3ACstm: StatementBuilder;
    blocks: Block[];
    entryBlock: Block;
    exitBlock: Block;
    currentDeclarationKeyword: string;
    variables: Variable[];
    declaringClass: ArkClass;
    importFromPath: string[];
    catches: Catch[];
    exits: StatementBuilder[] = [];

    private sourceFile: ts.SourceFile;
    private declaringMethod: ArkMethod;

    private arkIRTransformer: ArkIRTransformer;

    constructor(ast: ts.Node, name: string, declaringMethod: ArkMethod, sourceFile: ts.SourceFile) {
        this.name = name;
        this.astRoot = ast;
        this.declaringMethod = declaringMethod;
        this.declaringClass = declaringMethod.getDeclaringArkClass();
        this.entry = new StatementBuilder('entry', '', ast, 0);
        this.loopStack = [];
        this.switchExitStack = [];
        this.functions = [];
        this.breakin = '';
        this.statementArray = [];
        this.dotEdges = [];
        this.exit = new StatementBuilder('exit', 'return;', null, 0);
        this.scopes = [];
        this.scopeLevel = 0;
        this.tempVariableNum = 0;
        this.current3ACstm = this.entry;
        this.blocks = [];
        this.entryBlock = new Block([this.entry]);
        this.exitBlock = new Block([this.entry]);
        this.currentDeclarationKeyword = '';
        this.variables = [];
        this.importFromPath = [];
        this.catches = [];
        this.sourceFile = sourceFile;
        this.arkIRTransformer = new ArkIRTransformer(this.sourceFile, this.declaringMethod);
    }

    walkAST(lastStatement: StatementBuilder, nextStatement: StatementBuilder, nodes: ts.Node[]) {
        function judgeLastType(s: StatementBuilder) {
            if (lastStatement.type == 'ifStatement') {
                let lastIf = lastStatement as ConditionStatementBuilder;
                if (lastIf.nextT == null) {
                    lastIf.nextT = s;
                    s.lasts.add(lastIf);
                } else {
                    lastIf.nextF = s;
                    s.lasts.add(lastIf);
                }
            } else if (lastStatement.type == 'loopStatement') {
                let lastLoop = lastStatement as ConditionStatementBuilder;
                lastLoop.nextT = s;
                s.lasts.add(lastLoop);
            } else if (lastStatement.type == 'catchOrNot') {
                let lastLoop = lastStatement as ConditionStatementBuilder;
                lastLoop.nextT = s;
                s.lasts.add(lastLoop);
            } else {
                lastStatement.next = s;
                s.lasts.add(lastStatement);
            }

        }

        this.scopeLevel++;
        let scope = new Scope(this.scopes.length, new Set(), this.scopeLevel);
        for (let i = this.scopes.length - 1; i >= 0; i--) {
            if (this.scopes[i].level == this.scopeLevel - 1) {
                scope.parent = this.scopes[i];
                break;
            }
        }
        this.scopes.push(scope);

        for (let i = 0; i < nodes.length; i++) {
            let c = nodes[i];
            if (ts.isVariableStatement(c) || ts.isExpressionStatement(c) || ts.isThrowStatement(c)) {
                let s = new StatementBuilder('statement', c.getText(this.sourceFile), c, scope.id);
                judgeLastType(s);
                lastStatement = s;
            } else if (ts.isReturnStatement(c)) {
                let s = new StatementBuilder('returnStatement', c.getText(this.sourceFile), c, scope.id);
                judgeLastType(s);
                s.astNode = c;
                lastStatement = s;
                break;
            } else if (ts.isBreakStatement(c)) {
                let brstm = new StatementBuilder('breakStatement', 'break;', c, scope.id);
                judgeLastType(brstm);
                let p: ts.Node | null = c;
                while (p) {
                    if (ts.SyntaxKind[p.kind].includes('While') || ts.SyntaxKind[p.kind].includes('For')) {
                        brstm.next = this.loopStack[this.loopStack.length - 1].nextF;
                        this.loopStack[this.loopStack.length - 1].nextF?.lasts.add(brstm);
                        break;
                    }
                    if (ts.SyntaxKind[p.kind].includes('CaseClause') || ts.SyntaxKind[p.kind].includes('DefaultClause')) {
                        brstm.next = this.switchExitStack[this.switchExitStack.length - 1];
                        this.switchExitStack[this.switchExitStack.length - 1].lasts.add(brstm.next);
                        break;
                    }
                    p = p.parent;
                }
                lastStatement = brstm;
            } else if (ts.isContinueStatement(c)) {
                let constm = new StatementBuilder('continueStatement', 'continue;', c, scope.id);
                judgeLastType(constm);
                constm.next = this.loopStack[this.loopStack.length - 1];
                this.loopStack[this.loopStack.length - 1].lasts.add(constm);
                lastStatement = constm;
            } else if (ts.isIfStatement(c)) {
                let ifstm: ConditionStatementBuilder = new ConditionStatementBuilder('ifStatement', '', c, scope.id);
                judgeLastType(ifstm);
                let ifexit: StatementBuilder = new StatementBuilder('ifExit', '', c, scope.id);
                ifstm.condition = c.expression.getText(this.sourceFile);
                ifstm.code = 'if (' + ifstm.condition + ')';
                if (ts.isBlock(c.thenStatement)) {
                    this.walkAST(ifstm, ifexit, [...c.thenStatement.statements]);
                } else {
                    this.walkAST(ifstm, ifexit, [c.thenStatement]);
                }
                if (c.elseStatement) {
                    if (ts.isBlock(c.elseStatement)) {
                        this.walkAST(ifstm, ifexit, [...c.elseStatement.statements]);
                    } else {
                        this.walkAST(ifstm, ifexit, [c.elseStatement]);
                    }
                }
                if (!ifstm.nextT) {
                    ifstm.nextT = ifexit;
                    ifexit.lasts.add(ifstm);
                }
                if (!ifstm.nextF) {
                    ifstm.nextF = ifexit;
                    ifexit.lasts.add(ifstm);
                }
                lastStatement = ifexit;
            } else if (ts.isWhileStatement(c)) {
                this.breakin = 'loop';
                let loopstm = new ConditionStatementBuilder('loopStatement', '', c, scope.id);
                this.loopStack.push(loopstm);
                judgeLastType(loopstm);
                let loopExit = new StatementBuilder('loopExit', '', c, scope.id);
                this.exits.push(loopExit);
                loopstm.nextF = loopExit;
                loopExit.lasts.add(loopstm);
                loopstm.condition = c.expression.getText(this.sourceFile);
                loopstm.code = 'if (' + loopstm.condition + ')';
                if (ts.isBlock(c.statement)) {
                    this.walkAST(loopstm, loopstm, [...c.statement.statements]);
                } else {
                    this.walkAST(loopstm, loopstm, [c.statement]);
                }
                if (!loopstm.nextF) {
                    loopstm.nextF = loopExit;
                    loopExit.lasts.add(loopstm);
                }
                if (!loopstm.nextT) {
                    loopstm.nextT = loopExit;
                    loopExit.lasts.add(loopstm);
                }
                lastStatement = loopExit;
                this.loopStack.pop();
            }
            if (ts.isForStatement(c) || ts.isForInStatement(c) || ts.isForOfStatement(c)) {
                this.breakin = 'loop';
                let loopstm = new ConditionStatementBuilder('loopStatement', '', c, scope.id);
                this.loopStack.push(loopstm);
                judgeLastType(loopstm);
                let loopExit = new StatementBuilder('loopExit', '', c, scope.id);
                this.exits.push(loopExit);
                loopstm.nextF = loopExit;
                loopExit.lasts.add(loopstm);
                if (ts.isForStatement(c)) {
                    loopstm.code = c.initializer?.getText(this.sourceFile) + '; ' + c.condition?.getText(this.sourceFile) + '; ' + c.incrementor?.getText(this.sourceFile);
                } else if (ts.isForOfStatement(c)) {
                    loopExit.code = c.initializer?.getText(this.sourceFile) + ' of ' + c.expression.getText(this.sourceFile);
                } else {
                    loopExit.code = c.initializer?.getText(this.sourceFile) + ' in ' + c.expression.getText(this.sourceFile);
                }
                if (ts.isBlock(c.statement)) {
                    this.walkAST(loopstm, loopstm, [...c.statement.statements]);
                } else {
                    this.walkAST(loopstm, loopstm, [c.statement]);
                }
                if (!loopstm.nextF) {
                    loopstm.nextF = loopExit;
                    loopExit.lasts.add(loopstm);
                }
                if (!loopstm.nextT) {
                    loopstm.nextT = loopExit;
                    loopExit.lasts.add(loopstm);
                }
                lastStatement = loopExit;
                this.loopStack.pop();
            } else if (ts.isDoStatement(c)) {
                this.breakin = 'loop';
                let loopstm = new ConditionStatementBuilder('loopStatement', '', c, scope.id);
                this.loopStack.push(loopstm);
                let loopExit = new StatementBuilder('loopExit', '', c, scope.id);
                this.exits.push(loopExit);
                loopstm.nextF = loopExit;
                loopExit.lasts.add(loopstm);
                loopstm.condition = c.expression.getText(this.sourceFile);
                loopstm.code = 'while (' + loopstm.condition + ')';
                if (ts.isBlock(c.statement)) {
                    this.walkAST(lastStatement, loopstm, [...c.statement.statements]);
                } else {
                    this.walkAST(lastStatement, loopstm, [c.statement]);
                }
                let lastType = lastStatement.type;
                if (lastType == 'ifStatement' || lastType == 'loopStatement') {
                    let lastCondition = lastStatement as ConditionStatementBuilder;
                    loopstm.nextT = lastCondition.nextT;
                    lastCondition.nextT?.lasts.add(loopstm);
                } else {
                    loopstm.nextT = lastStatement.next;
                    lastStatement.next?.lasts.add(loopstm);
                }
                if (loopstm.nextT && loopstm.nextT != loopstm) {
                    loopstm.nextT.isDoWhile = true;
                    loopstm.doStatement = loopstm.nextT;
                }
                lastStatement = loopExit;
                this.loopStack.pop();
            } else if (ts.isSwitchStatement(c)) {
                this.breakin = 'switch';
                let switchstm = new SwitchStatementBuilder('switchStatement', '', c, scope.id);
                judgeLastType(switchstm);
                let switchExit = new StatementBuilder('switchExit', '', null, scope.id);
                this.exits.push(switchExit);
                this.switchExitStack.push(switchExit);
                switchExit.code = 'switch (' + c.expression + ')';
                let lastCaseExit: StatementBuilder | null = null;
                for (let i = 0; i < c.caseBlock.clauses.length; i++) {
                    const clause = c.caseBlock.clauses[i];
                    let casestm: StatementBuilder;
                    if (ts.isCaseClause(clause)) {
                        casestm = new StatementBuilder('statement', 'case ' + clause.expression + ':', clause, scope.id);
                    } else {
                        casestm = new StatementBuilder('statement', 'default:', clause, scope.id);
                    }

                    switchstm.nexts.push(casestm);
                    casestm.lasts.add(switchstm);
                    let caseExit = new StatementBuilder('caseExit', '', null, scope.id);
                    this.exits.push(caseExit);
                    this.walkAST(casestm, caseExit, [...clause.statements]);
                    if (ts.isCaseClause(clause)) {
                        const cas = new Case(casestm.code, casestm.next!);
                        switchstm.cases.push(cas);
                    } else {
                        switchstm.default = casestm.next;
                        casestm.next?.lasts.add(switchstm);
                    }

                    if (lastCaseExit) {
                        lastCaseExit.next = casestm.next;
                        casestm.next?.lasts.add(lastCaseExit);
                    }
                    lastCaseExit = caseExit;
                    if (i == c.caseBlock.clauses.length - 1) {
                        caseExit.next = switchExit;
                        switchExit.lasts.add(caseExit);
                    }
                }

                lastStatement = switchExit;
                this.switchExitStack.pop();
            } else if (ts.isBlock(c)) {
                let blockExit = new StatementBuilder('blockExit', '', c, scope.id);
                this.exits.push(blockExit);
                this.walkAST(lastStatement, blockExit, c.getChildren(this.sourceFile)[1].getChildren(this.sourceFile));
                lastStatement = blockExit;
            } else if (ts.isTryStatement(c)) {
                let trystm = new TryStatementBuilder('tryStatement', 'try', c, scope.id);
                judgeLastType(trystm);
                let tryExit = new StatementBuilder('try exit', '', c, scope.id);
                trystm.tryExit = tryExit;
                this.walkAST(trystm, tryExit, [...c.tryBlock.statements]);
                trystm.tryFirst = trystm.next;
                trystm.next?.lasts.add(trystm);
                if (c.catchClause) {
                    let text = 'catch';
                    if (c.catchClause.variableDeclaration) {
                        text += '(' + c.catchClause.variableDeclaration.getText(this.sourceFile) + ')';
                    }
                    let catchOrNot = new ConditionStatementBuilder('catchOrNot', text, c, scope.id);
                    let catchExit = new StatementBuilder('catch exit', '', c, scope.id);
                    catchOrNot.nextF = catchExit;
                    catchExit.lasts.add(catchOrNot);
                    this.walkAST(catchOrNot, catchExit, [...c.catchClause.block.statements]);
                    if (!catchOrNot.nextT) {
                        catchOrNot.nextT = catchExit;
                        catchExit.lasts.add(catchOrNot);
                    }
                    const catchStatement = new StatementBuilder('statement', catchOrNot.code, c.catchClause, catchOrNot.nextT.scopeID);
                    catchStatement.next = catchOrNot.nextT;
                    catchOrNot.nextT.lasts.add(catchStatement);
                    trystm.catchStatement = catchStatement;
                    catchStatement.lasts.add(trystm);
                    if (c.catchClause.variableDeclaration) {
                        trystm.catchError = c.catchClause.variableDeclaration.getText(this.sourceFile);
                    } else {
                        trystm.catchError = 'Error';
                    }

                }
                if (c.finallyBlock && c.finallyBlock.statements.length > 0) {
                    let final = new StatementBuilder('statement', 'finally', c, scope.id);
                    let finalExit = new StatementBuilder('finally exit', '', c, scope.id);
                    this.walkAST(final, finalExit, [...c.finallyBlock.statements]);
                    trystm.finallyStatement = final.next;
                    final.next?.lasts.add(trystm);
                }
                lastStatement = trystm;
            }

        }
        this.scopeLevel--;
        if (lastStatement.type != 'breakStatement' && lastStatement.type != 'continueStatement') {
            lastStatement.next = nextStatement;
            nextStatement.lasts.add(lastStatement);
        }
    }

    addReturnInEmptyMethod() {
        if (this.entry.next == this.exit) {
            const ret = new StatementBuilder('returnStatement', 'return;', null, this.entry.scopeID);
            this.entry.next = ret;
            ret.lasts.add(this.entry);
            ret.next = this.exit;
            this.exit.lasts = new Set([ret]);
        }
    }

    deleteExit() {
        for (const exit of this.exits) {
            for (const last of [...exit.lasts]) {
                if (last instanceof ConditionStatementBuilder) {
                    if (last.nextT == exit) {
                        last.nextT = exit.next;
                        const lasts = [...exit.next!.lasts];
                        lasts[lasts.indexOf(exit)] = last;
                        exit.next!.lasts = new Set(lasts);
                    } else if (last.nextF == exit) {
                        last.nextF = exit.next;
                        const lasts = [...exit.next!.lasts];
                        lasts[lasts.indexOf(exit)] = last;
                        exit.next!.lasts = new Set(lasts);
                    }
                } else if (last instanceof SwitchStatementBuilder) {
                    for (let i = 0; i < last.nexts.length; i++) {
                        const stmt = last.nexts[i];
                        if (stmt == exit) {
                            last.nexts[i] = exit.next!;
                            const lasts = [...exit.next!.lasts];
                            lasts[lasts.indexOf(exit)] = last;
                            exit.next!.lasts = new Set(lasts);
                        }
                    }
                } else {
                    last.next = exit.next;
                    const lasts = [...exit.next!.lasts];
                    lasts[lasts.indexOf(exit)] = last;
                    exit.next!.lasts = new Set(lasts);
                }
            }
        }
    }

    buildBlocks(): void {
        const stmtQueue = [this.entry];
        const handledStmts: Set<StatementBuilder> = new Set();
        while (stmtQueue.length > 0) {
            let stmt = stmtQueue.pop()!;
            if (stmt.type.includes('exit')) {
                continue;
            }
            if (handledStmts.has(stmt)) {
                continue;
            }
            const block = new Block([]);
            this.blocks.push(block);
            while (stmt && !handledStmts.has(stmt)) {
                if (stmt.type == 'loopStatement' && block.stmts.length > 0) {
                    stmtQueue.push(stmt);
                    break;
                }
                block.stmts.push(stmt);
                stmt.block = block;
                handledStmts.add(stmt);
                if (stmt instanceof ConditionStatementBuilder) {
                    if (!handledStmts.has(stmt.nextF!)) {
                        stmtQueue.push(stmt.nextF!);
                    }
                    if (!handledStmts.has(stmt.nextT!)) {
                        stmtQueue.push(stmt.nextT!);
                    }
                    break;
                } else if (stmt instanceof SwitchStatementBuilder) {
                    for (const cas of stmt.cases) {
                        stmtQueue.push(cas.stmt);
                    }
                    if (stmt.default) {
                        stmtQueue.push(stmt.default);
                    }
                    break;
                } else if (stmt instanceof TryStatementBuilder) {
                    if (stmt.next) {
                        stmtQueue.push(stmt.next);
                    }
                    if (stmt.finallyStatement) {
                        stmtQueue.push(stmt.finallyStatement);
                    }
                    if (stmt.catchStatement) {
                        stmtQueue.push(stmt.catchStatement);
                    }
                    if (stmt.tryFirst) {
                        stmtQueue.push(stmt.tryFirst);
                    }
                    break;
                } else {
                    if (stmt.next) {
                        if ((stmt.type == 'continueStatement' || stmt.next.type == 'loopStatement') && stmt.next.block) {
                            break;
                        }
                        if (stmt.next.type.includes('exit')) {
                            break;
                        }
                        stmt.next.passTmies++;
                        if (stmt.next.passTmies == stmt.next.lasts.size || (stmt.next.type == 'loopStatement') || stmt.next.isDoWhile) {
                            if (stmt.next.scopeID != stmt.scopeID && !(stmt.next instanceof ConditionStatementBuilder && stmt.next.doStatement)) {
                                stmtQueue.push(stmt.next);
                                break;
                            }
                            stmt = stmt.next;
                        }
                    }

                }
            }
        }
    }

    buildBlocksNextLast() {
        for (let block of this.blocks) {
            for (let originStatement of block.stmts) {
                let lastStatement = (block.stmts.indexOf(originStatement) == block.stmts.length - 1);
                if (originStatement instanceof ConditionStatementBuilder) {
                    let nextT = originStatement.nextT?.block;
                    if (nextT && (lastStatement || nextT != block) && !originStatement.nextT?.type.includes(' exit')) {
                        block.nexts.add(nextT);
                        nextT.lasts.add(block);
                    }
                    let nextF = originStatement.nextF?.block;
                    if (nextF && (lastStatement || nextF != block) && !originStatement.nextF?.type.includes(' exit')) {
                        block.nexts.add(nextF);
                        nextF.lasts.add(block);
                    }
                } else if (originStatement instanceof SwitchStatementBuilder) {
                    for (const cas of originStatement.cases) {
                        const next = cas.stmt.block;
                        if (next && (lastStatement || next != block) && !cas.stmt.type.includes(' exit')) {
                            block.nexts.add(next);
                            next.lasts.add(block);
                        }
                    }
                    if (originStatement.default) {
                        const next = originStatement.default.block;
                        if (next && (lastStatement || next != block) && !originStatement.default.type.includes(' exit')) {
                            block.nexts.add(next);
                            next.lasts.add(block);
                        }
                    }
                } else {
                    let next = originStatement.next?.block;
                    if (next && (lastStatement || next != block) && !originStatement.next?.type.includes(' exit')) {
                        block.nexts.add(next);
                        next.lasts.add(block);
                    }
                }

            }
        }
    }

    addReturnBlock() {
        let notReturnStmts: StatementBuilder[] = [];
        for (let stmt of [...this.exit.lasts]) {
            if (stmt.type != 'returnStatement') {
                notReturnStmts.push(stmt);
            }
        }
        if (notReturnStmts.length < 1) {
            return;
        }
        const returnStatement = new StatementBuilder('returnStatement', 'return;', null, this.exit.scopeID);
        if (notReturnStmts.length == 1 && !(notReturnStmts[0] instanceof ConditionStatementBuilder)) {
            const notReturnStmt = notReturnStmts[0];
            notReturnStmt.next = returnStatement;
            returnStatement.lasts = new Set([notReturnStmt]);
            returnStatement.next = this.exit;
            const lasts = [...this.exit.lasts];
            lasts[lasts.indexOf(notReturnStmt)] = returnStatement;
            this.exit.lasts = new Set(lasts);
            notReturnStmt.block?.stmts.push(returnStatement);
            returnStatement.block = notReturnStmt.block;
        } else {
            let returnBlock = new Block([returnStatement]);
            returnStatement.block = returnBlock;
            this.blocks.push(returnBlock);
            for (const notReturnStmt of notReturnStmts) {
                notReturnStmt.next = returnStatement;
                returnStatement.lasts.add(notReturnStmt);
                returnStatement.next = this.exit;
                const lasts = [...this.exit.lasts];
                lasts[lasts.indexOf(notReturnStmt)] = returnStatement;
                this.exit.lasts = new Set(lasts);
                notReturnStmt.block?.nexts.add(returnBlock);
            }
        }
    }

    resetWalked() {
        for (let stmt of this.statementArray) {
            stmt.walked = false;
        }
    }

    addStmtBuilderPosition() {
        for (const stmt of this.statementArray) {
            if (stmt.astNode) {
                const {line, character} = ts.getLineAndCharacterOfPosition(
                    this.sourceFile,
                    stmt.astNode.getStart(this.sourceFile),
                );
                stmt.line = line + 1;
                stmt.column = character + 1;
            }
        }
    }

    CfgBuilder2Array(stmt: StatementBuilder) {

        if (stmt.walked)
            return;
        stmt.walked = true;
        stmt.index = this.statementArray.length;
        if (!stmt.type.includes(' exit'))
            this.statementArray.push(stmt);
        if (stmt.type == 'ifStatement' || stmt.type == 'loopStatement' || stmt.type == 'catchOrNot') {
            let cstm = stmt as ConditionStatementBuilder;
            if (cstm.nextT == null || cstm.nextF == null) {
                this.errorTest(cstm);
                return;
            }
            this.CfgBuilder2Array(cstm.nextF);
            this.CfgBuilder2Array(cstm.nextT);
        } else if (stmt.type == 'switchStatement') {
            let sstm = stmt as SwitchStatementBuilder;
            for (let ss of sstm.nexts) {
                this.CfgBuilder2Array(ss);
            }
        } else if (stmt.type == 'tryStatement') {
            let trystm = stmt as TryStatementBuilder;
            if (trystm.tryFirst) {
                this.CfgBuilder2Array(trystm.tryFirst);
            }
            if (trystm.catchStatement) {
                this.CfgBuilder2Array(trystm.catchStatement);
            }
            if (trystm.finallyStatement) {
                this.CfgBuilder2Array(trystm.finallyStatement);
            }
            if (trystm.next) {
                this.CfgBuilder2Array(trystm.next);
            }
        } else {
            if (stmt.next != null)
                this.CfgBuilder2Array(stmt.next);
        }
    }

    getDotEdges(stmt: StatementBuilder) {
        if (this.statementArray.length == 0)
            this.CfgBuilder2Array(this.entry);
        if (stmt.walked)
            return;
        stmt.walked = true;
        if (stmt.type == 'ifStatement' || stmt.type == 'loopStatement' || stmt.type == 'catchOrNot') {
            let cstm = stmt as ConditionStatementBuilder;
            if (cstm.nextT == null || cstm.nextF == null) {
                this.errorTest(cstm);
                return;
            }
            let edge = [cstm.index, cstm.nextF.index];
            this.dotEdges.push(edge);
            edge = [cstm.index, cstm.nextT.index];
            this.dotEdges.push(edge);
            this.getDotEdges(cstm.nextF);
            this.getDotEdges(cstm.nextT);
        } else if (stmt.type == 'switchStatement') {
            let sstm = stmt as SwitchStatementBuilder;
            for (let ss of sstm.nexts) {
                let edge = [sstm.index, ss.index];
                this.dotEdges.push(edge);
                this.getDotEdges(ss);
            }
        } else {
            if (stmt.next != null) {
                let edge = [stmt.index, stmt.next.index];
                this.dotEdges.push(edge);
                this.getDotEdges(stmt.next);
            }
        }
    }

    private transformToArkIR() {
        if (this.blocks.length > 0 && this.blocks[0].stmts.length > 0) {
            const currStmt = this.blocks[0].stmts[0];
            currStmt.threeAddressStmts.push(...this.arkIRTransformer.prebuildStmts());
        }

        for (const block of this.blocks) {
            for (const originStmt of block.stmts) {
                if (originStmt.astNode && originStmt.code != '') {
                    originStmt.threeAddressStmts.push(...this.arkIRTransformer.tsNodeToStmts(originStmt.astNode));
                } else if (originStmt.code.startsWith('return')) {
                    originStmt.threeAddressStmts.push(new ArkReturnVoidStmt());
                } else if (originStmt.type == 'gotoStatement') {
                    originStmt.threeAddressStmts.push(new ArkGotoStmt());
                }
            }
        }
    }

    errorTest(stmt: StatementBuilder) {
        let mes = 'ifnext error    ';
        if (this.declaringClass?.getDeclaringArkFile()) {
            mes += this.declaringClass?.getDeclaringArkFile().getName() + '.' + this.declaringClass.getName() + '.' + this.name;
        }
        mes += '\n' + stmt.code;
        // console.log(mes)
        throw new textError(mes);
    }

    getStatementByText(text: string) {
        const ret: StatementBuilder[] = [];
        for (let stmt of this.statementArray) {
            if (stmt.code.replace(/\s/g, '') == text.replace(/\s/g, '')) {
                ret.push(stmt);
            }
        }
        return ret;
    }

    printBlocks() {
        let text = '';
        if (this.declaringClass?.getDeclaringArkFile()) {
            text += this.declaringClass.getDeclaringArkFile().getName() + '\n';
        }
        for (let bi = 0; bi < this.blocks.length; bi++) {
            let block = this.blocks[bi];
            if (bi != 0)
                text += 'label' + block.id + ':\n';
            let length = block.stmts.length;
            for (let i = 0; i < length; i++) {
                let stmt = block.stmts[i];
                if (stmt.type == 'ifStatement' || stmt.type == 'loopStatement' || stmt.type == 'catchOrNot') {
                    let cstm = stmt as ConditionStatementBuilder;
                    if (cstm.nextT == null || cstm.nextF == null) {
                        this.errorTest(cstm);
                        return;
                    }
                    if (!cstm.nextF.block || !cstm.nextT.block) {
                        this.errorTest(cstm);
                        return;
                    }
                    stmt.code = 'if !(' + cstm.condition + ') goto label' + cstm.nextF.block.id;
                    if (i == length - 1 && bi + 1 < this.blocks.length && this.blocks[bi + 1].id != cstm.nextT.block.id) {
                        let gotoStm = new StatementBuilder('gotoStatement', 'goto label' + cstm.nextT.block.id, null, block.stmts[0].scopeID);
                        block.stmts.push(gotoStm);
                        length++;
                    }
                } else if (stmt.type == 'breakStatement' || stmt.type == 'continueStatement') {
                    if (!stmt.next?.block) {
                        this.errorTest(stmt);
                        return;
                    }
                    stmt.code = 'goto label' + stmt.next?.block.id;
                } else {
                    if (i == length - 1 && stmt.next?.block && (bi + 1 < this.blocks.length && this.blocks[bi + 1].id != stmt.next.block.id || bi + 1 == this.blocks.length)) {
                        let gotoStm = new StatementBuilder('StatementBuilder', 'goto label' + stmt.next?.block.id, null, block.stmts[0].scopeID);
                        block.stmts.push(gotoStm);
                        length++;
                    }
                }
                if (stmt.addressCode3.length == 0) {
                    text += '    ' + stmt.code + '\n';
                } else {
                    for (let ac of stmt.addressCode3) {
                        if (ac.startsWith('if') || ac.startsWith('while')) {
                            let cstm = stmt as ConditionStatementBuilder;
                            let condition = ac.substring(ac.indexOf('('));
                            let goto = '';
                            if (cstm.nextF?.block)
                                goto = 'if !' + condition + ' goto label' + cstm.nextF?.block.id;
                            stmt.addressCode3[stmt.addressCode3.indexOf(ac)] = goto;
                            text += '    ' + goto + '\n';
                        } else
                            text += '    ' + ac + '\n';
                    }
                }
            }

        }
        for (let cat of this.catches) {
            text += 'catch ' + cat.errorName + ' from label ' + cat.from + ' to label ' + cat.to + ' with label' + cat.withLabel + '\n';
        }
    }

    // TODO: Add more APIs to the class 'Cfg', and use these to build Cfg
    public buildOriginalCfg(): Cfg {
        const originalCfg = new Cfg();
        const inBuildMethod = this.declaringMethod.getName() == COMPONENT_BUILD_FUNCTION;
        const stmtInBuildMethodToOriginalStmt = this.arkIRTransformer.getStmtInBuildMethodToOriginalStmt();
        const blockBuilderToBlock = new Map<Block, BasicBlock>();
        for (const blockBuilder of this.blocks) {
            const block = new BasicBlock();
            if (inBuildMethod) {
                const stmtSet = new Set<Stmt>();
                for (const stmtBuilder of blockBuilder.stmts) {
                    for (const threeAddressStmt of stmtBuilder.threeAddressStmts) {
                        if (stmtInBuildMethodToOriginalStmt.has(threeAddressStmt)) {
                            const originalStmt = stmtInBuildMethodToOriginalStmt.get(threeAddressStmt) as Stmt;
                            if (!stmtSet.has(originalStmt)) {
                                stmtSet.add(originalStmt);
                                block.addStmt(originalStmt);
                            }
                        }
                    }
                }
            } else {
                for (const stmtBuilder of blockBuilder.stmts) {
                    if (stmtBuilder.astNode == null) {
                        continue;
                    }
                    const originalStmt: Stmt = new Stmt();
                    originalStmt.setText(stmtBuilder.code);
                    const positionInfo = new LineColPosition(stmtBuilder.line, stmtBuilder.column);
                    originalStmt.setPositionInfo(positionInfo);
                    originalStmt.setOriginPositionInfo(positionInfo);
                    block.addStmt(originalStmt);
                }
            }
            originalCfg.addBlock(block);

            // build the map
            blockBuilderToBlock.set(blockBuilder, block);
        }

        // link block
        for (const [blockBuilder, block] of blockBuilderToBlock) {
            for (const successorBuilder of blockBuilder.nexts) {
                const successorBlock = blockBuilderToBlock.get(successorBuilder) as BasicBlock;
                successorBlock.addPredecessorBlock(block);
                block.addSuccessorBlock(successorBlock);
            }
        }

        return originalCfg;
    }

    // TODO: Add more APIs to class 'Cfg', and use these to build Cfg
    public buildCfg(): Cfg {
        let cfg = new Cfg();
        cfg.declaringClass = this.declaringClass;
        const inBuildMethod = this.declaringMethod.getName() == COMPONENT_BUILD_FUNCTION;
        let blockBuilderToBlock = new Map<Block, BasicBlock>();
        let isStartingStmt = true;
        for (const blockBuilder of this.blocks) {
            let block = new BasicBlock();
            for (const stmtBuilder of blockBuilder.stmts) {
                for (const threeAddressStmt of stmtBuilder.threeAddressStmts) {
                    if (isStartingStmt) {
                        cfg.setStartingStmt(threeAddressStmt);
                    }
                    if (!inBuildMethod) {
                        threeAddressStmt.setOriginPositionInfo(new LineColPosition(stmtBuilder.line, stmtBuilder.column));
                    }
                    block.addStmt(threeAddressStmt);

                    threeAddressStmt.setCfg(cfg);
                }
            }
            cfg.addBlock(block);

            // build the map
            blockBuilderToBlock.set(blockBuilder, block);
        }

        // link block
        for (const [blockBuilder, block] of blockBuilderToBlock) {
            for (const successorBuilder of blockBuilder.nexts) {
                let successorBlock = blockBuilderToBlock.get(successorBuilder) as BasicBlock;
                successorBlock.addPredecessorBlock(block);
                block.addSuccessorBlock(successorBlock);
            }
        }

        return cfg;
    }

    public getLocals(): Set<Local> {
        return this.arkIRTransformer.getLocals();
    }

    buildCfgBuilder() {
        let stmts: ts.Node[] = [];
        if (ts.isSourceFile(this.astRoot)) {
            stmts = [...this.astRoot.statements];
        } else if (ts.isFunctionDeclaration(this.astRoot) || ts.isMethodDeclaration(this.astRoot) || ts.isConstructorDeclaration(this.astRoot)
            || ts.isGetAccessor(this.astRoot) || ts.isGetAccessorDeclaration(this.astRoot) || ts.isFunctionExpression(this.astRoot)) {
            if (this.astRoot.body) {
                stmts = [...this.astRoot.body.statements];
            }
        } else if (ts.isArrowFunction(this.astRoot) && ts.isBlock(this.astRoot.body)) {
            stmts = [...this.astRoot.body.statements];
        }
        this.walkAST(this.entry, this.exit, stmts);
        this.addReturnInEmptyMethod();
        this.deleteExit();
        this.CfgBuilder2Array(this.entry);
        this.addStmtBuilderPosition();
        this.buildBlocks();
        this.blocks = this.blocks.filter((b) => b.stmts.length != 0);
        this.buildBlocksNextLast();
        this.addReturnBlock();
        this.resetWalked();
        this.transformToArkIR();
    }
}