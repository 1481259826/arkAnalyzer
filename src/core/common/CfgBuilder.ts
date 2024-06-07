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
import { ArkGotoStmt, ArkIfStmt, ArkReturnVoidStmt, Stmt } from '../base/Stmt';
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
        this.line = 0;
        this.astNode = astNode;
        this.scopeID = scopeID;
        // this.use = new Set<Variable>;
        // this.def = new Set<Variable>;
        // this.defspecial = new Set<Variable>;
        // this.addressCode3 = [];
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
    stms: StatementBuilder[];
    nexts: Set<Block>;
    lasts: Set<Block>;
    walked: boolean = false;
    loopStmt: StatementBuilder | null;

    constructor(id: number, stms: StatementBuilder[], loopStmt: StatementBuilder | null) {
        this.id = id;
        this.stms = stms;
        this.nexts = new Set();
        this.lasts = new Set();
        this.loopStmt = loopStmt;
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

function getNumOfIdentifier(node: ts.Node, sourceFile: ts.SourceFile): number {
    let num = 0;
    if (ts.SyntaxKind[node.kind] == 'Identifier')
        return 1;
    for (let child of node.getChildren(sourceFile))
        num += getNumOfIdentifier(child, sourceFile);
    return num;
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

    anonymousFuncIndex: number;
    anonymousFunctions: CfgBuilder[];

    anonymousClassIndex: number;
    private sourceFile: ts.SourceFile;
    private declaringMethod: ArkMethod;

    private locals: Set<Local> = new Set();
    private thisLocal: Local = new Local('this');
    private paraLocals: Local[] = [];

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
        this.entryBlock = new Block(this.blocks.length, [this.entry], null);
        this.exitBlock = new Block(-1, [this.entry], null);
        this.currentDeclarationKeyword = '';
        this.variables = [];
        this.importFromPath = [];
        this.catches = [];
        this.anonymousFuncIndex = 0;
        this.anonymousFunctions = [];
        this.anonymousClassIndex = 0;
        this.sourceFile = sourceFile;
        this.buildCfgBuilder();
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

        function checkBlock(node: ts.Node, sourceFile: ts.SourceFile): ts.Node | null {
            if (ts.SyntaxKind[node.kind] == 'Block')
                return node;
            else {
                let ret: ts.Node | null = null;
                for (let child of node.getChildren(sourceFile)) {
                    ret = ret || checkBlock(child, sourceFile);
                }
                return ret;
            }
        }

        function getAnonymous(node: ts.Node, sourceFile: ts.SourceFile): ts.Node | null {
            const stack: ts.Node[] = [];
            stack.push(node);
            while (stack.length > 0) {
                const n = stack.pop();
                if (!n)
                    return null;
                if (ts.SyntaxKind[n?.kind] == 'FunctionExpression' || ts.SyntaxKind[n?.kind] == 'ArrowFunction') {
                    return n;
                }
                if (n.getChildren(sourceFile)) {
                    for (let i = n.getChildren(sourceFile).length - 1; i >= 0; i--) {
                        stack.push(n.getChildren(sourceFile)[i]);
                    }
                }
            }
            return null;
        }

        // logger.info(node.getText(this.sourceFile))

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
                this.exits.push(ifexit);
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
                    this.walkAST(loopstm, loopExit, [...c.statement.statements]);
                } else {
                    this.walkAST(loopstm, loopExit, [c.statement]);
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
                    this.walkAST(loopstm, loopExit, [...c.statement.statements]);
                } else {
                    this.walkAST(loopstm, loopExit, [c.statement]);
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
            this.exit.lasts.add(ret);
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
                        last.nextF == exit;
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
                }
            }
        }
    }

    buildNewBlock(stms: StatementBuilder[]): Block {
        let block: Block;
        if (this.blocks.length > 0 && this.blocks[this.blocks.length - 1].stms.length == 0) {
            block = this.blocks[this.blocks.length - 1];
            block.stms = stms;
        } else {
            block = new Block(this.blocks.length, stms, null);
            this.blocks.push(block);
        }
        return block;
    }

    buildBlocks(stmt: StatementBuilder, block: Block) {
        if (stmt.type.includes(' exit')) {
            stmt.block = block;
            return;
        }
        if (stmt.walked || stmt.type == 'exit')
            return;
        stmt.walked = true;
        if (stmt.type == 'entry') {
            let b = this.buildNewBlock([]);
            // block.nexts.push(b);
            if (stmt.next != null)
                this.buildBlocks(stmt.next, b);
            return;
        }
        if (stmt.type != 'loopStatement' && stmt.type != 'tryStatement' || (stmt instanceof ConditionStatementBuilder && stmt.doStatement)) {
            block.stms.push(stmt);
            stmt.block = block;
        }
        if (stmt.type == 'ifStatement' || stmt.type == 'loopStatement' || stmt.type == 'catchOrNot') {
            let cstm = stmt as ConditionStatementBuilder;
            if (cstm.nextT == null || cstm.nextF == null) {
                this.errorTest(cstm);
                return;
            }
            if (cstm.type == 'loopStatement' && !cstm.doStatement) {
                let loopBlock = this.buildNewBlock([cstm]);
                block = loopBlock;
                cstm.block = block;
            }
            let b1 = this.buildNewBlock([]);
            this.buildBlocks(cstm.nextT, b1);
            let b2 = this.buildNewBlock([]);
            this.buildBlocks(cstm.nextF, b2);
        } else if (stmt.type == 'switchStatement') {
            let sstm = stmt as SwitchStatementBuilder;
            for (const cas of sstm.cases) {
                this.buildBlocks(cas.stmt, this.buildNewBlock([]));
            }
            if (sstm.default) {
                this.buildBlocks(sstm.default, this.buildNewBlock([]));
            }

        } else if (stmt.type == 'tryStatement') {
            let trystm = stmt as TryStatementBuilder;
            if (!trystm.tryFirst) {
                logger.error('try without tryFirst');
                process.exit();
            }
            let tryFirstBlock = this.buildNewBlock([]);
            trystm.block = tryFirstBlock;
            if (block.stms.length > 0) {
                block.nexts.add(tryFirstBlock);
                tryFirstBlock.lasts.add(block);
            }
            this.buildBlocks(trystm.tryFirst, tryFirstBlock);

            const lastBlocksInTry: Set<Block> = new Set();
            if (!trystm.tryExit) {
                process.exit();
            }
            for (let stmt of [...trystm.tryExit.lasts]) {
                if (stmt.block) {
                    lastBlocksInTry.add(stmt.block);
                }
            }

            let finallyBlock = this.buildNewBlock([]);
            let lastFinallyBlock: Block | null = null;
            if (trystm.finallyStatement) {
                this.buildBlocks(trystm.finallyStatement, finallyBlock);
                lastFinallyBlock = this.blocks[this.blocks.length - 1];
            } else {
                let stmt = new StatementBuilder('tmp', '', null, -1);
                finallyBlock.stms = [stmt];
            }
            for (let lastBlockInTry of lastBlocksInTry) {
                lastBlockInTry.nexts.add(finallyBlock);
                finallyBlock.lasts.add(lastBlockInTry);
            }
            if (trystm.catchStatement) {
                let catchBlock = this.buildNewBlock([]);
                this.buildBlocks(trystm.catchStatement, catchBlock);
                for (let lastBlockInTry of lastBlocksInTry) {
                    lastBlockInTry.nexts.add(catchBlock);
                    catchBlock.lasts.add(lastBlockInTry);
                }

                catchBlock.nexts.add(finallyBlock);
                finallyBlock.lasts.add(catchBlock);
                this.catches.push(new Catch(trystm.catchError, tryFirstBlock.id, finallyBlock.id, catchBlock.id));
            }
            let nextBlock = this.buildNewBlock([]);
            if (lastFinallyBlock) {
                finallyBlock = lastFinallyBlock;
            }
            if (trystm.next)
                this.buildBlocks(trystm.next, nextBlock);
            let goto = new StatementBuilder('gotoStatement', 'goto label' + nextBlock.id, null, trystm.tryFirst.scopeID);
            goto.block = finallyBlock;
            if (trystm.finallyStatement) {
                if (trystm.catchStatement)
                    finallyBlock.stms.push(goto);
            } else {
                finallyBlock.stms = [goto];
            }
            finallyBlock.nexts.add(nextBlock);
            nextBlock.lasts.add(finallyBlock);
            if (nextBlock.stms.length == 0) {
                const returnStatement = new StatementBuilder('returnStatement', 'return;', null, trystm.tryFirst.scopeID);
                goto.next = returnStatement;
                returnStatement.lasts = new Set([goto]);
                nextBlock.stms.push(returnStatement);
                returnStatement.block = nextBlock;
            }
        } else {
            if (stmt.next) {
                if (stmt.type == 'continueStatement' && stmt.next.block) {
                    return;
                }
                if (stmt.next.type == 'loopStatement' && stmt.next.block) {
                    block = stmt.next.block;
                    return;
                }

                stmt.next.passTmies++;
                if (stmt.next.passTmies == stmt.next.lasts.size || (stmt.next.type == 'loopStatement') || stmt.next.isDoWhile) {
                    if (stmt.next.scopeID != stmt.scopeID && !stmt.next.type.includes(' exit') && !(stmt.next instanceof ConditionStatementBuilder && stmt.next.doStatement)) {
                        let b = this.buildNewBlock([]);
                        block = b;
                    }
                    this.buildBlocks(stmt.next, block);
                }
            }
        }
    }

    buildBlocksNextLast() {
        for (let block of this.blocks) {
            for (let originStatement of block.stms) {
                let lastStatement = (block.stms.indexOf(originStatement) == block.stms.length - 1);
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
            notReturnStmt.block?.stms.push(returnStatement);
            returnStatement.block = notReturnStmt.block;
        } else {
            let returnBlock = new Block(this.blocks.length, [returnStatement], null);
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

    CfgBuilder2Array(stmt: StatementBuilder) {

        if (!stmt.walked)
            return;
        stmt.walked = false;
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
        const arkIRTransformer = new ArkIRTransformer(this.sourceFile, this.declaringMethod);
        if (this.blocks.length > 0 && this.blocks[0].stms.length > 0) {
            const currStmt = this.blocks[0].stms[0];
            let index = 0;
            for (const methodParameter of this.declaringMethod.getParameters()) {
                const parameterRef = new ArkParameterRef(index, methodParameter.getType());
                const {
                    value: parameterValue,
                    stmts: parameterStmts,
                } = arkIRTransformer.generateAssignStmtForValue(parameterRef);
                currStmt.threeAddressStmts.push(...parameterStmts);
                const parameterLocal = parameterValue as Local;
                parameterLocal.setName(methodParameter.getName());
                index++;
                this.paraLocals.push(parameterLocal);
            }

            const thisRef = new ArkThisRef(this.declaringClass.getSignature().getType());
            const {value: thisValue, stmts: thisStmts} = arkIRTransformer.generateAssignStmtForValue(thisRef);
            currStmt.threeAddressStmts.push(...thisStmts);
            const thisLocal = thisValue as Local;
            this.paraLocals.push(thisLocal);
        }

        for (const block of this.blocks) {
            for (const originStmt of block.stms) {
                if (originStmt.astNode && originStmt.code != '') {
                    originStmt.threeAddressStmts.push(...arkIRTransformer.tsNodeToStmts(originStmt.astNode));
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
            let length = block.stms.length;
            for (let i = 0; i < length; i++) {
                let stmt = block.stms[i];
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
                        let gotoStm = new StatementBuilder('gotoStatement', 'goto label' + cstm.nextT.block.id, null, block.stms[0].scopeID);
                        block.stms.push(gotoStm);
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
                        let gotoStm = new StatementBuilder('StatementBuilder', 'goto label' + stmt.next?.block.id, null, block.stms[0].scopeID);
                        block.stms.push(gotoStm);
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

    private addFirstBlock() {
        for (let block of this.blocks) {
            block.id += 1;
        }
        this.blocks.splice(0, 0, new Block(0, [], null));
    }

    private insertBlockbBefore(blocks: Block[], id: number) {
        blocks.splice(id, 0, new Block(0, [], null));
        for (let i = id; i < blocks.length; i++) {
            blocks[i].id += 1;
        }
    }

    public printThreeAddressStmts() {
        // format
        let indentation = ' '.repeat(4);
        let lineEnd = ';\n';

        let stmtBlocks: Block[] = [];
        stmtBlocks.push(...this.blocks);
        let blockId = 0;
        if (stmtBlocks[blockId].stms[blockId].type == 'loopStatement') {
            this.insertBlockbBefore(stmtBlocks, blockId);
            blockId = 1;
        }
        blockId += 1;
        for (; blockId < stmtBlocks.length; blockId++) {
            let currStmt = stmtBlocks[blockId].stms[0];
            let lastStmt = stmtBlocks[blockId - 1].stms[0];
            if (currStmt.type == 'loopStatement' && lastStmt.type == 'loopStatement') {
                this.insertBlockbBefore(stmtBlocks, blockId);
                blockId++;
            }
        }

        let blockTailStmtStrs = new Map<number, string[]>();
        let blockStmtStrs = new Map<number, string[]>();
        for (let blockId = 0; blockId < stmtBlocks.length; blockId++) {
            let currBlock = stmtBlocks[blockId];
            let currStmtStrs: string[] = [];
            for (const originStmt of currBlock.stms) {
                if (originStmt.type == 'ifStatement') {
                    currStmtStrs.push(...ifStmtToString(originStmt));
                } else if (originStmt.type == 'loopStatement') {
                    currStmtStrs.push(...iterationStmtToString(originStmt));
                } else if (originStmt.type == 'switchStatement') {
                    currStmtStrs.push(...switchStmtToString(originStmt, this.sourceFile));
                } else if (originStmt.type == 'breakStatement' || originStmt.type == 'continueStatement') {
                    currStmtStrs.push(...jumpStmtToString(originStmt));
                } else {
                    for (const threeAddressStmt of originStmt.threeAddressStmts) {
                        currStmtStrs.push(threeAddressStmt.toString());
                    }
                }
            }
            blockStmtStrs.set(blockId, currStmtStrs);
        }

        // add tail stmts and print to str
        let functionBodyStr = 'method: ' + this.name + ' {\n';
        for (let blockId = 0; blockId < stmtBlocks.length; blockId++) {
            let stmtStrs: string[] = [];
            let currStmtStrs = blockStmtStrs.get(blockId);
            if (currStmtStrs != undefined) {
                stmtStrs.push(...currStmtStrs);
            }
            let tailStmtStrs = blockTailStmtStrs.get(blockId);
            if (tailStmtStrs != undefined) {
                stmtStrs.push(...tailStmtStrs);
            }

            if (blockId != 0) {
                functionBodyStr += 'label' + blockId + ':\n';
            }
            functionBodyStr += indentation;
            functionBodyStr += stmtStrs.join(lineEnd + indentation);
            functionBodyStr += lineEnd;
        }

        functionBodyStr += '}\n';
        logger.info(functionBodyStr);

        function ifStmtToString(originStmt: StatementBuilder): string[] {
            let ifStmt = originStmt as ConditionStatementBuilder;

            let strs: string[] = [];
            for (const threeAddressStmt of ifStmt.threeAddressStmts) {
                if (threeAddressStmt instanceof ArkIfStmt) {
                    let nextBlockId = ifStmt.nextF?.block?.id;
                    strs.push(threeAddressStmt.toString() + ' goto label' + nextBlockId);
                } else {
                    strs.push(threeAddressStmt.toString());
                }
            }
            return strs;
        }

        function iterationStmtToString(originStmt: StatementBuilder): string[] {
            let iterationStmt = originStmt as ConditionStatementBuilder;

            let bodyBlockId = iterationStmt.nextT?.block?.id as number;
            if (blockTailStmtStrs.get(bodyBlockId) == undefined) {
                blockTailStmtStrs.set(bodyBlockId, []);
            }
            let currTailStmtStrs = blockTailStmtStrs.get(bodyBlockId) as string[];

            let preBlockId = bodyBlockId - 1;
            if (blockTailStmtStrs.get(preBlockId) == undefined) {
                blockTailStmtStrs.set(preBlockId, []);
            }
            let preTailStmtStrs = blockTailStmtStrs.get(preBlockId) as string[];

            let strs: string[] = [];
            let findIf = false;
            let appendAfterIf = iterationStmt.astNode && (ts.SyntaxKind[iterationStmt.astNode.kind] == 'ForOfStatement' || ts.SyntaxKind[iterationStmt.astNode.kind] == 'ForInStatement');
            for (const threeAddressStmt of iterationStmt.threeAddressStmts) {
                if (threeAddressStmt instanceof ArkIfStmt) {
                    let nextBlockId = iterationStmt.nextF?.block?.id;
                    strs.push(threeAddressStmt.toString() + ' goto label' + nextBlockId);
                    findIf = true;
                } else if (!findIf) {
                    preTailStmtStrs.push(threeAddressStmt.toString());
                } else if (threeAddressStmt instanceof ArkGotoStmt) {
                    currTailStmtStrs.push('goto label' + bodyBlockId);
                } else if (appendAfterIf) {
                    strs.push(threeAddressStmt.toString());
                    appendAfterIf = false;
                } else {
                    currTailStmtStrs.push(threeAddressStmt.toString());
                }
            }
            return strs;
        }

        // TODO:参考soot还是sootup处理switch
        function switchStmtToString(originStmt: StatementBuilder, sourceFile: ts.SourceFile): string[] {
            let switchStmt = originStmt as SwitchStatementBuilder;

            let identifierStr = switchStmt.astNode?.getChildren(sourceFile)[2].getText(sourceFile);
            let str = 'lookupswitch(' + identifierStr + '){\n' + indentation;

            let strs: string[] = [];
            let nextBlockId = -1;
            for (const item of switchStmt.cases) {
                strs.push(indentation + item.value + 'goto label' + item.stmt.block?.id);
                nextBlockId = item.stmt.next?.block?.id as number;
            }
            strs.push(indentation + 'default: goto label' + nextBlockId);
            str += strs.join(lineEnd + indentation);

            str += lineEnd + indentation + '}';
            return [str];
        }

        function jumpStmtToString(originStmt: StatementBuilder): string[] {
            let targetId = originStmt.next?.block?.id as number;
            return ['goto label' + targetId];
        }
    }

    public printThreeAddressStrs() {
        logger.info('#### printThreeAddressStrs ####');
        for (const stmt of this.statementArray) {
            logger.info('------ origin stmt: ', stmt.code);
            for (const threeAddressstr of stmt.addressCode3) {
                logger.info(threeAddressstr);
            }
        }
    }

    public printThreeAddressStrsAndStmts() {
        for (const stmt of this.statementArray) {
            if (stmt.astNode && stmt.code) {
                logger.info('----- origin stmt: ', stmt.code);
                logger.info('-- threeAddressStrs:');
                for (const threeAddressstr of stmt.addressCode3) {
                    logger.info(threeAddressstr);
                }
                logger.info('-- threeAddressStmts:');
                for (const threeAddressStmt of stmt.threeAddressStmts) {
                    logger.info(threeAddressStmt);
                }
            }
        }
    }

    public printOriginStmts() {
        logger.info('#### printOriginStmts ####');
        for (const stmt of this.statementArray) {
            logger.info(stmt);
        }
    }

    // TODO: Add more APIs to the class 'Cfg', and use these to build Cfg
    public buildOriginalCfg(): Cfg {
        let originalCfg = new Cfg();
        let blockBuilderToBlock = new Map<Block, BasicBlock>();
        for (const blockBuilder of this.blocks) {
            let block = new BasicBlock();
            for (const stmtBuilder of blockBuilder.stms) {
                if (stmtBuilder.astNode == null) {
                    continue;
                }
                let originlStmt: Stmt = new Stmt();
                originlStmt.setText(stmtBuilder.code);
                originlStmt.setPositionInfo(stmtBuilder.line);
                originlStmt.setOriginPositionInfo(stmtBuilder.line);
                originlStmt.setColumn(stmtBuilder.column);
                originlStmt.setOriginColumn(stmtBuilder.column);
                block.addStmt(originlStmt);
            }
            originalCfg.addBlock(block);

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

        return originalCfg;
    }

    // TODO: Add more APIs to class 'Cfg', and use these to build Cfg
    public buildCfg(): Cfg {
        let cfg = new Cfg();
        cfg.declaringClass = this.declaringClass;
        let blockBuilderToBlock = new Map<Block, BasicBlock>();
        let stmtPos = -1;
        for (const blockBuilder of this.blocks) {
            let block = new BasicBlock();
            for (const stmtBuilder of blockBuilder.stms) {
                for (const threeAddressStmt of stmtBuilder.threeAddressStmts) {
                    if (stmtPos == -1) {
                        stmtPos = stmtBuilder.line;
                        cfg.setStartingStmt(threeAddressStmt);
                    }
                    threeAddressStmt.setOriginPositionInfo(stmtBuilder.line);
                    threeAddressStmt.setPositionInfo(stmtPos);
                    stmtPos++;
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
        return this.locals;
    }

    private getTypeNode(node: ts.Node): Type {
        for (let child of node.getChildren(this.sourceFile)) {
            let result = this.resolveTypeNode(child);
            if (result !== UnknownType.getInstance()) {
                return result;
            }
        }
        return UnknownType.getInstance();
    }

    private resolveTypeNode(node: ts.Node): Type {
        let typeNode: ts.Node;
        switch (ts.SyntaxKind[node.kind]) {
            case 'BooleanKeyword':
            case 'NumberKeyword':
            case 'StringKeyword':
            case 'VoidKeyword':
            case 'AnyKeyword':
                return TypeInference.buildTypeFromStr(this.resolveKeywordType(node));
            case 'ArrayType':
                typeNode = node.getChildren(this.sourceFile)[0];
                const typeStr = typeNode.getText(this.sourceFile);
                return new ArrayType(TypeInference.buildTypeFromStr(typeStr), 1);
            case 'TypeReference':
                return new AnnotationNamespaceType(node.getText(this.sourceFile));
            case 'UnionType':
                const types: Type[] = [];
                typeNode = node.getChildren(this.sourceFile)[0];
                for (const singleTypeNode of typeNode.getChildren(this.sourceFile)) {
                    if (ts.SyntaxKind[singleTypeNode.kind] != 'BarToken') {
                        const singleType = this.resolveTypeNode(singleTypeNode);
                        types.push(singleType);
                    }
                }
                return new UnionType(types);
            case 'TupleType':
                const tupleTypes: Type[] = [];
                typeNode = node.getChildren(this.sourceFile)[1];
                for (const singleTypeNode of typeNode.getChildren(this.sourceFile)) {
                    if (ts.SyntaxKind[singleTypeNode.kind] != 'CommaToken') {
                        const singleType = this.resolveTypeNode(singleTypeNode);
                        tupleTypes.push(singleType);
                    }
                }
                return new TupleType(tupleTypes);
            case 'TypeQuery':
                return new AnnotationTypeQueryType(node.getChildren(this.sourceFile)[1].getText(this.sourceFile));
        }
        return UnknownType.getInstance();
    }

    private resolveKeywordType(node: ts.Node): string {
        switch (ts.SyntaxKind[node.kind]) {
            case 'TrueKeyword':
            case 'FalseKeyword':
            case 'BooleanKeyword':
            case 'FalseKeyword':
            case 'TrueKeyword':
                return 'boolean';
            case 'NumberKeyword':
            case 'FirstLiteralToken':
                return 'number';
            case 'StringKeyword':
            case 'StringLiteral':
                return 'string';
            case 'VoidKeyword':
                return 'void';
            case 'AnyKeyword':
                return 'any';
            case 'NullKeyword':
                return 'null';
            case 'RegularExpressionLiteral':
                return 'RegularExpression';
            default:
                return '';
        }
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
        this.resetWalked();
        // this.buildLast(this.entry);
        this.resetWalked();
        this.buildBlocks(this.entry, this.entryBlock);
        this.blocks = this.blocks.filter((b) => b.stms.length != 0);
        this.buildBlocksNextLast();
        this.addReturnBlock();
        this.resetWalked();
        // this.generateUseDef();
        // this.resetWalked();

        // this.printBlocks();

        this.transformToArkIR();
    }
}