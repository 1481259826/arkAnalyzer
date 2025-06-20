import { Value } from '../core/base/Value';
import {
    ArkAliasTypeDefineStmt, ArkAssignStmt,
    ArkIfStmt,
    ArkInvokeStmt,
    ArkReturnStmt,
    ArkReturnVoidStmt,
    ArkThrowStmt,
    Stmt,
} from '../core/base/Stmt';
import {
    AbstractBinopExpr, AbstractExpr, AbstractInvokeExpr, AliasTypeExpr, ArkAwaitExpr,
    ArkCastExpr,
    ArkConditionExpr, ArkDeleteExpr, ArkInstanceInvokeExpr,
    ArkInstanceOfExpr, ArkNewArrayExpr, ArkNewExpr,
    ArkNormalBinopExpr, ArkPhiExpr, ArkPtrInvokeExpr, ArkStaticInvokeExpr,
    ArkTypeOfExpr, ArkUnopExpr, ArkYieldExpr,
} from '../core/base/Expr';
import { FallAction, MethodCtx } from './Pass';
import { Constant } from '../core/base/Constant';
import Logger, { LOG_MODULE_TYPE } from '../utils/logger';
import { ArkMethod } from '../core/model/ArkMethod';
import { Local } from '../core/base/Local';

const logger = Logger.getLogger(LOG_MODULE_TYPE.ARKANALYZER, 'Inst');

// instruction pass for every kind of ir
export interface InstPass<T> {
    //
    // return: skip next passes
    (value: T, ctx: MethodCtx): FallAction | void;
}

type IndexOf<T extends readonly any[]> = Extract<keyof T, `${number}`>;

const STMTS = [
    ArkAssignStmt,
    ArkInvokeStmt,
    ArkIfStmt,
    ArkReturnStmt,
    ArkReturnVoidStmt,
    ArkThrowStmt,
    ArkAliasTypeDefineStmt,
    Stmt,
] as const;

export type StmtClass = typeof STMTS[number];

export type StmtTy = {
    [K in IndexOf<typeof STMTS>]: InstanceType<typeof STMTS[K]>;
}[IndexOf<typeof STMTS>];

type StmtPass = {
    [K in IndexOf<typeof STMTS>]: InstPass<InstanceType<typeof STMTS[K]>>;
}[IndexOf<typeof STMTS>];

type StmtList<S extends StmtClass> = [S, InstPass<InstanceType<S>>[] | InstPass<InstanceType<S>>]

export type StmtInit = {
    [K in IndexOf<typeof STMTS>]: StmtList<typeof STMTS[K]>;
}[IndexOf<typeof STMTS>];

const VALUES = [
    ArkInstanceInvokeExpr,
    ArkStaticInvokeExpr,
    ArkPtrInvokeExpr,
    AbstractInvokeExpr,
    ArkNewExpr,
    ArkNewArrayExpr,
    ArkDeleteExpr,
    ArkAwaitExpr,
    ArkYieldExpr,
    ArkCastExpr,
    ArkConditionExpr,
    ArkNormalBinopExpr,
    ArkTypeOfExpr,
    ArkInstanceOfExpr,
    ArkCastExpr,
    ArkPhiExpr,
    ArkUnopExpr,
    AliasTypeExpr,
    AbstractBinopExpr,
    AbstractExpr,
    Constant,
    Local,
] as const;

type ValueClass = typeof VALUES[number];

export type ValueTy = {
    [K in IndexOf<typeof VALUES>]: InstanceType<typeof VALUES[K]>;
}[IndexOf<typeof VALUES>];

type ValuePass = {
    [K in IndexOf<typeof VALUES>]: InstPass<InstanceType<typeof VALUES[K]>>;
}[IndexOf<typeof VALUES>];

type ValuePair<S extends ValueClass> = [S, InstPass<InstanceType<S>>[] | InstPass<InstanceType<S>>]

export type ValueInit = {
    [K in IndexOf<typeof VALUES>]: ValuePair<typeof VALUES[K]>;
}[IndexOf<typeof VALUES>];


export class Dispatch {
    name: string = 'dispatch';
    readonly stmts: StmtClass[] = [];
    readonly smap: Map<StmtClass, StmtPass[]> = new Map();
    readonly values: ValueClass[] = [];
    readonly vmap: Map<ValueClass, ValuePass[]> = new Map();

    constructor(stmts: StmtInit[] = [], values: ValueInit[] = []) {
        this.stmts = stmts.map(v => v[0]);
        const smap = new Map();
        for (const [k, v] of stmts) {
            if (Array.isArray(v)) {
                smap.set(k, v);
            } else {
                smap.set(k, [v]);
            }
        }
        // replace it, in case of modified
        this.smap = smap;
        this.values = values.map(v => v[0]);
        const vmap = new Map();
        for (const [k, v] of values) {
            if (Array.isArray(v)) {
                vmap.set(k, v);
            } else {
                vmap.set(k, [v]);
            }
        }
        // replace it, in case of modified
        this.vmap = vmap;
    }
}

export class Dispatcher {
    private readonly ctx: MethodCtx;
    // action in match stmts
    protected fallAction: FallAction = FallAction.Break;
    private readonly dispatch: Dispatch;
    private cache: Set<any> = new Set();

    constructor(ctx: MethodCtx, dispatch: Dispatch = new Dispatch()) {
        this.ctx = ctx;
        this.dispatch = dispatch;
    }

    dispatchStmt(mtd: ArkMethod, stmt: Stmt) {
        logger.debug(`dispatch stmt ${stmt}`);
        if (this.dispatch.stmts.length == 0) {
            return;
        }
        const tys = this.dispatch.stmts;
        for (let ty of tys) {
            if (stmt instanceof ty) {
                let pass = this.dispatch.smap.get(ty);
                if (pass) {
                    for (const p of pass) {
                        p(stmt as any, this.ctx);
                    }
                }
                if (this.fallAction === FallAction.Break) {
                    break;
                }
            }
        }
        for (let use of stmt.getUses()) {
            this.dispatchValue(mtd, use);
        }
    }

    dispatchValue(mtd: ArkMethod, value: Value) {
        if (this.dispatch.values.length == 0) {
            return;
        }
        if (this.cache.has(value)) {
            return;
        }
        this.cache.add(value);
        const tys = this.dispatch.values;
        for (let ty of tys) {
            if (value instanceof ty) {
                let pass = this.dispatch.vmap.get(ty);
                if (pass) {
                    for (const p of pass) {
                        p(value as any, this.ctx);
                    }
                }
                if (this.fallAction === FallAction.Break) {
                    break;
                }
            }
        }
        for (let use of value.getUses()) {
            this.dispatchValue(mtd, use);
        }
    }
}