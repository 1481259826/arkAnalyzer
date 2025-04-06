import { ArkNormalBinopExpr } from '../../core/base/Expr';
import { Local } from '../../core/base/Local';
import { AbstractFieldRef } from '../../core/base/Ref';
import { ArkAssignStmt, Stmt } from '../../core/base/Stmt';
import { Value } from '../../core/base/Value';
import { MFPDataFlowSolver } from '../../core/dataflow/GenericDataFlow';
import { ReachingDefProblem } from '../../core/dataflow/ReachingDef';
import { ArkMethod } from '../../core/model/ArkMethod';
import { Scene } from '../../Scene';
import { DVFG } from '../DVFG'

export class DVFGBuilder {
    private dvfg: DVFG;
    // private scene: Scene;

    constructor(dvfg: DVFG, s: Scene) {
        this.dvfg = dvfg;
        // this.scene = s;
    }

    public build() {}

    public buildForSingleMethod(m: ArkMethod) {
        let problem = new ReachingDefProblem(m);
        let solver = new MFPDataFlowSolver();
        let solution = solver.calculateMopSolutionForwards(problem);
        let fg = problem.flowGraph;
        // build a map of def 2 stmts 
        let defMap = new Map<Value, Set<Stmt>>();
        m.getCfg()?.getStmts().forEach((s) => {
            let def = s.getDef();
            if(def != null) {
                let defStmts = defMap.get(def) ?? new Set<Stmt>();
                defStmts.add(s);
                defMap.set(def, defStmts);
            }
        });

        solution.out.forEach((defs, reach) => {
            let buildForDefs = (v: Value, reachStmt: Stmt) => {
                defMap.get(v)?.forEach((defStmt) => {
                    let id = fg.getNodeID(defStmt);
                    // def reaches here
                    if (defs.test(id)) {
                        let srcNode = this.dvfg.getOrNewDVFGNode(defStmt);
                        let dstNode = this.dvfg.getOrNewDVFGNode(reachStmt);

                        this.dvfg.addDVFGEdge(srcNode, dstNode);
                    }
                });
            };

            let reachStmt = fg.getNode(reach);

            //Get uses
            // stmt.getUses() has bug
            // a.f = x    the use currently is a, expect a.f
            if(reachStmt instanceof ArkAssignStmt) {
                let lop = reachStmt.getLeftOp();
                if (lop instanceof ArkNormalBinopExpr) {
                    let op1 = lop.getOp1();
                    let op2 = lop.getOp2();
                    buildForDefs(op1, reachStmt);
                    buildForDefs(op2, reachStmt);
                } else if(lop instanceof Local || lop instanceof AbstractFieldRef) {
                    //TODO
                }
            }
        });

        fg.getNodeToIdMap().forEach((id, stmt) => {
            stmt.getUses();

        });
    }

    public getOrNewDVFGNode(stmt: Stmt) {

    }

    public addDVFGNodes(): void {}

    public addDVFGEdges(): void {}
}