import { CallGraph } from "../../model/CallGraph";
import { CallsiteContextItem, ContextItemManager } from "./ContextItem";

export type ContextID = number;
export const DUMMY_CID = 0;

/**
 * An abstract base class representing a context in pointer analysis.
 * A context is an immutable sequence of context elements (represented by their IDs).
 */
export abstract class Context {
    protected contextElems: number[];

    constructor(contextElems: number[] = []) {
        this.contextElems = contextElems;
    }

    // -------------------------------------------------------------------
    // Static Factory Methods
    // -------------------------------------------------------------------

    /**
     * Creates a new empty context instance.
     * This static method must be called on a concrete subclass.
     * @example CallsiteContext.newEmpty()
     */
    static newEmpty<T extends Context>(this: new () => T): T {
        return new this();
    }

    /**
     * Creates a new context instance from an array of element IDs.
     * This static method must be called on a concrete subclass.
     * @param contextElems An array of ContextItem IDs.
     * @example CallsiteContext.new([1, 2])
     */
    static new<T extends Context>(this: new (elems: number[]) => T, contextElems: number[]): T {
        return new this(contextElems);
    }
    
    /**
     * Creates a new k-limited context by prepending a new element to an old context.
     * The returned instance has the same type as the `oldCtx`.
     * @param oldCtx The previous context instance.
     * @param elem The ID of the new element to add.
     * @param k The maximum length limit for the context.
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
        // Use the constructor of the old context to create a new instance, preserving type
        const constructor = oldCtx.constructor as new (elems: number[]) => T;
        return new constructor(elems);
    }

    /**
     * Truncates an existing context to a specified k-limit.
     * The returned instance has the same type as `ctx`.
     * @param ctx The context instance to truncate.
     * @param k The maximum length limit for the context.
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

    public abstract append(callsiteID: number, calleeFunc: number, k: number, m: ContextItemManager): Context;
    public abstract dump(m: ContextItemManager, cg: CallGraph): string;
}

export class CallsiteContext extends Context {
    public append(callsiteID: number, calleeFunc: number, k: number, m: ContextItemManager): CallsiteContext {
        let contextItem = m.getOrCreateCallSiteItem(callsiteID, calleeFunc);
        return Context.newKLimitedContext(this, contextItem.id, k) as CallsiteContext;
        // TODO: dumplicated check
    }

    public dump(m: ContextItemManager, cg: CallGraph): string {
        let content: string = '';
        for (let i = 0; i < this.length(); i++) {
            const item = m.getItem(this.get(i)) as CallsiteContextItem;
            const callSiteInfo = cg.getCallSiteInfo(item.callSiteId);
            content += `\t[${callSiteInfo}]\n`;
        }
        return content;
    }
}

export class ObjContext extends Context {
    public append(callsiteID: number, objId: number, k: number, m: ContextItemManager): ObjContext {
        let contextItem = m.getOrCreateObjectItem(objId);
        return Context.newKLimitedContext(this, contextItem.id, k);
    }

    public dump(m: ContextItemManager, cg: CallGraph): string {
        let content: string = '';
        return content;
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

    public dump(m: ContextItemManager,cg: CallGraph) {
        let content: string = '';
        this.contextList.forEach((c, i) => {
            content += `Context ${i}:\n`;
            content += `${c.dump(m, cg)}\n`;
        });

        return content;
    }
}