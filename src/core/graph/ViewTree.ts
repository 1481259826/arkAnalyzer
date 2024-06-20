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

import { CfgUitls } from '../../utils/CfgUtils';
import { Constant } from '../base/Constant';
import { Decorator } from '../base/Decorator';
import {
    AbstractInvokeExpr,
    ArkInstanceInvokeExpr,
    ArkNewExpr,
    ArkStaticInvokeExpr,
    ObjectLiteralExpr
} from '../base/Expr';
import { Local } from '../base/Local';
import { ArkInstanceFieldRef, ArkThisRef } from '../base/Ref';
import { ArkAssignStmt, ArkInvokeStmt, Stmt } from '../base/Stmt';
import { CallableType, ClassType, Type } from '../base/Type';
import { Value } from '../base/Value';
import {
    BUILDER_DECORATOR,
    BUILDER_PARAM_DECORATOR,
    COMPONENT_BRANCH_FUNCTION,
    COMPONENT_COMMON,
    COMPONENT_CREATE_FUNCTION,
    COMPONENT_CUSTOMVIEW,
    COMPONENT_IF,
    COMPONENT_IF_BRANCH,
    COMPONENT_POP_FUNCTION,
    COMPONENT_REPEAT,
    isEtsContainerComponent
} from '../common/EtsConst';
import { ArkClass } from '../model/ArkClass';
import { ArkField } from '../model/ArkField';
import { ArkMethod } from '../model/ArkMethod';
import { ClassSignature, MethodSignature } from '../model/ArkSignature';
import { Cfg } from './Cfg';
import Logger from '../../utils/logger';

const logger = Logger.getLogger();
const SPECIAL_CONTAINER_COMPONENT: Set<string> = new Set([COMPONENT_IF, COMPONENT_IF_BRANCH, COMPONENT_COMMON, COMPONENT_CUSTOMVIEW, COMPONENT_REPEAT]);
const COMPONENT_CREATE_FUNCTIONS: Set<string> = new Set([COMPONENT_CREATE_FUNCTION, COMPONENT_BRANCH_FUNCTION]);

class StateValuesUtils {
    private declaringArkClass: ArkClass;

    constructor(declaringArkClass: ArkClass) {
        this.declaringArkClass = declaringArkClass;
    }

    public static getInstance(declaringArkClass: ArkClass): StateValuesUtils {
        return new StateValuesUtils(declaringArkClass);
    }

    private parseMethodUsesStateValues(methodSignature: MethodSignature, uses: Set<ArkField>, visitor: Set<MethodSignature> = new Set()) {
        if (visitor.has(methodSignature)) {
            return;
        }
        visitor.add(methodSignature);
        let method = this.declaringArkClass.getMethod(methodSignature);
        if (!method) {
            return;
        }
        let stmts = method.getCfg().getStmts();
        for (const stmt of stmts) {
            this.parseStmtUsesStateValues(stmt, uses, true, visitor);
        }
    }

    public parseStmtUsesStateValues(stmt: Stmt, uses: Set<ArkField> = new Set(), wholeMethod: boolean = false, visitor: Set<MethodSignature> = new Set()) {
        for (const v of stmt.getUses()) {
            if (v instanceof ArkInstanceFieldRef) {
                let field = this.declaringArkClass.getField(v.getFieldSignature());
                let decorators = field?.getStateDecorators();
                if (field && decorators && decorators.length > 0) {
                    uses.add(field);
                }
            } else if (v instanceof Local) {
                let type = v.getType();
                if (type instanceof CallableType) {
                    this.parseMethodUsesStateValues(type.getMethodSignature(), uses, visitor);
                } else if (!wholeMethod) {
                    let declaringStmt = v.getDeclaringStmt();
                    if (declaringStmt) {
                        this.parseStmtUsesStateValues(declaringStmt, uses, wholeMethod, visitor);
                    }
                }
            }
        }
        return uses;
    }
}

export enum ViewTreeNodeType {
    SystemComponent,
    CustomComponent,
    Builder,
    BuilderParam
}

/**
 * @category core/graph
 */
export class ViewTreeNode {
    /** Component node name */
    name: string;
    /** @deprecated Use {@link attributes} instead. */
    stmts: Map<string, [Stmt, (Constant | ArkInstanceFieldRef | MethodSignature)[]]>;
    /** Component attribute stmts, key is attribute name, value is [Stmt, [Uses Values]]. */
    attributes: Map<string, [Stmt, (Constant | ArkInstanceFieldRef | MethodSignature)[]]>;
    /** Used state values. */
    stateValues: Set<ArkField>;
    /** Node's parent, CustomComponent and root node no parent. */
    parent: ViewTreeNode | null;
    /** Node's children. */
    children: ViewTreeNode[];
    /** @deprecated Use {@link signature} instead. */
    classSignature?: ClassSignature | MethodSignature;
    /** CustomComponent class signature or Builder method signature. */
    signature?: ClassSignature | MethodSignature;

    /**
     * Custom component value transfer
     * - key: ArkField, child custom component class stateValue field.
     * - value: ArkField | ArkMethod, parent component transfer value.  
     *     key is BuilderParam, the value is Builder ArkMethod.  
     *     Others, the value is parent class stateValue field.
     */
    stateValuesTransfer?: Map<ArkField, ArkField | ArkMethod>;

    /** BuilderParam placeholders ArkField. */
    builderParam?: ArkField;

    /** builderParam bind builder method signature. */
    builder?: MethodSignature;

    private type: ViewTreeNodeType;

    /**
     * @internal
     */
    constructor(name: string) {
        this.name = name;
        this.attributes = new Map();
        this.stmts = this.attributes;
        this.stateValues = new Set();
        this.parent = null;
        this.children = [];
        this.type = ViewTreeNodeType.SystemComponent;
    }

    /**
     * @internal
     */
    public static createCustomComponent(): ViewTreeNode {
        let instance = new ViewTreeNode(COMPONENT_CUSTOMVIEW);
        instance.type = ViewTreeNodeType.CustomComponent;
        return instance;
    }

    /**
     * @internal
     */
    public static createBuilderNode(): ViewTreeNode {
        let instance = new ViewTreeNode(BUILDER_DECORATOR);
        instance.type = ViewTreeNodeType.Builder;
        return instance;
    }

    /**
     * @internal
     */
    public static createBuilderParamNode(): ViewTreeNode {
        let instance = new ViewTreeNode(BUILDER_PARAM_DECORATOR);
        instance.type = ViewTreeNodeType.BuilderParam;
        return instance;
    }

    /**
     * @internal
     */
    public changeBuilderParam2BuilderNode(builder: ArkMethod) {
        this.name = BUILDER_DECORATOR;
        this.type = ViewTreeNodeType.Builder;
        this.signature = builder.getSignature();
        this.classSignature = this.signature;
        if (builder.getViewTree().getRoot()) {
            this.children.push(builder.getViewTree().getRoot());
        } else {
            logger.error(`ViewTree->changeBuilderParam2BuilderNode ${builder.getSignature().toString()} @Builder viewtree fail.`);
        }
    }

    /**
     * walk node and node's children 
     * @param selector Node selector function, return true skipping the follow-up nodes.
     * @returns 
     *  - true: There are nodes that meet the selector. 
     *  - false: does not exist.
     */
    public walk(selector: (item: ViewTreeNode) => boolean, visitor: Set<ViewTreeNode> = new Set()): boolean {
        if (visitor.has(this)) {
            return false;
        }

        let ret: boolean = selector(this);
        visitor.add(this);

        for (const child of this.children) {
            ret = ret || child.walk(selector, visitor);
            if (ret) {
                break;
            }
        }
        return ret;
    }

    /**
     * @internal
     */
    public hasBuilderParam(): boolean {
        return this.walk((item) => {
            return item.isBuilderParam();
        })
    }

    /**
     * Whether the node type is Builder.
     * @returns true: node is Builder, false others.
     */
    public isBuilder(): boolean {
        return this.type == ViewTreeNodeType.Builder;
    }

    /**
     * @internal
     */
    public isBuilderParam(): boolean {
        return this.type == ViewTreeNodeType.BuilderParam;
    }

    /**
     * Whether the node type is custom component.
     * @returns true: node is custom component, false others.
     */
    public isCustomComponent(): boolean {
        return this.type == ViewTreeNodeType.CustomComponent;
    }

    /**
     * @internal
     */
    public clone(parent: ViewTreeNode): ViewTreeNode {
        let newNode = new ViewTreeNode(this.name);
        newNode.attributes = this.attributes;
        newNode.stmts = newNode.attributes;
        newNode.stateValues = this.stateValues;
        newNode.parent = parent;
        newNode.type = this.type;
        newNode.signature = this.signature;
        newNode.classSignature = newNode.signature;
        newNode.builderParam = this.builderParam;
        newNode.builder = this.builder;

        for (const child of this.children) {
            newNode.children.push(child.clone(newNode));
        }

        return newNode;
    }

    /**
     * @internal
     */
    public addStmt(tree: ViewTree, stmt: Stmt) {
        this.parseAttributes(stmt);
        this.parseStateValues(tree, stmt);
    }

    private parseAttributes(stmt: Stmt) {
        let expr: AbstractInvokeExpr | undefined;
        if (stmt instanceof ArkAssignStmt) {
            let op = stmt.getRightOp();
            if (op instanceof ArkInstanceInvokeExpr) {
                expr = op;
            } else if (op instanceof ArkStaticInvokeExpr) {
                expr = op;
            }
        } else if (stmt instanceof ArkInvokeStmt) {
            let invoke = stmt.getInvokeExpr();
            if (invoke instanceof ArkInstanceInvokeExpr) {
                expr = invoke;
            } else if (invoke instanceof ArkStaticInvokeExpr) {
                expr = invoke;
            }
        }
        if (expr) {
            let key = expr.getMethodSignature().getMethodSubSignature().getMethodName();
            let relationValues: (Constant | ArkInstanceFieldRef | MethodSignature)[] = [];
            for (const arg of expr.getArgs()) {
                if (arg instanceof Local) {
                    this.getBindValues(arg, relationValues);
                } else if (arg instanceof Constant) {
                    relationValues.push(arg);
                }
            }
            this.attributes.set(key, [stmt, relationValues]);
        }

    }

    private getBindValues(local: Local, relationValues: (Constant | ArkInstanceFieldRef | MethodSignature)[], visitor: Set<Local> = new Set()) {
        if (visitor.has(local)) {
            return;
        }
        visitor.add(local);
        const stmt = local.getDeclaringStmt();
        if (!stmt) {
            let type = local.getType();
            if (type instanceof CallableType) {
                relationValues.push(type.getMethodSignature());
            }
            return;
        }
        for (const v of stmt.getUses()) {
            if (v instanceof Constant) {
                relationValues.push(v);
            } else if (v instanceof ArkInstanceFieldRef) {
                relationValues.push(v);
            } else if (v instanceof Local) {
                this.getBindValues(v, relationValues, visitor);
            }
        }
    }

    private parseStateValues(tree: ViewTree, stmt: Stmt) {
        let stateValues: Set<ArkField> = StateValuesUtils.getInstance(tree.getDeclaringArkClass()).parseStmtUsesStateValues(stmt);
        stateValues.forEach((field) => {
            this.stateValues.add(field);
            tree.addStateValue(field, this);
        }, this);
    }
}

class TreeNodeStack {
    protected root: ViewTreeNode;
    protected stack: ViewTreeNode[];

    constructor() {
        this.stack = [];
    }

    /**
     * ViewTree root node.
     * @returns root node
     */
    public getRoot(): ViewTreeNode {
        return this.root;
    }

    /**
     * @internal
     */
    public push(node: ViewTreeNode) {
        let parent = this.getParent();
        node.parent = parent;
        this.stack.push(node);
        if (parent == null) {
            this.root = node;
        } else {
            parent.children.push(node);
        }
    }

    /**
     * @internal
     */
    public pop() {
        this.stack.pop();
    }

    /**
     * @internal
     */
    public top(): ViewTreeNode | null {
        return this.isEmpty() ? null : this.stack[this.stack.length - 1];
    }

    /**
     * @internal
     */
    public isEmpty(): boolean {
        return this.stack.length == 0;
    }

    /**
     * @internal
     */
    public popAutomicComponent(name: string): void {
        if (this.isEmpty()) {
            return;
        }

        let node = this.stack[this.stack.length - 1];
        if (name != node.name && !this.isContainer(node.name)) {
            this.stack.pop();
        }
    }

    /**
     * @internal
     */
    public popComponentExpect(name: string): TreeNodeStack {
        for (let i = this.stack.length - 1; i >= 0; i--) {
            if (this.stack[i].name != name) {
                this.stack.pop();
            } else {
                break;
            }
        }
        return this;
    }

    private getParent(): ViewTreeNode | null {
        if (this.stack.length == 0) {
            return null;
        }

        let node = this.stack[this.stack.length - 1];
        if (!this.isContainer(node.name)) {
            this.stack.pop();
        }
        return this.stack[this.stack.length - 1];
    }

    protected isContainer(name: string): boolean {
        return isEtsContainerComponent(name) || SPECIAL_CONTAINER_COMPONENT.has(name);
    }
}

/**
 * ArkUI Component Tree
 * @example
 * // Component Class get ViewTree
 * let arkClas: ArkClass = ...;
 * let viewtree = arkClas.getViewTree();
 * 
 * // get viewtree root node
 * let root: ViewTreeNode = viewtree.getRoot();
 * 
 * // get viewtree stateValues Map
 * let stateValues: Map<ArkField, Set<ViewTreeNode>> = viewtree.getStateValues();
 * 
 * // walk all nodes
 * root.walk((node) => {
 *   // check node is builder
 *   if (node.isBuilder()) {
 *      xx
 *   } 
 *   
 *   // check node is sub CustomComponent
 *   if (node.isCustomComponent()) {
 *      xx
 *   }
 *   
 *   if (xxx) {
 *      // Skip the remaining nodes and end the traversal
 *      return true;
 *   }
 *      
 *   return false;
 * })
 * 
 * @category core/graph
 */
export class ViewTree extends TreeNodeStack {
    private render: ArkMethod;
    private buildViewStatus: boolean;
    private stateValues: Map<ArkField, Set<ViewTreeNode>>;
    private fieldTypes: Map<string, Decorator | Type>;

    /**
     * @internal
     */
    constructor(render: ArkMethod) {
        super();
        this.render = render;
        this.stateValues = new Map();
        this.fieldTypes = new Map();
        this.buildViewStatus = false;
    }

    /**
     * @internal
     */
    public buildViewTree() {
        if (!this.render || this.isInitialized()) {
            return;
        }
        this.buildViewStatus = true;
        this.loadClasssFieldTypes();
        buildViewTree(this, this.render.getCfg());
    }

    /**
     * @internal
     */
    public isInitialized(): boolean {
        return this.root != null || this.buildViewStatus;
    }

    /**
     * Map of the component controlled by the state variable
     * @returns 
     */
    public getStateValues(): Map<ArkField, Set<ViewTreeNode>> {
        return this.stateValues;
    }

    /**
     * @internal
     */
    public addStateValue(field: ArkField, node: ViewTreeNode) {
        if (!this.stateValues.has(field)) {
            this.stateValues.set(field, new Set());
        }
        let sets = this.stateValues.get(field);
        sets?.add(node);
    }

    /**
     * @internal
     */
    public isCreateFunc(name: string): boolean {
        return COMPONENT_CREATE_FUNCTIONS.has(name);
    }

    private loadClasssFieldTypes() {
        for (const field of this.render.getDeclaringArkClass().getFields()) {
            let decorators = field.getStateDecorators();
            if (decorators.length > 0) {
                if (decorators.length == 1) {
                    this.fieldTypes.set(field.getName(), decorators[0]);
                } else {
                    this.fieldTypes.set(field.getName(), decorators);
                }
            } else {
                this.fieldTypes.set(field.getName(), field.getSignature().getType());
            }
        }
    }

    /**
     * @deprecated Use {@link getStateValues} instead. 
     */
    public isClassField(name: string) {
        return this.fieldTypes.has(name);
    }

    /**
     * @internal
     */
    public getDeclaringArkClass() {
        return this.render.getDeclaringArkClass();
    }

    /**
     * @internal
     */
    public findMethod(methodSignature: MethodSignature): ArkMethod | null {
        let method = this.render.getDeclaringArkFile().getScene().getMethod(methodSignature);
        if (method) {
            return method;
        }

        // class
        method = this.render.getDeclaringArkClass().getMethod(methodSignature);
        if (method) {
            return method;
        }

        return this.findMethodWithName(methodSignature.getMethodSubSignature().getMethodName())
    }

    /**
     * @internal
     */
    public findMethodWithName(name: string): ArkMethod | null {
        let method = this.getDeclaringArkClass().getMethodWithName(name);
        if (method) {
            return method;
        }

        // namespace
        this.getDeclaringArkClass().getDeclaringArkNamespace()?.getAllMethodsUnderThisNamespace().forEach((value) => {
            if (value.getName() == name) {
                method = value;
            }
        })
        if (method) {
            return method;
        }

        this.getDeclaringArkClass().getDeclaringArkFile().getAllNamespacesUnderThisFile().forEach((namespace) => {
            namespace.getAllMethodsUnderThisNamespace().forEach((value) => {
                if (value.getName() == name) {
                    method = value;
                }
            })
        })
        return method;
    }

    /**
     * @internal
     */
    public findClass(classSignature: ClassSignature): ArkClass | null {
        let cls = this.render.getDeclaringArkFile().getScene().getClass(classSignature);
        if (cls) {
            return cls;
        }

        cls = this.render.getDeclaringArkClass().getDeclaringArkNamespace()?.getClassWithName(classSignature.getClassName());
        if (cls) {
            return cls;
        }

        return this.render.getDeclaringArkFile().getClassWithName(classSignature.getClassName());
    }

    /**
     * @deprecated Use {@link getStateValues} instead. 
     */
    public getClassFieldType(name: string): Decorator | Type | undefined {
        return this.fieldTypes.get(name);
    }

    /**
     * @internal
     */
    public addBuilderNode(method: ArkMethod): ViewTreeNode | undefined {
        if (!method.hasBuilderDecorator()) {
            logger.error(`ViewTree->addBuilderNode ${method.getSignature().toString()} is not @Builder.`);
            return;
        }

        let builderViewTree = method.getViewTree();
        if (!builderViewTree || !builderViewTree.getRoot()) {
            logger.error(`ViewTree->addBuilderNode ${method.getSignature().toString()} build viewtree fail.`);
            return;
        }

        let node = ViewTreeNode.createBuilderNode();
        node.signature = method.getSignature();
        node.classSignature = node.signature;
        this.push(node);

        node.children.push(builderViewTree.getRoot());
        this.pop();
        return node;
    }

    private findMethodInvokeBuilderMethod(method: ArkMethod) : ArkMethod | undefined {
        for (const stmt of method.getCfg().getStmts()) {
            if (!(stmt instanceof ArkInvokeStmt)) {
                continue;
            }

            let expr = stmt.getInvokeExpr();
            let method = this.findMethod(expr.getMethodSignature());
            if (method?.hasBuilderDecorator()) {
                return method;
            }
        }
    }

    private parseObjectLiteralExpr(cls: ArkClass, object: Value | undefined, builder: ArkMethod | undefined): Map<ArkField, ArkField | ArkMethod> | undefined {
        let transferMap: Map<ArkField, ArkField | ArkMethod> = new Map();
        if (object instanceof ObjectLiteralExpr) {
            object.getAnonymousClass().getFields().forEach((field) => {
                let dstField = cls.getFieldWithName(field.getName());
                if (dstField?.getStateDecorators().length == 0 && !dstField?.hasBuilderParamDecorator()) {
                    return;
                }

                let value = field.getInitializer();
                if (dstField?.hasBuilderParamDecorator()) {
                    let method: ArkMethod | undefined | null;
                    if (value instanceof ArkInstanceFieldRef) {
                        method = this.findMethodWithName(value.getFieldName());
                    } else if (value instanceof ArkStaticInvokeExpr) {
                        method = this.findMethod(value.getMethodSignature());
                    } else if (value instanceof Local) {
                        method = this.findMethodWithName(value.getName());
                    }
                    if (method && !method.hasBuilderDecorator()) {
                        method = this.findMethodInvokeBuilderMethod(method);
                    } 
                    if (method) {
                        transferMap.set(dstField, method);
                    }
                } else {
                    let srcField: ArkField | undefined | null;
                    if (value instanceof ArkInstanceFieldRef) {
                        srcField = this.getDeclaringArkClass().getFieldWithName(value.getFieldName());
                    }
                    if (srcField && dstField) {
                        transferMap.set(dstField, srcField);
                    }
                }
            });
        }
        // If the builder exists, there will be a unique BuilderParam
        if (builder) {
            cls.getFields().forEach((value) => {
                if (value.hasBuilderParamDecorator()) {
                    transferMap.set(value, builder);
                }
            })
        }

        if (transferMap.size == 0) {
            return;
        }
        return transferMap;
    }

    /**
     * @internal
     */
    public addCustomComponentNode(cls: ArkClass, arg: Value | undefined, builder: ArkMethod | undefined): ViewTreeNode | undefined {
        if (!cls.hasComponentDecorator()) {
            logger.error(`ViewTree->addCustomComponentNode ${cls.getSignature().toString()} is not component.`);
            return;
        }

        let componentViewTree = cls.getViewTree();
        if (!componentViewTree || !componentViewTree.getRoot()) {
            logger.error(`ViewTree->addCustomComponentNode ${cls.getSignature().toString()} build viewtree fail.`);
            return;
        }
        if (!this.root) {
            this.push(new ViewTreeNode(COMPONENT_COMMON));
        }
        let node = ViewTreeNode.createCustomComponent();
        node.signature = cls.getSignature();
        node.classSignature = node.signature;
        node.stateValuesTransfer = this.parseObjectLiteralExpr(cls, arg, builder)
        this.push(node);
        let root = componentViewTree.getRoot();
        if (root.hasBuilderParam()) {
            root = root.clone(node);
            if (node.stateValuesTransfer) {
                root.walk((item) => {
                    if (item.isBuilderParam() && item.builderParam) {
                        let method = node.stateValuesTransfer?.get(item.builderParam) as ArkMethod;
                        if (method) {
                            item.changeBuilderParam2BuilderNode(method);
                        }
                    }
                    return false;
                })
            }
        }
        node.children.push(root);
        return node;
    }

    /**
     * @internal
     */
    public addBuilderParamNode(field: ArkField): ViewTreeNode {
        let node = ViewTreeNode.createBuilderParamNode();
        node.builderParam = field;
        this.push(node);
        this.pop();

        return node;
    }

    /**
     * @internal
     */
    public addSystemComponentNode(name: string): ViewTreeNode {
        let node = new ViewTreeNode(name);
        this.push(node);

        return node;
    }
}

function viewComponentCreationParser(viewtree: ViewTree, name: string, stmt: Stmt, expr: AbstractInvokeExpr): ViewTreeNode | undefined {
    let temp = expr.getArg(0) as Local;
    let arg: Value | undefined;
    temp.getUsedStmts().forEach((value) => {
        if (value instanceof ArkInvokeStmt) {
            let invokerExpr = value.getInvokeExpr();
            let methodName = invokerExpr.getMethodSignature().getMethodSubSignature().getMethodName();
            if (methodName == 'constructor') {
                arg = invokerExpr.getArg(0);
            }
        }
    });

    let builderMethod: ArkMethod | undefined;
    let builder = expr.getArg(1) as Local;
    if (builder) {
        let method = viewtree.findMethod((builder.getType() as CallableType).getMethodSignature());
        if (!method?.hasViewTree()) {
            method?.setViewTree(new ViewTree(method));
        }
        if (method) {
            builderMethod = method;
        }
    }

    let initValue = CfgUitls.backtraceLocalInitValue(temp);
    if (!(initValue instanceof ArkNewExpr)) {
        return;
    }

    let clsSignature = (initValue.getType() as ClassType).getClassSignature();
    if (clsSignature) {
        let cls = viewtree.findClass(clsSignature);
        if (cls) {
            return viewtree.addCustomComponentNode(cls, arg, builderMethod);
        } else {
            logger.error(`ViewTree->viewComponentCreationParser not found class. ${stmt.toString()}`);
        }
    }
}

function forEachCreationParser(viewtree: ViewTree, name: string, stmt: Stmt, expr: AbstractInvokeExpr): ViewTreeNode {
    let node = viewtree.addSystemComponentNode(name);
    let values = expr.getArg(0) as Local;
    let declaringStmt = values?.getDeclaringStmt();
    if (declaringStmt) {
        let stateValues = StateValuesUtils.getInstance(viewtree.getDeclaringArkClass()).parseStmtUsesStateValues(declaringStmt);
        stateValues.forEach((field) => {
            node.stateValues.add(field);
            viewtree.addStateValue(field, node);
        })
    }

    let type = (expr.getArg(1) as Local).getType() as CallableType;
    let method = viewtree.findMethod(type.getMethodSignature());
    if (method) {
        buildViewTree(viewtree, method.getCfg());
    }
    return node;
}

function repeatCreationParser(viewtree: ViewTree, name: string, stmt: Stmt, expr: AbstractInvokeExpr): ViewTreeNode {
    let node = viewtree.addSystemComponentNode(name);
    let arg = expr.getArg(0) as Local;
    let declaringStmt = arg?.getDeclaringStmt();
    if (declaringStmt) {
        let stateValues = StateValuesUtils.getInstance(viewtree.getDeclaringArkClass()).parseStmtUsesStateValues(declaringStmt);
        stateValues.forEach((field) => {
            node.stateValues.add(field);
            viewtree.addStateValue(field, node);
        })
    }

    return node;
}

function ifBranchCreationParser(viewtree: ViewTree, name: string, stmt: Stmt, expr: AbstractInvokeExpr): ViewTreeNode {
    viewtree.popComponentExpect(COMPONENT_IF);
    return viewtree.addSystemComponentNode(COMPONENT_IF_BRANCH);
}

const COMPONENT_CREATE_PARSERS: Map<string, (viewtree: ViewTree, name: string, stmt: Stmt, expr: AbstractInvokeExpr)=> ViewTreeNode|undefined> = new Map([
    ['ForEach.create', forEachCreationParser],
    ['LazyForEach.create', forEachCreationParser],
    ['Repeat.create', repeatCreationParser],
    ['View.create', viewComponentCreationParser],
    ['If.branch', ifBranchCreationParser]
]);

function componentCreateParse(componentName: string, methodName: string, viewTree: ViewTree, stmt: Stmt, expr: ArkStaticInvokeExpr): ViewTreeNode | undefined {
    let parserFn = COMPONENT_CREATE_PARSERS.get(`${componentName}.${methodName}`);
    if (parserFn) {
        let node = parserFn(viewTree, componentName, stmt, expr);
        node?.addStmt(viewTree, stmt);
        return node;
    }
    viewTree.popAutomicComponent(componentName);
    let node = viewTree.addSystemComponentNode(componentName);
    node.addStmt(viewTree, stmt);
    return node;
}

function parseStaticInvokeExpr(viewTree: ViewTree, local2Node: Map<Local, ViewTreeNode>, stmt: Stmt, expr: ArkStaticInvokeExpr): ViewTreeNode | undefined {
    let methodSignature = expr.getMethodSignature();
    let method = viewTree.findMethod(methodSignature);
    if (method?.hasBuilderDecorator()) {
        return viewTree.addBuilderNode(method);
    }

    let name = methodSignature.getDeclaringClassSignature().getClassName();
    let methodName = methodSignature.getMethodSubSignature().getMethodName();

    if (viewTree.isCreateFunc(methodName)) {
        return componentCreateParse(name, methodName, viewTree, stmt, expr);
    }

    let currentNode = viewTree.top();
    if (name == currentNode?.name) {
        currentNode.addStmt(viewTree, stmt);
        if (methodName == COMPONENT_POP_FUNCTION) {
            viewTree.pop();
            if (viewTree.top()?.name == COMPONENT_COMMON) {
                viewTree.pop();
            }
        }
        return currentNode;
    } else if (name == COMPONENT_IF && methodName == COMPONENT_POP_FUNCTION) {
        viewTree.popComponentExpect(COMPONENT_IF);
        viewTree.pop();
    }
}

/**
 * $temp4.margin({ top: 20 });
 * @param viewTree 
 * @param local2Node 
 * @param expr 
 */
function parseInstanceInvokeExpr(viewTree: ViewTree, local2Node: Map<Local, ViewTreeNode>, stmt: Stmt, expr: ArkInstanceInvokeExpr): ViewTreeNode | undefined {
    let temp = expr.getBase();
    if (local2Node.has(temp)) {
        let component = local2Node.get(temp);
        if (component?.name == COMPONENT_REPEAT &&
            expr.getMethodSignature().getMethodSubSignature().getMethodName() == 'each') {
            let arg = expr.getArg(0);
            let type = arg.getType();
            if (type instanceof CallableType) {
                let method = viewTree.findMethod(type.getMethodSignature());
                if (method) {
                    buildViewTree(viewTree, method.getCfg());
                }
            }
            viewTree.pop();
        } else {
            component?.addStmt(viewTree, stmt);
        }

        return component;
    }

    let name = expr.getBase().getName();
    if (name.startsWith('$temp')) {
        let initValue = CfgUitls.backtraceLocalInitValue(expr.getBase());
        if (initValue instanceof ArkThisRef) {
            name = 'this';
        }
    }

    let methodName = expr.getMethodSignature().getMethodSubSignature().getMethodName();
    let field = viewTree.getDeclaringArkClass().getFieldWithName(methodName);
    if (name == 'this' && field?.hasBuilderParamDecorator()) {
        return viewTree.addBuilderParamNode(field);
    }

    let method = viewTree.findMethod(expr.getMethodSignature());
    if (name == 'this' && method?.hasBuilderDecorator()) {
        return viewTree.addBuilderNode(method);
    }
}

/**
 * $temp3 = View.create($temp2);
 * $temp4 = View.pop();
 * $temp4.margin({ top: 20 });
 * 
 * $temp2 = List.create();
 * $temp5 = $temp2.width('100%');
 * $temp6 = $temp5.height('100%');
 * $temp6.backgroundColor('#FFDCDCDC');
 * @param viewTree
 * @param local2Node 
 * @param stmt 
 * @returns 
 */
function parseAssignStmt(viewTree: ViewTree, local2Node: Map<Local, ViewTreeNode>, stmt: ArkAssignStmt) {
    let left = stmt.getLeftOp();
    let right = stmt.getRightOp();

    if (!(left instanceof Local)) {
        return;
    }

    let component: ViewTreeNode | undefined;
    if (right instanceof ArkStaticInvokeExpr) {
        component = parseStaticInvokeExpr(viewTree, local2Node, stmt, right);
    } else if (right instanceof ArkInstanceInvokeExpr) {
        component = parseInstanceInvokeExpr(viewTree, local2Node, stmt, right);
    }
    if (component) {
        local2Node.set(left, component);
    }
}

function parseInvokeStmt(viewTree: ViewTree, local2Node: Map<Local, ViewTreeNode>, stmt: ArkInvokeStmt) {
    let expr = stmt.getInvokeExpr();
    if (expr instanceof ArkStaticInvokeExpr) {
        parseStaticInvokeExpr(viewTree, local2Node, stmt, expr);
    } else if (expr instanceof ArkInstanceInvokeExpr) {
        parseInstanceInvokeExpr(viewTree, local2Node, stmt, expr);
    }
}

function buildViewTree(viewTree: ViewTree, cfg: Cfg, local2Node: Map<Local, ViewTreeNode> = new Map()) {
    let blocks = cfg.getBlocks();
    for (const block of blocks) {
        for (const stmt of block.getStmts()) {
            if (!(stmt instanceof ArkInvokeStmt || stmt instanceof ArkAssignStmt)) {
                continue;
            }

            if (stmt instanceof ArkAssignStmt) {
                parseAssignStmt(viewTree, local2Node, stmt);
            } else if (stmt instanceof ArkInvokeStmt) {
                parseInvokeStmt(viewTree, local2Node, stmt);
            }
        }
    }
}