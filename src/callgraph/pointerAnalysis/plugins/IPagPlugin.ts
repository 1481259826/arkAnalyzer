import { NodeID } from "../../../core/graph/GraphTraits";
import { ArkMethod } from "../../../core/model/ArkMethod";
import { CallGraph, CallGraphNode, FuncID } from "../../model/CallGraph";
import { ICallSite, CallSite } from "../../model/CallSite";
import { ContextID } from "../context/Context";
import { Pag } from "../Pag";
import { PagBuilder } from "../PagBuilder";

// plugins/IPagPlugin.ts
export interface IPagPlugin {
    pag: Pag;
    pagBuilder: PagBuilder;
    cg: CallGraph;

    getName(): string;
    canHandle(cs: ICallSite, cgNode: CallGraphNode): boolean;
    processCallSite(cs: ICallSite, cid: ContextID, basePTNode: NodeID): NodeID[];
}
