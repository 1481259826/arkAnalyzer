import { CallGraph, CallGraphNode } from "../../model/CallGraph";
import { ICallSite } from "../../model/CallSite";
import { Pag } from "../Pag";
import { PagBuilder } from "../PagBuilder";
import { IPagPlugin } from "./IPagPlugin";
import { StoragePlugin } from "./StoragePlugin";
import { NodeID } from '../../../core/graph/GraphTraits';

// plugins/PluginManager.ts
export class PluginManager {
    private plugins: IPagPlugin[] = [];

    public init(pag: Pag, pagBuilder: PagBuilder) {
        this.registerPlugin(new StoragePlugin(pag, pagBuilder));
    }

    public registerPlugin(plugin: IPagPlugin): void {
        this.plugins.push(plugin);
    }

    public findPlugin(cs: ICallSite, cgNode: CallGraphNode): IPagPlugin | undefined {
        return this.plugins.find(plugin => plugin.canHandle(cs, cgNode));
    }

    public getAllPlugins(): IPagPlugin[] {
        return this.plugins;
    }

    public processCallSite(cs: ICallSite, cid: number, pagBuilder: PagBuilder, cg: CallGraph): { handled: boolean, srcNodes: NodeID[] } {
        const cgNode = cg.getNode(cs.getCalleeFuncID()!) as CallGraphNode;
        const plugin = this.findPlugin(cs, cgNode);
        let srcNodes: NodeID[] = [];

        if (plugin) {
            srcNodes.push(...plugin.processCallSite(cs, cid, pagBuilder, cg));
            return { handled: true, srcNodes: srcNodes };
        }

        return { handled: false, srcNodes: srcNodes };
    }
}