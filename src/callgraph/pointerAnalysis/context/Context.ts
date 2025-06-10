import { CallsiteContextItem, ObjectContextItem } from "./ContextItem";

export type ContextID = number;
export const DUMMY_CID = 0;

export abstract class Context {
    protected contextElems: number[];

    constructor(contextElems: number[] = []) {
        this.contextElems = contextElems;
    }

    // -------------------------------------------------------------------
    // Static Factory Methods
    // -------------------------------------------------------------------

    /**
     * 创建一个新的空上下文实例。
     * 必须在子类上调用，例如: CallsiteContext.newEmpty()
     */
    static newEmpty<T extends Context>(this: new () => T): T {
        return new this();
    }

    /**
     * 根据元素数组创建一个新的上下文实例。
     * @param contextElems 元素数组
     * 必须在子类上调用，例如: CallsiteContext.new([1, 2])
     */
    static new<T extends Context>(this: new (elems: number[]) => T, contextElems: number[]): T {
        return new this(contextElems);
    }
    
    /**
     * 基于旧上下文和新元素，创建一个新的 k-limited 上下文。
     * 返回的实例类型与 oldCtx 的类型相同。
     * @param oldCtx 旧的上下文实例
     * @param elem 要添加的新元素
     * @param k 上下文的最大长度限制
     */
    static newKLimitedContext<T extends Context>(oldCtx: T, elem: number, k: number): T {
        let elems: number[] = [];
        if (k > 0) {
            elems.push(elem);
            const oldElems = oldCtx.contextElems;
            if (oldElems.length < k) {
                elems = elems.concat(oldElems);
            } else {
                elems = elems.concat(oldElems.slice(0, k - 1));
            }
        }
        // 使用 oldCtx 的构造函数来创建新实例，保持类型一致
        const constructor = oldCtx.constructor as new (elems: number[]) => T;
        return new constructor(elems);
    }

    /**
     * 将一个现有上下文裁剪到 k-limited。
     * 返回的实例类型与 ctx 的类型相同。
     * @param ctx 要裁剪的上下文实例
     * @param k 上下文的最大长度限制
     */
    static kLimitedContext<T extends Context>(ctx: T, k: number): T {
        const constructor = ctx.constructor as new (elems: number[]) => T;
        if (ctx.length() <= k) {
            return new constructor(ctx.contextElems);
        } else {
            const elems = ctx.contextElems.slice(0, k);
            return new constructor(elems);
        }
    }

    // -------------------------------------------------------------------
    // Instance Methods
    // -------------------------------------------------------------------

    public length(): number {
        return this.contextElems.length;
    }

    public get(index: number): number {
        if (index < 0 || index >= this.contextElems.length) {
            throw new Error('Index out of bounds');
        }
        return this.contextElems[index];
    }

    public toString(): string {
        return this.contextElems.join('-');
    }

    public abstract append(id: ContextID, callsiteID: number, calleeFunc: number, k: number): Context;
}

export class CallsiteContext extends Context {
    public append(id: ContextID, callsiteID: number, calleeFunc: number, k: number): CallsiteContext {
        let contextItem = new CallsiteContextItem(id, callsiteID, calleeFunc);
        return Context.newKLimitedContext(this, contextItem.id, k) as CallsiteContext;
    }
}

export class ObjContext extends Context {
    public append(id: ContextID, callsiteID: number, objId: number, k: number): ObjContext {
        let contextItem = new ObjectContextItem(id, objId);
        return Context.newKLimitedContext(this, contextItem.id, k);
    }
}

export class ContextCache {
    private contextList: Context[] = [];
    private contextToIDMap: Map<String, number> = new Map();

    constructor() {
        this.contextList = [];
        this.contextToIDMap = new Map();
    }

    public getOrNewContextID(context: Context): ContextID {
        let cStr = context.toString();
        if (this.contextToIDMap.has(cStr)) {
            return this.contextToIDMap.get(cStr) as ContextID;
        } else {
            // real cid start from 1
            const id = this.contextList.length;
            this.contextList.push(context);
            this.contextToIDMap.set(cStr, id);
            return id;
        }
    }

    public updateContext(id: ContextID, newContext: Context, oldContext: Context): boolean {
        if (this.contextList.length < id) {
            return false;
        }
        this.contextList[id] = newContext;
        let oldCStr = oldContext.toString();
        let newCStr = newContext.toString();
        this.contextToIDMap.delete(oldCStr);
        this.contextToIDMap.set(newCStr, id);
        return true;
    }

    public getContextID(context: Context): ContextID | undefined {
        let cStr = context.toString();
        if (this.contextToIDMap.has(cStr)) {
            return this.contextToIDMap.get(cStr) as ContextID;
        }

        return undefined;
    }

    public getContext(id: number): Context | undefined {
        if (id > this.contextList.length) {
            return undefined;
        }
        return this.contextList[id];
    }

    public getContextList(): Context[] {
        return this.contextList;
    }
}