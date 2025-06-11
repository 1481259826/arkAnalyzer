import { NodeID } from "../../../core/graph/GraphTraits";
import { CallGraph, FuncID, ICallSite } from "../../model/CallGraph";
import { CallsiteContext, Context, ContextCache, ContextID, DUMMY_CID, ObjContext } from "./Context";
import { ContextItemManager } from "./ContextItem";
import path from 'path';
import * as fs from 'fs';

/**
 * Top layer of context
 */
export interface ContextSelector {
    ctxCache: ContextCache;
    ctxManager: ContextItemManager;
    selectContext(callerContextID: ContextID, callsite: ICallSite, calleeFunc: number): ContextID;
    emptyContext(): ContextID
    getNewContext(callerFuncId: FuncID): ContextID;
    getContextID(context: Context): ContextID;
    dump(path: string, cg: CallGraph): void;
}

export class KCallsiteContextSelector implements ContextSelector {
    private k: number;
    ctxCache: ContextCache;
    ctxManager: ContextItemManager;

    constructor(k: number) {
        this.k = k;
        this.ctxCache = new ContextCache();
        this.ctxManager = new ContextItemManager();
    }

    public selectContext(callerContextID: ContextID, callsite: ICallSite, calleeFunc: number): ContextID {
        let callerContext = this.ctxCache.getContext(callerContextID);
        if (!callerContext)  {
            return DUMMY_CID;
        }

        let calleeContext = callerContext.append(callsite.id, calleeFunc, this.k, this.ctxManager);
        return this.ctxCache.getOrNewContextID(calleeContext);
    }

    public emptyContext(): ContextID {
        let emptyContext = CallsiteContext.newEmpty();
        return this.ctxCache.getOrNewContextID(emptyContext);
    }

    public getContextID(context: Context): ContextID {
        return this.ctxCache.getOrNewContextID(context);
    }

    public getNewContext(callerFuncId: FuncID): ContextID {
        return this.ctxCache.getOrNewContextID(CallsiteContext.new([callerFuncId]));
    }

    public dump(dir: string,cg: CallGraph) {
        const content = this.ctxCache.dump(this.ctxManager, cg);
        const filePath = path.join(dir, 'context.txt');
        fs.writeFileSync(filePath, content, 'utf8');
    }
}

// WIP
export class KObjContextSelector implements ContextSelector {
    private k: number;
    ctxCache: ContextCache;
    ctxManager: ContextItemManager;

    constructor(k: number) {
        this.k = k;
        this.ctxCache = new ContextCache();
        this.ctxManager = new ContextItemManager();
    }

    public selectContext(callerContextID: ContextID, callsite: ICallSite, obj: number): ContextID {
        let callerContext = this.ctxCache.getContext(callerContextID);
        if (!callerContext)  {
            return DUMMY_CID;
        }

        let calleeContext = callerContext.append(0, obj, this.k, this.ctxManager);
        return this.ctxCache.getOrNewContextID(calleeContext);
    }

    public emptyContext(): ContextID {
        let emptyContext = ObjContext.newEmpty();
        return this.ctxCache.getOrNewContextID(emptyContext);
    }

    public getContextID(context: Context): ContextID {
        return this.ctxCache.getOrNewContextID(context);
    }

    public getNewContext(objID: NodeID): ContextID {
        return this.ctxCache.getOrNewContextID(ObjContext.new([objID]));
    }

    public dump(dir: string, cg: CallGraph) {

    }
}