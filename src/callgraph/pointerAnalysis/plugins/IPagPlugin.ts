import { NodeID } from "../../../core/graph/GraphTraits";
import { ArkMethod } from "../../../core/model/ArkMethod";
import { CallGraph, CallGraphNode, FuncID } from "../../model/CallGraph";
import { ICallSite, CallSite } from "../../model/CallSite";
import { ContextID } from "../context/Context";
import { PagBuilder } from "../PagBuilder";

// plugins/IPagPlugin.ts
export interface IPagPlugin {
    getName(): string;
    canHandle(cs: ICallSite, cgNode: CallGraphNode): boolean;
    processCallSite(cs: ICallSite, cid: ContextID, pagBuilder: PagBuilder, cg: CallGraph): NodeID[];
    processReturnValue?(cs: CallSite, callerCid: ContextID, calleeCid: ContextID, calleeMethod: ArkMethod): NodeID[];
    processParameters?(cs: CallSite, callerCid: ContextID, calleeCid: ContextID, funcID: FuncID): NodeID[];
}
