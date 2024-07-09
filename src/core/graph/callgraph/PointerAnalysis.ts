import { Scene } from "../../../Scene";
import { AbstractInvokeExpr, ArkInstanceInvokeExpr, ArkNewExpr, ArkStaticInvokeExpr } from "../../base/Expr";
import { Local } from "../../base/Local";
import { AbstractFieldRef } from "../../base/Ref";
import { ArkAssignStmt, Stmt } from "../../base/Stmt";
import { Value } from "../../base/Value";
import { ArkMethod } from "../../model/ArkMethod";
import { MethodSignature } from "../../model/ArkSignature";
import { NodeID } from "../BaseGraph";
import { CallGraph, Method } from "../CallGraph";
import { Pag, PagLocalNode, PagNode } from "../Pag";
import { CSFuncID, PagBuilder } from "../builder/PagBuilder";
import { AbstractAnalysis } from "./AbstractAnalysis";

type PointerPair = [NodeID, NodeID]

class PointerAnalysis extends AbstractAnalysis{
    private pag: Pag;
    private cg: CallGraph;
    private pointerPairList: PointerPair[] = [];
    private reachableMethods: Set<CSFuncID>
    private reachableStmts: Stmt[]

    constructor(p: Pag, cg: CallGraph, s: Scene) {
        super(s)
        this.pag = p;
        this.cg = cg;
        this.reachableStmts = []
        this.reachableMethods = new Set()
    }

    public buildAnalysis(): void {
        // start pointer analysis
        // TODO: select entries
        this.addReachable([])
        while (this.pointerPairList.length != 0) {
            const pair = this.pointerPairList.shift()!
            const targetNodeID = pair[0], sourceNodeID = pair[1]
            // TODO: 确认获取节点接口
            const targetNode = this.pag.getNode(targetNodeID) as PagNode
            const sourceNode = this.pag.getNode(sourceNodeID) as PagNode

            // check whether the sourceNodeID has existed in targetNodeID's pts
            if (targetNode.getPointerSet().has(sourceNodeID)) {
                continue
            }

            this.propagate(targetNode, sourceNode)

            if (targetNode instanceof PagLocalNode) {
                this.processFieldRefStmt(targetNode)
                this.processInstanceInvokeStmt(targetNode)
            }
        }
    }

    protected addReachable(funcs: CSFuncID[]) {
        funcs.forEach((funcID) => {
            // check whether the funcs is reachable
            if (this.reachableMethods.has(funcID)) {
                return
            }

            const arkMethod = this.cg.getArkMethodByFuncID(funcID.funcID)
            if (arkMethod == null) {
                // logs
                return 
            }

            this.reachableMethods.add(funcID)
            this.reachableStmts.push(...arkMethod.getCfg().getStmts())

            arkMethod.getBody().getCfg().getStmts().forEach((stmt) => {
                const invokeExpr = stmt.getInvokeExpr()
                if (invokeExpr != undefined && invokeExpr instanceof ArkStaticInvokeExpr) {
                    // all static invoke stmt
                    // this.processInvokePointerFlow()
                } else if (stmt instanceof ArkAssignStmt) {
                    // New stmt and assign stmt
                    const leftOp = stmt.getLeftOp(), rightOp = stmt.getRightOp()
                    if (!(leftOp instanceof Local)) {
                        return
                    }

                    let sourceNode: PagNode, targetNode: PagNode
                    if (rightOp instanceof ArkNewExpr) {
                        // example: x = new Dog()
                        // leftOp: x, rightOp: new Dog()
                        sourceNode = this.pag.getOrNewNode(0, rightOp)
                        targetNode = this.pag.getOrNewNode(0, leftOp)

                        this.pointerPairList.push([targetNode.getID(), sourceNode.getID()])
                    } else if (rightOp instanceof Local) {
                        // example: x = y
                        // leftOp: x, rightOp: y
                        sourceNode = this.pag.getOrNewNode(0, rightOp)
                        targetNode = this.pag.getOrNewNode(0, leftOp)

                        this.pointerPairList.push([targetNode.getID(), sourceNode.getID()])
                        this.addFakeEdge(targetNode, sourceNode)
                    }
                }
            })
        })
    }

    protected propagate(targetNode: PagNode, sourceNode: PagNode){
        // TODO: need existence check or not?
        targetNode.addPointerSetElement(sourceNode.getID())

        // TODO: get out edge of target node
        // targetNode.getOutEdges().forEach((node) => {
            // this.pointerPairList.push([node, sourceNode.getID()])
        // })
    }

    protected processFieldRefStmt(targetNode: PagLocalNode) {
        const targetLocal = targetNode.getValue()
        this.reachableStmts.forEach((stmt) => {
            if (!(stmt.containsFieldRef() && stmt instanceof ArkAssignStmt)) {
                return
            }

            const leftOp: Value = stmt.getLeftOp(), rightOp: Value = stmt.getRightOp()
            let fieldMap = this.getFieldRef(stmt)

            if (fieldMap.UseRef != undefined) {
                // x = y.f
                const targetNode = this.pag.getOrNewNode(0, leftOp)
                const sourceNode = this.pag.getOrNewNode(0, fieldMap.UseRef)

                this.addFakeEdge(targetNode, sourceNode)
            } else if (fieldMap.DefRef != undefined) {
                // y.f = x
                // 3AC should not allow both two situations
                const targetNode = this.pag.getOrNewNode(0, fieldMap.DefRef)
                const sourceNode = this.pag.getOrNewNode(0, rightOp)

                this.addFakeEdge(targetNode, sourceNode)
            }
        })
    }

    protected processInstanceInvokeStmt(baseNode: PagLocalNode) {
        this.reachableStmts.forEach((stmt) => {
            const invokeExpr = stmt.getInvokeExpr()
            if (invokeExpr == undefined) {
                return
            }

            if ((invokeExpr instanceof ArkInstanceInvokeExpr &&
                    baseNode.getValue() != invokeExpr.getBase()) ||
                (invokeExpr instanceof ArkStaticInvokeExpr)) {
                return;
            }

            // get ArkMethod according to invokeExpr, get current Method
            let targetMethod = this.dispatchMethod(invokeExpr)
            if (targetMethod == undefined) {
                return
            }

            // TODO: get sourceMethod and pass the param to flow method
            // this.processInvokePointerFlow()
        })
    }

    protected processInvokePointerFlow(sourceMethod: MethodSignature, targetMethod: MethodSignature) {
        // TODO: get new call site context, 
        // newContext = 

        // if (!targetMethod.isStatic()) {
        //     // TODO: instance invoke: add method `this` to processList
        // }
        // // TODO: check whether call relation has been recorded in CG
        // if (this.cg.hasEdge()) {
        //     return
        // }

        // TODO: add CG edge
        // this.cg.
        // TODO: add target method to reachable
        // this.addReachable()

        // TODO: add pag edge: param, return val
    }

    protected dispatchMethod(invokeExpr: AbstractInvokeExpr): ArkMethod | undefined {
        return this.resolveInvokeExpr(invokeExpr)
    }

    protected getFieldRef(stmt: ArkAssignStmt) {
        let fieldRefMap: {UseRef: AbstractFieldRef | undefined, DefRef: AbstractFieldRef | undefined} = {
            UseRef: undefined,
            DefRef: undefined
        }
        stmt.getUses().forEach((use) => {
            if (use instanceof AbstractFieldRef) {
                fieldRefMap.UseRef = use
            }
        })
        const def = stmt.getDef()
        if (def != null && def instanceof AbstractFieldRef) {
            fieldRefMap.DefRef = def
        }
        return fieldRefMap
    }

    /**
     * only propagate pointer, pag edges have been created before
     * @param dst pag node that will receive new pointer
     * @param src pag node that provide pointer
     */
    protected addFakeEdge(dst: PagNode, src: PagNode) {
        dst.getPointerSet().forEach((node) => {
            this.pointerPairList.push([node, src.getID()])
        })
    }

    public propagetePointerSet() {
        while (this.pointerPairList.length != 0) {
            const pair = this.pointerPairList.shift()!
            const targetNodeID = pair[0], sourceNodeID = pair[1]

            const targetNode = this.pag.getNode(targetNodeID) as PagNode

            if (targetNode.getPointerSet().has(sourceNodeID)) {
                continue
            }

            // add node to pointer set
            targetNode.addPointerSetElement(sourceNodeID)

            // propagate 获取到全部出边指向的节点
            // targetNode.getOutEdges().forEach((edge) => {
            //     const node: NodeID = 0
            //     this.pointerPairList.push([node, sourceNodeID])
            // })
        }
    }

}