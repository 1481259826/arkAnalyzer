import { Scene } from "../../../Scene";
import { AbstractInvokeExpr, ArkInstanceInvokeExpr, ArkNewExpr, ArkStaticInvokeExpr } from "../../base/Expr";
import { Local } from "../../base/Local";
import { AbstractFieldRef } from "../../base/Ref";
import { ArkAssignStmt, Stmt } from "../../base/Stmt";
import { Value } from "../../base/Value";
import { NodeID } from "../BaseGraph";
import { CallGraph } from "../CallGraph";
import { Pag, PagLocalNode, PagNode } from "../Pag";
import { CSFuncID, PagBuilder } from "../builder/PagBuilder";
import { AbstractAnalysis } from "./AbstractAnalysis";

type PointerPair = [NodeID, NodeID]

class PointerAnalysis extends AbstractAnalysis{
    private pag: Pag;
    private cg: CallGraph;
    private pointerPairList: PointerPair[] = [];
    private reachableMethods: Set<CSFuncID>
    private reachableStmts: Set<Stmt>

    constructor(p: Pag, cg: CallGraph, s: Scene) {
        super(s)
        this.pag = p;
        this.cg = cg;
    }

    public buildAnalysis(): void {
        // start pointer analysis
        // TODO: select entries
        this.addReachable([])
        while (this.pointerPairList.length != 0) {
            const pair = this.pointerPairList.shift()!
            const targetNodeID = pair[0], sourceNodeID = pair[1]
            const targetNode = this.cg.getNode(targetNodeID) as PagNode
            const sourceNode = this.cg.getNode(sourceNodeID) as PagNode

            // check whether the sourceNodeID has existed in targetNodeID's pts
            if (targetNode.getPointerSetElement().has(sourceNodeID)) {
                continue
            }

            this.propagate(targetNode, sourceNode).forEach((pair) => {
                this.pointerPairList.push(pair)
            })

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

            this.reachableMethods.add(funcID)
            // TODO: should also add all stmt into ReachableStmt

            const arkMethod = this.cg.getArkMethodByFuncID(funcID.funcID)
            if (arkMethod == null) {
                // logs
                return 
            }

            arkMethod.getBody().getCfg().getStmts().forEach((stmt) => {
                if (stmt.containsInvokeExpr()) {

                } else if (stmt instanceof ArkAssignStmt) {
                    const leftOp = stmt.getLeftOp(), rightOp = stmt.getRightOp()
                    if (!(leftOp instanceof Local)) {
                        return
                    }

                    if (rightOp instanceof ArkNewExpr) {
                        // example: x = new Dog()
                        // leftOp: x, rightOp: new Dog()
                        let sourceNode = this.pag.getOrNewNode(0, rightOp)
                        let targetNode = this.pag.getOrNewNode(0, leftOp)

                        // this.addedge(sourceNode, targetNode)
                        this.pointerPairList.push([targetNode.getID(), sourceNode.getID()])
                    } else if (rightOp instanceof Local) {
                        // example: x = y
                        // leftOp: x, rightOp: y
                         
                    }
                }
            })
        })
    }

    protected propagate(targetNode: PagNode, sourceNode: PagNode): PointerPair[] {
        const newPointerPairList: PointerPair[] = []
        // TODO: add pag edge between node
        // this.addEdges(targetNodeID, sourceNodeID)

        // get pointer set of target node
        targetNode.getPointerSetElement().forEach((node) => {
            newPointerPairList.push([node, sourceNode.getID()])
        })

        return newPointerPairList
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
                // TODO: addEdge
            } else if (fieldMap.DefRef != undefined) {
                // y.f = x
                // 3AC should not allow both two situations
                const targetNode = this.pag.getOrNewNode(0, fieldMap.DefRef)
                const sourceNode = this.pag.getOrNewNode(0, rightOp)
                // TODO: addEdge
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

            // TODO: get ArkMethod according to invokeExpr, get current Method
            // targetMethod = this.dispatch(invokeExpr)

            // TODO: get new call site context
            // newContext = 

            // TODO: add method `this` to processList
        })
    }

    protected processInvokeFlow() {
        // TODO: check whether call relation has been recorded in CG

        // TODO: add pag edge
    }

    protected dispatch(invokeExpr: AbstractInvokeExpr) {

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

}