import { NodeID } from "../../../core/graph/GraphTraits";
import { FuncID, ICallSite } from "../../model/CallGraph";
import { CallsiteContext, Context, ContextCache, ContextID, DUMMY_CID, ObjContext } from "./Context";
import { ContextItemManager } from "./ContextItem";

/**
 * Top layer of context
 */
export interface ContextSelector {
    ctxCache: ContextCache;
    ctxManager: ContextItemManager;
    selectContext(callerContextID: ContextID, callsite: ICallSite, calleeFunc: number): ContextID;
    emptyContext(): Context
    getNewContext(callerFuncId: FuncID): ContextID;
    getContextID(context: Context): ContextID;
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

    public emptyContext(): Context {
        return CallsiteContext.newEmpty();
    }

    public getContextID(context: Context): ContextID {
        return this.ctxCache.getOrNewContextID(context);
    }

    public getNewContext(callerFuncId: FuncID): ContextID {
        return this.ctxCache.getOrNewContextID(CallsiteContext.new([callerFuncId]));
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

    public emptyContext(): Context {
        return ObjContext.newEmpty();
    }

    public getContextID(context: Context): ContextID {
        return this.ctxCache.getOrNewContextID(context);
    }

    public getNewContext(objID: NodeID): ContextID {
        return this.ctxCache.getOrNewContextID(ObjContext.new([objID]));
    }
}