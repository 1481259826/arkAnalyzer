/*
 * Copyright (c) 2024 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Scene } from "../Scene";
import { AbstractInvokeExpr, ArkInstanceInvokeExpr, ArkNewExpr, ArkStaticInvokeExpr } from "../core/base/Expr";
import { Local } from "../core/base/Local";
import { ArkAssignStmt, ArkInvokeStmt, Stmt } from "../core/base/Stmt";
import { ClassType } from "../core/base/Type";
import { Value } from "../core/base/Value";
import { ArkMethod } from "../core/model/ArkMethod";
import { MethodSignature } from "../core/model/ArkSignature";
import { isItemRegistered } from "../utils/callGraphUtils";
import { AbstractCallGraph } from "./AbstractCallGraphAlgorithm";
import { ClassHierarchyAnalysisAlgorithm } from "./ClassHierarchyAnalysisAlgorithm";
import { LocalPointer, PointerTargetPair, PointerTarget, InstanceFieldPointer, StaticFieldPointer, Pointer} from "./PointerAnalysis/Pointer";
import { PointerFlowGraph } from "./PointerAnalysis/PointerFlowGraph";
import Logger from "../utils/logger";
import { AbstractFieldRef, ArkInstanceFieldRef, ArkStaticFieldRef } from "../core/base/Ref";
import { CallSiteSensitiveContext, Context, InsensitiveContext, MethodWithContext, ModifyCallSiteDepth, ValueWithContext } from "./PointerAnalysis/Context";

const logger = Logger.getLogger();

export class VariablePointerAnalysisAlogorithm extends AbstractCallGraph {
    private pointerFlowGraph: PointerFlowGraph
    private reachableStmts: Stmt[]
    private workList: PointerTargetPair[]
    private reachableMethods: MethodSignature[]
    private CHAtool: ClassHierarchyAnalysisAlgorithm
    public options: PointerAnalysisOptions

    constructor(scene: Scene) {
        super(scene)
        this.workList = []
        this.reachableStmts = []
        this.reachableMethods = []
        this.pointerFlowGraph = new PointerFlowGraph()
        this.CHAtool = this.scene.scene.makeCallGraphCHA([]) as ClassHierarchyAnalysisAlgorithm
        // this.options = options
    }

    public loadCallGraph(entryPoints: MethodSignature[]) {
        // ModifyCallSiteDepth(options.callSiteDepth)
        this.processWorkList(entryPoints);
        
        this.pointerFlowGraph.printPointerFlowGraph()
    }

    protected initEntryPoints(entryPoints: MethodSignature[]): MethodWithContext[] {
        const emptyMethodSignature = new MethodSignature()
        return entryPoints.map(entryPoint => {
            let methodWithContext: MethodWithContext
            if (this.options.strategy == 'insensitive') {
                methodWithContext = new MethodWithContext(
                    entryPoint,
                    new InsensitiveContext(emptyMethodSignature, 0))
            } else if (this.options.strategy == 'callSite') {
                methodWithContext = new MethodWithContext(
                    entryPoint,
                    new CallSiteSensitiveContext(undefined, emptyMethodSignature, 0)
                )
            }
            return methodWithContext!;
        });
    }

    // public processWorkList(entryPoints: MethodSignature[]): void {
    //     this.addReachable(this.initEntryPoints(entryPoints))
    //     while (this.workList.length != 0) {
    //         let workElement = this.workList.shift()
    //         let pointerSet: Pointer, identifier: ValueWithContext | PointerTarget
    //         // workList的结构是[指针，指向目标]
    //         let pointer = workElement!.getPointer(), pointerTarget = workElement!.getPointerTarget()
    //         if (pointer instanceof LocalPointer) {
    //             identifier = pointer.getValueWithContext()
    //             pointerSet = this.pointerFlowGraph.getPointerSetElement(identifier, null, null)

    //         } else if (pointer instanceof InstanceFieldPointer) {
    //             identifier = pointer.getBasePointerTarget()
    //             // pointerSet = this.pointerFlowGraph.getPointerSetElement(null, identifier, pointer.getFieldWithContext())

    //         } else if (pointer instanceof StaticFieldPointer) {
    //             // pointerSet = this.pointerFlowGraph.getPointerSetElement(null, null, pointer.getFieldWithContext())
    //         }

    //         // 检查当前指针是否已经存在于对应指针集中
    //         if (!(pointerSet!.getPointerTarget(pointerTarget) == null)) {
    //             continue
    //         }

    //         let newWorkListItems = this.pointerFlowGraph.proPagate(pointerSet!, pointerTarget)
    //         for (let newWorkLisItem of newWorkListItems) {
    //             this.workList.push(newWorkLisItem)
    //         }
    //         if (identifier! instanceof Local) {
    //             this.processFieldReferenceStmt(identifier!, pointerTarget)
                
    //             this.processInstanceInvokeStmt(identifier!, pointerTarget)
    //         }
    //     }
    // }

    protected resolveCall(sourceMethodSignature: MethodSignature, invokeStmt: Stmt): MethodSignature[] {
        return []
    }

    protected preProcessMethod(methodSignature: MethodSignature): void {
        return
    }

    // protected addReachable(entryPoints: MethodWithContext[]) {
    //     for (let method of entryPoints) {
    //         // logger.info("[addReachable] processing method: "+method.toString())
    //         const sourceContext = method.getContext()
    //         const methodSignature = method.getMethodSignature()
    //         if (isItemRegistered<MethodSignature>(
    //             methodSignature, this.reachableMethods,
    //             (a, b) => a.toString() === b.toString()
    //         )) {
    //             continue
    //         }

    //         this.reachableMethods.push(methodSignature)
    //         let arkMethodInstance = this.scene.getMethod(methodSignature)
    //         if (arkMethodInstance == null)
    //             continue
    //         let stmts = arkMethodInstance.getCfg().getStmts()
    //         this.reachableStmts.push(...stmts)

    //         for (let stmt of stmts) {
    //             const stmtPosition = stmt.getOriginPositionInfo()
    //             if (stmt instanceof ArkAssignStmt) {
    //                 let leftOp = stmt.getLeftOp(), rightOp = stmt.getRightOp()
    //                 if (!(leftOp instanceof Local)) {
    //                     continue
    //                 }
    //                 if (rightOp instanceof ArkNewExpr) {
    //                     let classType = rightOp.getType() as ClassType
    //                     // TODO: 如何获取到当前上下文
    //                     // let pointer = new PointerTarget(classType, methodSignature, sourceContext,
    //                     //      stmtPosition, this.options)

    //                     // this.workList.push(
    //                     //     new PointerTargetPair(this.pointerFlowGraph.getPointerSetElement(leftOp, null, null), pointer))
    //                 } else if (rightOp instanceof Local) {
    //                     this.addEdgeIntoPointerFlowGraph(
    //                         this.pointerFlowGraph.getPointerSetElement(rightOp, null, null),
    //                         this.pointerFlowGraph.getPointerSetElement(leftOp, null, null)
    //                     )
    //                 } else if (rightOp instanceof ArkStaticInvokeExpr) {
    //                     const targetMethod = this.scene.getMethod(rightOp.getMethodSignature())
    //                     if (targetMethod == null) {
    //                         continue
    //                     }
    //                     const targetMethodSignature = targetMethod.getSignature()
    //                     // this.addReachable([this.trans2MethodWithContext(
    //                     //     targetMethodSignature, methodSignature, sourceContext, stmtPosition
    //                     // )!])
    //                     this.processInvokePointerFlow(arkMethodInstance, targetMethod, stmt)
    //                 }
    //             } else if (stmt instanceof ArkInvokeStmt) {
    //                 let invokeExpr = stmt.getInvokeExpr()
    //                 if (invokeExpr instanceof ArkStaticInvokeExpr) {
    //                     let targetMethod = this.scene.getMethod(invokeExpr.getMethodSignature())
    //                     if (targetMethod == null) {
    //                         continue
    //                     }
    //                     // this.addReachable([this.trans2MethodWithContext(
    //                     //     invokeExpr.getMethodSignature(), methodSignature, sourceContext, stmtPosition
    //                     // )!])
    //                     this.processInvokePointerFlow(arkMethodInstance, targetMethod, stmt)
    //                 }
    //             }
    //         }
    //     }
    // }

    // protected processInstanceInvokeStmt(identifier: Value, pointer: PointerTarget) {
    //     for (let stmt of this.reachableStmts) {
    //         if (stmt.containsInvokeExpr()) {
    //             let expr = stmt.getInvokeExpr()
    //             if (expr === undefined) {
    //                 continue
    //             }
    //             // check whether the call has the right identifier
    //             if (expr instanceof ArkInstanceInvokeExpr) {
    //                 // TODO: constructor calls has some error in parameter
    //                 if (identifier != expr.getBase()) {
    //                     continue
    //                 }
    //             } else if (expr instanceof ArkStaticInvokeExpr) {
    //                 // static invoke stmt has no identifier before, so will be discussed in `addReachable` method
    //                 continue
    //             }
    //             let sourceMethod: ArkMethod = stmt.getCfg()?.getDeclaringMethod()!
    //             let targetMethod: ArkMethod | null = this.getSpecificCallTarget(expr, pointer)
    //             if (targetMethod == null) {
    //                 continue
    //             }

    //             let targetMethodThisInstance: Value | null = targetMethod.getThisInstance()
    //             if (targetMethodThisInstance == null) {
    //                 continue
    //             }

    //             this.workList.push(new PointerTargetPair(
    //                 this.pointerFlowGraph.getPointerSetElement(targetMethodThisInstance, null, null),
    //                 pointer)
    //             )

    //             this.processInvokePointerFlow(sourceMethod, targetMethod, stmt)
    //         }
    //     }
    // }

    // protected processFieldReferenceStmt (identifier: Value, pointerTarget: PointerTarget) {
    //     for (let stmt of this.reachableStmts) {
    //         // TODO: getFieldRef接口可能包含了左值
    //         if (stmt instanceof ArkAssignStmt && stmt.containsFieldRef()) {
    //             // TODO: 对namespace中取field会拆分为两条语句，需要进行区分
    //             let fieldRef
    //             if ((fieldRef = this.getFieldRefFromUse(stmt)) != undefined) {
    //                 // 取属性
    //                 let fieldSignature = fieldRef.getFieldSignature()
    //                 if (fieldRef instanceof ArkInstanceFieldRef) {
    //                     let fieldBase = fieldRef.getBase()
    //                     if (fieldBase !== identifier) {
    //                         continue
    //                     }
    //                     this.addEdgeIntoPointerFlowGraph(
    //                         this.pointerFlowGraph.getPointerSetElement(null, pointerTarget, fieldSignature),
    //                         this.pointerFlowGraph.getPointerSetElement(stmt.getLeftOp(), null, null)
    //                     )
    //                 } else if (fieldRef instanceof ArkStaticFieldRef) {
    //                     this.addEdgeIntoPointerFlowGraph(
    //                         this.pointerFlowGraph.getPointerSetElement(null, null, fieldSignature),
    //                         this.pointerFlowGraph.getPointerSetElement(stmt.getLeftOp(), null, null)
    //                     )
    //                 }
    //             } else if ((fieldRef = this.getFieldFromDef(stmt)) != undefined) {
    //                 // 存属性
    //                 let fieldSignature = fieldRef.getFieldSignature()
    //                 if (fieldRef instanceof ArkInstanceFieldRef) {
    //                     let fieldBase = fieldRef.getBase()
    //                     if (fieldBase !== identifier) {
    //                         continue
    //                     }                        
    //                     this.addEdgeIntoPointerFlowGraph(
    //                         this.pointerFlowGraph.getPointerSetElement(stmt.getRightOp(), null, null),
    //                         this.pointerFlowGraph.getPointerSetElement(null, pointerTarget, fieldSignature)
    //                     )
    //                 } else if (fieldRef instanceof ArkStaticFieldRef) {
    //                     this.addEdgeIntoPointerFlowGraph(
    //                         this.pointerFlowGraph.getPointerSetElement(stmt.getRightOp(), null, null),
    //                         this.pointerFlowGraph.getPointerSetElement(null, null, fieldRef.getFieldSignature())
    //                     )
    //                 }
    //             }
    //         }
    //     }
    // }

    // protected processInvokePointerFlow(sourceMethod: ArkMethod, targetMethod: ArkMethod, stmt: Stmt) {
    //     if (isItemRegistered<MethodSignature>(
    //         targetMethod.getSignature(), this.getCall(sourceMethod.getSignature()),
    //         (a, b) => a.toString() === b.toString()
    //     )) {
    //         return
    //     }
    //     // check whether the current call relation has been discussed
    //     let expr = stmt.getInvokeExpr()
    //     if (expr == undefined) {
    //         return
    //     }
    //     let sourceMethodSignature: MethodSignature = sourceMethod.getSignature()
    //     let targetMethodSignature: MethodSignature = targetMethod.getSignature()

    //     // TODO: how to store current context?
    //     // let targetContext = this.selectContext(, , sourceMethod, targetMethod, stmt.getOriginPositionInfo())
    //     this.addCall(sourceMethodSignature, targetMethodSignature)
    //     this.addMethod(sourceMethodSignature)
    //     // this.addReachable([this.trans2MethodWithContext(
    //     //     targetMethodSignature, sourceMethodSignature,
    //     // )])

    //     let parameters = expr.getArgs()
    //     let methodParameterInstances = targetMethod.getParameterInstances()

    //     for (let i = 0;i < parameters.length;i ++) {
    //         // pass the var pointer to parameter pointer
    //         this.addEdgeIntoPointerFlowGraph(
    //             this.pointerFlowGraph.getPointerSetElement(parameters[i], null, null),
    //             this.pointerFlowGraph.getPointerSetElement(methodParameterInstances[i], null, null)
    //         )
    //     }
    //     // pass the return value pointer
    //     if (stmt instanceof ArkAssignStmt) {
    //         let returnValues = targetMethod.getReturnValues()
    //         for (let returnValue of returnValues) {
    //             this.addEdgeIntoPointerFlowGraph(
    //                 this.pointerFlowGraph.getPointerSetElement(returnValue, null, null),
    //                 this.pointerFlowGraph.getPointerSetElement(stmt.getLeftOp(), null, null)
    //             )
    //         }
    //     }
    // }

    // /**
    //  * select a new context for pointer
    //  * @param sourceContext origin context
    //  * @param pointerTarget new pointer target 
    //  */
    // public selectContext(pointerTarget: PointerTarget, 
    //     sourceMethod: MethodWithContext, targetMethod: MethodWithContext, sourcePosition: number) {
    //     // WIP
    //     // TODO: how to distinguish different C.S. strategy?
    //     // Call-Site sentivity will only add context to method and var
    //     let sourceContext = sourceMethod.getContext()
    //     if (sourceContext instanceof CallSiteSensitiveContext) {
    //         return new CallSiteSensitiveContext(sourceContext, sourceMethod.getMethodSignature(), sourcePosition)
    //     }
    // }

    // protected addEdgeIntoPointerFlowGraph(source: Pointer, target: Pointer) {
    //     let newWorkListItems = this.pointerFlowGraph.addPointerFlowEdge(
    //         source, target
    //     )

    //     for (let newWorkListItem of newWorkListItems) {
    //         this.workList.push(newWorkListItem)
    //     }
    // }

    // protected trans2MethodWithContext(targetMethodSignature: MethodSignature, sourceMethodSignature: MethodSignature,
    //      sourceContext: Context, position: number) {
    //     if (this.options.strategy == 'insensitive') {
    //         return new MethodWithContext(targetMethodSignature,
    //             new InsensitiveContext(sourceMethodSignature, position))
    //     } else if (this.options.strategy == 'callSite') {
    //         if (sourceContext instanceof CallSiteSensitiveContext) {
    //             return new MethodWithContext(targetMethodSignature,
    //                 new CallSiteSensitiveContext(sourceContext, sourceMethodSignature, position)
    //             )
    //         }
    //     }
    // }

    // protected getSpecificCallTarget(expr: AbstractInvokeExpr, pointerTarget: PointerTarget): ArkMethod | null {
    //     let type = pointerTarget.getType()
    //     if (!(type instanceof ClassType)) {
    //         return null
    //     }
    //     let arkClassInstance = this.scene.getClass(type.getClassSignature())
    //     if (arkClassInstance == null) {
    //         logger.error("can not resolve classtype: "+type.toString())
    //         return null
    //     }
    //     const methodInstances = arkClassInstance.getMethods()
    //     for (let method of methodInstances) {
    //         if (method.getSignature().getMethodSubSignature().toString() === expr.getMethodSignature().getMethodSubSignature().toString()) {
    //             return method
    //         }
    //     }
    //     return null
    // }

    // protected getFieldRefFromUse(stmt: Stmt) {
    //     for (let use of stmt.getUses()) {
    //         if (use instanceof AbstractFieldRef) {
    //             return use as AbstractFieldRef;
    //         }
    //     }
    // }

    // protected getFieldFromDef(stmt: Stmt) {
    //     let def = stmt.getDef()
    //     if (def instanceof AbstractFieldRef) {
    //         return def as AbstractFieldRef;
    //     }
    // }
}

export interface PointerAnalysisOptions {
    strategy: 'insensitive' |'callSite' | 'object'
    depth?: number;
}