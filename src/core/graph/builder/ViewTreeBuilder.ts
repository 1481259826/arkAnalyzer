/*
 * Copyright (c) 2024-2025 Huawei Device Co., Ltd.
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

import { Constant, StringConstant } from '../../base/Constant';
import { Decorator } from '../../base/Decorator';
import {
    AbstractInvokeExpr,
    ArkConditionExpr,
    ArkInstanceInvokeExpr,
    ArkNewExpr,
    ArkNormalBinopExpr,
    ArkPtrInvokeExpr,
    ArkStaticInvokeExpr,
} from '../../base/Expr';
import { Local } from '../../base/Local';
import { ArkArrayRef, ArkInstanceFieldRef, ArkThisRef } from '../../base/Ref';
import { ArkAssignStmt, ArkInvokeStmt, Stmt } from '../../base/Stmt';
import { ArrayType, ClassType, FunctionType, Type } from '../../base/Type';
import { Value } from '../../base/Value';
import {
    BUILDER_DECORATOR,
    BUILDER_PARAM_DECORATOR,
    COMPONENT_BINDCONTENT,
    COMPONENT_BINDSHEET,
    COMPONENT_BRANCH_FUNCTION,
    COMPONENT_CREATE_FUNCTION,
    COMPONENT_CUSTOMVIEW,
    COMPONENT_DIALOG,
    COMPONENT_FOR_EACH,
    COMPONENT_IF,
    COMPONENT_IF_BRANCH,
    COMPONENT_LAZY_FOR_EACH,
    COMPONENT_MENU,
    COMPONENT_MENUWRAPPER,
    COMPONENT_PAGEMAP,
    COMPONENT_POP_FUNCTION,
    COMPONENT_POPUP,
    COMPONENT_REPEAT,
    COMPONENT_ROOT,
    COMPONENT_TABBAR,
    isEtsContainerComponent,
    SPECIAL_CONTAINER_COMPONENT,
} from '../../common/EtsConst';
import { ArkClass, ClassCategory } from '../../model/ArkClass';
import { ArkField } from '../../model/ArkField';
import { ArkMethod } from '../../model/ArkMethod';
import { ClassSignature, MethodSignature } from '../../model/ArkSignature';
import { Cfg } from '../Cfg';
import Logger, { LOG_MODULE_TYPE } from '../../../utils/logger';
import { ViewTree, ViewTreeNode } from '../ViewTree';
import { ModelUtils } from '../../common/ModelUtils';
import { Scene } from '../../../Scene';
import { TEMP_LOCAL_PREFIX } from '../../common/Const';

const logger = Logger.getLogger(LOG_MODULE_TYPE.ARKANALYZER, 'ViewTreeBuilder');
const COMPONENT_CREATE_FUNCTIONS: Set<string> = new Set([COMPONENT_CREATE_FUNCTION, COMPONENT_BRANCH_FUNCTION]);

function backtraceLocalInitValue(value: Local): Local | Value {
    let stmt = value.getDeclaringStmt();
    if (stmt instanceof ArkAssignStmt) {
        let rightOp = stmt.getRightOp();
        if (rightOp instanceof Local) {
            return backtraceLocalInitValue(rightOp);
        } else if (rightOp instanceof ArkInstanceFieldRef && rightOp.getBase().getName().startsWith(TEMP_LOCAL_PREFIX)) {
            return backtraceLocalInitValue(rightOp.getBase());
        } else if (rightOp instanceof ArkArrayRef) {
            return backtraceLocalInitValue(rightOp.getBase());
        }
        return rightOp;
    }
    return value;
}

type ObjectLiteralMap = Map<ArkField, Value | ObjectLiteralMap>;

function parseObjectLiteral(objectLiteralCls: ArkClass | null, scene: Scene): ObjectLiteralMap {
    let map: ObjectLiteralMap = new Map();
    if (objectLiteralCls?.getCategory() !== ClassCategory.OBJECT) {
        return map;
    }
    objectLiteralCls?.getFields().forEach(field => {
        let stmts = field.getInitializer();
        if (stmts.length === 0) {
            return;
        }

        let assignStmt = stmts[stmts.length - 1];
        if (!(assignStmt instanceof ArkAssignStmt)) {
            return;
        }

        let value = assignStmt.getRightOp();
        if (value instanceof Local) {
            value = backtraceLocalInitValue(value);
        }

        map.set(field, value);
        if (value instanceof ArkNewExpr) {
            let subCls = ModelUtils.getArkClassInBuild(scene, value.getClassType());
            let childMap = parseObjectLiteral(subCls, scene);
            if (childMap) {
                map.set(field, childMap);
            }
        }
    });

    return map;
}

class StateValuesUtils {
    private declaringArkClass: ArkClass;

    constructor(declaringArkClass: ArkClass) {
        this.declaringArkClass = declaringArkClass;
    }

    public static getInstance(declaringArkClass: ArkClass): StateValuesUtils {
        return new StateValuesUtils(declaringArkClass);
    }

    public parseStmtUsesStateValues(
        stmt: Stmt,
        uses: Set<ArkField> = new Set(),
        wholeMethod: boolean = false,
        visitor: Set<MethodSignature | Stmt> = new Set()
    ): Set<ArkField> {
        if (visitor.has(stmt)) {
            return uses;
        }
        visitor.add(stmt);
        let values = stmt.getUses();
        if (stmt instanceof ArkAssignStmt) {
            values.push(stmt.getLeftOp());
        }

        for (const v of values) {
            this.parseValueUsesStateValues(v, uses, wholeMethod, visitor);
        }
        return uses;
    }

    private objectLiteralMapUsedStateValues(uses: Set<ArkField>, map: ObjectLiteralMap): void {
        for (const [_, value] of map) {
            if (value instanceof ArkInstanceFieldRef) {
                let srcField = this.declaringArkClass.getFieldWithName(value.getFieldName());
                let decorators = srcField?.getStateDecorators();
                if (srcField && decorators && decorators.length > 0) {
                    uses.add(srcField);
                }
            } else if (value instanceof Map) {
                this.objectLiteralMapUsedStateValues(uses, value);
            } else if (value instanceof ArkNormalBinopExpr || value instanceof ArkConditionExpr) {
                this.parseValueUsesStateValues(value.getOp1(), uses);
                this.parseValueUsesStateValues(value.getOp2(), uses);
            }
        }
    }

    public parseObjectUsedStateValues(type: Type, uses: Set<ArkField> = new Set()): Set<ArkField> {
        if (!(type instanceof ClassType)) {
            return uses;
        }
        let cls = ModelUtils.getArkClassInBuild(this.declaringArkClass.getDeclaringArkFile().getScene(), type);
        let map = parseObjectLiteral(cls, this.declaringArkClass.getDeclaringArkFile().getScene());
        this.objectLiteralMapUsedStateValues(uses, map);
        return uses;
    }

    private parseMethodUsesStateValues(methodSignature: MethodSignature, uses: Set<ArkField>, visitor: Set<MethodSignature | Stmt> = new Set()): void {
        if (visitor.has(methodSignature)) {
            return;
        }
        visitor.add(methodSignature);
        let method = this.declaringArkClass.getDeclaringArkFile().getScene().getMethod(methodSignature);
        if (!method) {
            return;
        }
        let stmts = method.getCfg()?.getStmts();
        if (!stmts) {
            return;
        }
        for (const stmt of stmts) {
            this.parseStmtUsesStateValues(stmt, uses, true, visitor);
        }
    }

    private parseValueUsesStateValues(
        v: Value,
        uses: Set<ArkField> = new Set(),
        wholeMethod: boolean = false,
        visitor: Set<MethodSignature | Stmt> = new Set()
    ): Set<ArkField> {
        if (v instanceof ArkInstanceFieldRef) {
            let field = this.declaringArkClass.getField(v.getFieldSignature());
            let decorators = field?.getStateDecorators();
            if (field && decorators && decorators.length > 0) {
                uses.add(field);
            }
        } else if (v instanceof ArkInstanceInvokeExpr) {
            this.parseMethodUsesStateValues(v.getMethodSignature(), uses, visitor);
        } else if (v instanceof Local) {
            if (v.getName() === 'this') {
                return uses;
            }
            let type = v.getType();
            if (type instanceof FunctionType) {
                this.parseMethodUsesStateValues(type.getMethodSignature(), uses, visitor);
                return uses;
            }
            this.parseObjectUsedStateValues(type, uses);
            let declaringStmt = v.getDeclaringStmt();
            if (!wholeMethod && declaringStmt) {
                this.parseStmtUsesStateValues(declaringStmt, uses, wholeMethod, visitor);
            }
        }

        return uses;
    }
}

enum ViewTreeNodeType {
    SystemComponent,
    CustomComponent,
    Builder,
    BuilderParam,
}

class ViewTreeNodeImpl implements ViewTreeNode {
    name: string;
    stmts: Map<string, [Stmt, (MethodSignature | ArkInstanceFieldRef | Constant)[]]>;
    attributes: Map<string, [Stmt, (MethodSignature | ArkInstanceFieldRef | Constant)[]]>;
    stateValues: Set<ArkField>;
    parent: ViewTreeNode | null;
    children: ViewTreeNodeImpl[];
    classSignature?: MethodSignature | ClassSignature | undefined;
    signature?: MethodSignature | ClassSignature | undefined;
    stateValuesTransfer?: Map<ArkField, ArkMethod | ArkField> | undefined;
    builderParam?: ArkField | undefined;
    builder?: MethodSignature | undefined;
    text_content?: string;
    private type: ViewTreeNodeType;

    constructor(name: string) {
        this.name = name;
        this.attributes = new Map();
        this.stmts = this.attributes;
        this.stateValues = new Set();
        this.parent = null;
        this.children = [];
        this.type = ViewTreeNodeType.SystemComponent;
        this.text_content = '';
    }

    /**
     * Whether the node type is Builder.
     * @returns true: node is Builder, false others.
     */
    public isBuilder(): boolean {
        return this.type === ViewTreeNodeType.Builder;
    }

    /**
     * @internal
     */
    public isBuilderParam(): boolean {
        return this.type === ViewTreeNodeType.BuilderParam;
    }

    /**
     * Whether the node type is custom component.
     * @returns true: node is custom component, false others.
     */
    public isCustomComponent(): boolean {
        return this.type === ViewTreeNodeType.CustomComponent;
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

    public static createCustomComponent(): ViewTreeNodeImpl {
        let instance = new ViewTreeNodeImpl(COMPONENT_CUSTOMVIEW);
        instance.type = ViewTreeNodeType.CustomComponent;
        return instance;
    }

    public static createBuilderNode(): ViewTreeNodeImpl {
        let instance = new ViewTreeNodeImpl(BUILDER_DECORATOR);
        instance.type = ViewTreeNodeType.Builder;
        return instance;
    }

    public static createBuilderParamNode(): ViewTreeNodeImpl {
        let instance = new ViewTreeNodeImpl(BUILDER_PARAM_DECORATOR);
        instance.type = ViewTreeNodeType.BuilderParam;
        return instance;
    }
    public static createTabBarNode(): ViewTreeNodeImpl {
        let instance = new ViewTreeNodeImpl(COMPONENT_TABBAR);
        instance.type = ViewTreeNodeType.SystemComponent;
        return instance;
    }
    public static createPageMapNode(): ViewTreeNodeImpl {
        let instance = new ViewTreeNodeImpl(COMPONENT_PAGEMAP);
        instance.type = ViewTreeNodeType.CustomComponent;
        return instance;
    }
    public static createRootNode(): ViewTreeNodeImpl {
        let instance = new ViewTreeNodeImpl(COMPONENT_ROOT);
        instance.type = ViewTreeNodeType.SystemComponent;
        return instance;
    }
    public static createBindContentNode(): ViewTreeNodeImpl {
        let instance = new ViewTreeNodeImpl(COMPONENT_BINDCONTENT);
        instance.type = ViewTreeNodeType.SystemComponent;
        return instance;
    }
    public static createAlertDialogNode(): ViewTreeNodeImpl {
        let instance = new ViewTreeNodeImpl("AlertDialog");
        instance.type = ViewTreeNodeType.SystemComponent;
        return instance;
    }



    public static createBindSheetNode(): ViewTreeNodeImpl {
        let instance = new ViewTreeNodeImpl(COMPONENT_BINDSHEET);
        instance.type = ViewTreeNodeType.SystemComponent;
        return instance;
    }
    public static createMenuNode(): ViewTreeNodeImpl {
        let instance = new ViewTreeNodeImpl(COMPONENT_MENU);
        instance.type = ViewTreeNodeType.SystemComponent;
        return instance;
    }
    public static createMenuWrapperNode(): ViewTreeNodeImpl {
        let instance = new ViewTreeNodeImpl(COMPONENT_MENUWRAPPER);
        instance.type = ViewTreeNodeType.SystemComponent;
        return instance;
    }
    public static createPopupNode(): ViewTreeNodeImpl {
        let instance = new ViewTreeNodeImpl(COMPONENT_POPUP);
        instance.type = ViewTreeNodeType.SystemComponent;
        return instance;
    }
    public static createTipsDialogNode(): ViewTreeNodeImpl {
        let instance = new ViewTreeNodeImpl('TipsDialog');
        instance.type =  ViewTreeNodeType.SystemComponent;
        return instance;
    }
    public static createConfirmDialogNode(): ViewTreeNodeImpl {
        let instance = new ViewTreeNodeImpl('ConfirmDialog');
        instance.type = ViewTreeNodeType.SystemComponent;
        return instance;
    }
    public static createSelectDialogNode(): ViewTreeNodeImpl {
        let instance = new ViewTreeNodeImpl('SelectDialog');
        instance.type =  ViewTreeNodeType.SystemComponent;
        return instance;
    }
    public static createLodaingDialogNode(): ViewTreeNodeImpl {
        let instance = new ViewTreeNodeImpl("LoadingDialog");
        instance.type = ViewTreeNodeType.SystemComponent;
        return instance;
    }
    public static createCustomContentDialogNode(): ViewTreeNodeImpl {
        let instance = new ViewTreeNodeImpl("CustomContentDialog");
        instance.type = ViewTreeNodeType.SystemComponent;
        return instance;
    }
    public static createToastNode(): ViewTreeNodeImpl {
        let instance = new ViewTreeNodeImpl("Toast");
        instance.type = ViewTreeNodeType.SystemComponent;
        return instance;
    }
    public static createPopoverDialogNode(): ViewTreeNodeImpl {
        let instance = new ViewTreeNodeImpl("PopoverDialog");
        instance.type = ViewTreeNodeType.SystemComponent;
        return instance;
    }
    public static createActionSheetNode(): ViewTreeNodeImpl {
        let instance = new ViewTreeNodeImpl("ActionSheet");
        instance.type = ViewTreeNodeType.SystemComponent;
        return instance;
    }
    public static createDialogNode(): ViewTreeNodeImpl {
        let instance = new ViewTreeNodeImpl(COMPONENT_DIALOG);
        instance.type = ViewTreeNodeType.SystemComponent;
        return instance;
    }
    public changeBuilderParam2BuilderNode(builder: ArkMethod): void {
        this.name = BUILDER_DECORATOR;
        this.type = ViewTreeNodeType.Builder;
        this.signature = builder.getSignature();
        this.classSignature = this.signature;
        const root = builder.getViewTree()?.getRoot();
        if (root) {
            for (let child of root.children) {
                this.children.push(child as ViewTreeNodeImpl);
            }
        } else {
            logger.error(`ViewTree->changeBuilderParam2BuilderNode ${builder.getSignature().toString()} @Builder viewtree fail.`);
        }
    }

    public hasBuilderParam(): boolean {
        return this.walk(item => {
            return (item as ViewTreeNodeImpl).isBuilderParam();
        });
    }

    public clone(parent: ViewTreeNodeImpl, map: Map<ViewTreeNodeImpl, ViewTreeNodeImpl> = new Map()): ViewTreeNodeImpl {
        let newNode = new ViewTreeNodeImpl(this.name);
        newNode.attributes = this.attributes;
        newNode.stmts = newNode.attributes;
        newNode.stateValues = this.stateValues;
        newNode.parent = parent;
        newNode.type = this.type;
        newNode.signature = this.signature;
        newNode.classSignature = newNode.signature;
        newNode.builderParam = this.builderParam;
        newNode.builder = this.builder;
        map.set(this, newNode);

        for (const child of this.children) {
            if (map.has(child)) {
                newNode.children.push(map.get(child)!);
            } else {
                newNode.children.push(child.clone(newNode, map));
            }
        }

        return newNode;
    }

    public addStmt(tree: ViewTreeImpl, stmt: Stmt): void {
        this.parseAttributes(stmt);
        if (this.name !== COMPONENT_FOR_EACH && this.name !== COMPONENT_LAZY_FOR_EACH) {
            this.parseStateValues(tree, stmt);
        }
    }

    private parseAttributes(stmt: Stmt): void {
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

    private getBindValues(local: Local, relationValues: (Constant | ArkInstanceFieldRef | MethodSignature)[], visitor: Set<Local> = new Set()): void {
        if (visitor.has(local)) {
            return;
        }
        visitor.add(local);
        const stmt = local.getDeclaringStmt();
        if (!stmt) {
            let type = local.getType();
            if (type instanceof FunctionType) {
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

    public parseStateValues(tree: ViewTreeImpl, stmt: Stmt): void {
        let stateValues: Set<ArkField> = StateValuesUtils.getInstance(tree.getDeclaringArkClass()).parseStmtUsesStateValues(stmt);
        stateValues.forEach(field => {
            this.stateValues.add(field);
            tree.addStateValue(field, this);
        }, this);
    }
}

class TreeNodeStack {
    protected root: ViewTreeNodeImpl | null = null;
    protected stack: ViewTreeNodeImpl[];

    constructor() {
        this.root = ViewTreeNodeImpl.createRootNode();
        this.stack = [this.root];
    }

    /**
     * @internal
     */
    public push(node: ViewTreeNodeImpl): void {
        let parent = this.getParent();
        node.parent = parent;
        this.stack.push(node);
        if (parent === null || parent === undefined) {
            this.root = node;
        } else {
            parent.children.push(node);
        }
    }

    /**
     * @internal
     */
    public pop(): void {
        this.stack.pop();
    }

    /**
     * @internal
     */
    public top(): ViewTreeNodeImpl | null {
        return this.isEmpty() ? null : this.stack[this.stack.length - 1];
    }

    /**
     * @internal
     */
    public isEmpty(): boolean {
        return this.stack.length === 0;
    }

    /**
     * @internal
     */
    public popAutomicComponent(name: string): void {
        if (this.isEmpty()) {
            return;
        }

        let node = this.stack[this.stack.length - 1];
        if (name !== node.name && !this.isContainer(node.name)) {
            this.stack.pop();
        }
    }

    /**
     * @internal
     */
    public popComponentExpect(name: string): TreeNodeStack {
        for (let i = this.stack.length - 1; i >= 0; i--) {
            if (this.stack[i].name !== name) {
                this.stack.pop();
            } else {
                break;
            }
        }
        return this;
    }

    private getParent(): ViewTreeNodeImpl | null {
        if (this.stack.length === 0) {
            return null;
        }

        let node = this.stack[this.stack.length - 1];
        if (!this.isContainer(node.name)) {
            this.stack.pop();
        }
        return this.stack[this.stack.length - 1];
    }

    protected isContainer(name: string): boolean {
        return isEtsContainerComponent(name) || SPECIAL_CONTAINER_COMPONENT.has(name) || name === BUILDER_DECORATOR || name == COMPONENT_ROOT;
    }
    public getNodeByNameFromStack(name: string): ViewTreeNodeImpl | undefined {
        for (let i = this.stack.length - 1; i >= 0; i--) {
            const node = this.stack[i];
            if (node.name === name) {
                return node;
            }
        }
        return undefined;
    }
}

export class ViewTreeImpl extends TreeNodeStack implements ViewTree {
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
     * ViewTree root node.
     * @returns root node
     */
    public getRoot(): ViewTreeNode | null {
        this.buildViewTree();
        return this.root;
    }

    /**
     * Map of the component controlled by the state variable
     * @returns
     */
    public getStateValues(): Map<ArkField, Set<ViewTreeNode>> {
        this.buildViewTree();
        return this.stateValues;
    }

    /**
     * @deprecated Use {@link getStateValues} instead.
     */
    public isClassField(name: string): boolean {
        return this.fieldTypes.has(name);
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
    private buildViewTree(): void {
        if (!this.render || this.isInitialized()) {
            return;
        }
        this.buildViewStatus = true;
        this.loadClasssFieldTypes();

        if (this.render.hasBuilderDecorator()) {
            let node = ViewTreeNodeImpl.createBuilderNode();
            node.signature = this.render.getSignature();
            node.classSignature = node.signature;
            this.push(node);
        }

        if (this.render.getCfg()) {
            this.buildViewTreeFromCfg(this.render.getCfg() as Cfg);
        }
        this.analyzeDialog(this.render.getDeclaringArkFile().getScene());
    }

    /**
     * @internal
     */
    private isInitialized(): boolean {
        return this.buildViewStatus;
    }

    /**
     * @internal
     */
    public addStateValue(field: ArkField, node: ViewTreeNode): void {
        if (!this.stateValues.has(field)) {
            this.stateValues.set(field, new Set());
        }
        let sets = this.stateValues.get(field);
        sets?.add(node);
    }

    /**
     * @internal
     */
    private isCreateFunc(name: string): boolean {
        return COMPONENT_CREATE_FUNCTIONS.has(name);
    }

    private loadClasssFieldTypes(): void {
        for (const field of this.render.getDeclaringArkClass().getFields()) {
            let decorators = field.getStateDecorators();
            if (decorators.length > 0) {
                if (decorators.length === 1) {
                    this.fieldTypes.set(field.getName(), decorators[0]);
                } else {
                    this.fieldTypes.set(field.getName(), decorators[0]);
                }
            } else {
                this.fieldTypes.set(field.getName(), field.getSignature().getType());
            }
        }
    }

    /**
     * @internal
     */
    public getDeclaringArkClass(): ArkClass {
        return this.render.getDeclaringArkClass();
    }

    /**
     * @internal
     */
    private findMethod(methodSignature: MethodSignature): ArkMethod | null {
        let method = this.render.getDeclaringArkFile().getScene().getMethod(methodSignature);
        if (method) {
            return method;
        }

        // class
        method = this.getDeclaringArkClass().getMethod(methodSignature);
        if (method) {
            return method;
        }

        return this.findMethodWithName(methodSignature.getMethodSubSignature().getMethodName());
    }

    /**
     * @internal
     */
    private findMethodWithName(name: string): ArkMethod | null {
        let method = this.getDeclaringArkClass().getMethodWithName(name);
        if (method) {
            return method;
        }

        // namespace
        this.getDeclaringArkClass()
            .getDeclaringArkNamespace()
            ?.getAllMethodsUnderThisNamespace()
            .forEach(value => {
                if (value.getName() === name) {
                    method = value;
                }
            });
        if (method) {
            return method;
        }

        this.getDeclaringArkClass()
            .getDeclaringArkFile()
            .getAllNamespacesUnderThisFile()
            .forEach(namespace => {
                namespace.getAllMethodsUnderThisNamespace().forEach(value => {
                    if (value.getName() === name) {
                        method = value;
                    }
                });
            });
        return method;
    }

    /**
     * @internal
     */
    private findClass(classSignature: ClassSignature): ArkClass | null {
        return ModelUtils.getClass(this.render, classSignature);
    }

    private findBuilderMethod(value: Value): ArkMethod | undefined | null {
        let method: ArkMethod | undefined | null;
        if (value instanceof ArkInstanceFieldRef) {
            method = this.findMethodWithName(value.getFieldName());
        } else if (value instanceof ArkStaticInvokeExpr) {
            method = this.findMethod(value.getMethodSignature());
        } else if (value instanceof Local && value.getType() instanceof FunctionType) {
            method = this.findMethod((value.getType() as FunctionType).getMethodSignature());
        } else if (value instanceof Local) {
            method = this.findMethodWithName(value.getName());
        }
        if (method && !method.hasBuilderDecorator()) {
            method = this.findMethodInvokeBuilderMethod(method);
        }

        return method;
    }

    /**
     * Adds a builder node to the view tree.
     * 
     * This method processes the builder node associated with the given `ArkMethod` and integrates it into the view tree.
     * If the builder node cannot be created (e.g., the view tree is null or has no root), an empty builder node is created instead.
     * 
     * @param method - The `ArkMethod` representing the builder method to process.
     * @param shouldPush - A boolean flag indicating whether the node should be pushed to the stack. 
     *                     If `true`, the node is pushed and popped from the stack; otherwise, it is only returned.
     * @returns The processed `ViewTreeNodeImpl` representing the builder node.
     * 
     * Behavior:
     * - If the builder view tree is invalid, an empty builder node is created and optionally pushed/popped.
     * - If the builder view tree is valid, its root node is processed and optionally pushed/popped.
     * - State values from the builder view tree are added to the current view tree if the declaring class matches.
     * 
     * Special Case:
     * - Not all builder nodes are part of a parent-child relationship in the view tree. For example:
     *   - In cases like `bindContentCover`.
     */
    private addBuilderNode(method: ArkMethod, shouldPush: boolean): ViewTreeNodeImpl {
        let builderViewTree = method.getViewTree();
        if (!builderViewTree || !builderViewTree.getRoot()) {
            logger.error(`ViewTree->addBuilderNode ${method.getSignature().toString()} build viewtree fail.`);
            // add empty node
            let node = ViewTreeNodeImpl.createBuilderNode();
            node.signature = method.getSignature();
            node.classSignature = node.signature;
            if (shouldPush) {
                this.push(node);
                this.pop();
            }
            return node;
        }

        let root = builderViewTree.getRoot() as ViewTreeNodeImpl;
        if (shouldPush) {
            this.push(root);
        }
        if (method.getDeclaringArkClass() === this.render.getDeclaringArkClass()) {
            for (const [field, nodes] of builderViewTree.getStateValues()) {
                for (const node of nodes) {
                    this.addStateValue(field, node);
                }
            }
        }
        if (shouldPush) {
            this.pop();
        }
        return root;
    }

    /**
     * @internal
     */
    private addCustomComponentNode(cls: ArkClass, arg: Value | undefined, builder: ArkMethod | undefined,shouldPush:boolean = true): ViewTreeNodeImpl {
        let node = ViewTreeNodeImpl.createCustomComponent();
        node.signature = cls.getSignature();
        node.classSignature = node.signature;
        node.stateValuesTransfer = this.parseObjectLiteralExpr(cls, arg, builder);
        if (arg instanceof Local && arg.getType()) {
            let stateValues = StateValuesUtils.getInstance(this.getDeclaringArkClass()).parseObjectUsedStateValues(arg.getType());
            stateValues.forEach(field => {
                node.stateValues.add(field);
                this.addStateValue(field, node);
            });
        }
        if(shouldPush == true){
            this.push(node);
        }
        let componentViewTree = cls.getViewTree();
        if (!componentViewTree || !componentViewTree.getRoot()) {
            logger.error(`ViewTree->addCustomComponentNode ${cls.getSignature().toString()} build viewtree fail.`);
            return node;
        }
        let root = componentViewTree.getRoot() as ViewTreeNodeImpl;
        if (root.hasBuilderParam()) {
            root = this.cloneBuilderParamNode(node, root);
        }
        node.children.push(root);

        return node;
    }

    private cloneBuilderParamNode(node: ViewTreeNodeImpl, root: ViewTreeNodeImpl): ViewTreeNodeImpl {
        root = root.clone(node);
        if (node.stateValuesTransfer) {
            root.walk(item => {
                let child = item as ViewTreeNodeImpl;
                if (!child.isBuilderParam() || !child.builderParam) {
                    return false;
                }
                let method = node.stateValuesTransfer?.get(child.builderParam) as ArkMethod;
                if (method) {
                    child.changeBuilderParam2BuilderNode(method);
                }

                return false;
            });
        }
        return root;
    }

    /**
     * @internal
     */
    private addBuilderParamNode(field: ArkField): ViewTreeNodeImpl {
        let node = ViewTreeNodeImpl.createBuilderParamNode();
        node.builderParam = field;
        this.push(node);
        this.pop();

        return node;
    }

    /**
     * @internal
     */
    private addSystemComponentNode(name: string): ViewTreeNodeImpl {
        let node = new ViewTreeNodeImpl(name);
        this.push(node);

        return node;
    }

    private findMethodInvokeBuilderMethod(method: ArkMethod): ArkMethod | undefined {
        let stmts = method.getCfg()?.getStmts();
        if (!stmts) {
            return undefined;
        }
        for (const stmt of stmts) {
            let expr: AbstractInvokeExpr | undefined;

            if (stmt instanceof ArkInvokeStmt) {
                expr = stmt.getInvokeExpr();
            } else if (stmt instanceof ArkAssignStmt) {
                let rightOp = stmt.getRightOp();
                if (rightOp instanceof ArkInstanceInvokeExpr || rightOp instanceof ArkStaticInvokeExpr) {
                    expr = rightOp;
                }
            }

            if (expr === undefined) {
                continue;
            }

            let method = this.findMethod(expr.getMethodSignature());
            if (method?.hasBuilderDecorator()) {
                return method;
            }
        }
        return undefined;
    }

    private parseFieldInObjectLiteral(field: ArkField, cls: ArkClass, transferMap: Map<ArkField, ArkField | ArkMethod>): void {
        let dstField = cls.getFieldWithName(field.getName());
        if (dstField?.getStateDecorators().length === 0 && !dstField?.hasBuilderParamDecorator()) {
            return;
        }

        let stmts = field.getInitializer();
        if (stmts.length === 0) {
            return;
        }

        let assignStmt = stmts[stmts.length - 1];
        if (!(assignStmt instanceof ArkAssignStmt)) {
            return;
        }

        let value = assignStmt.getRightOp();
        if (value instanceof Local) {
            value = backtraceLocalInitValue(value);
        }
        if (dstField?.hasBuilderParamDecorator()) {
            let method = this.findBuilderMethod(value);
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
    }

    private parseObjectLiteralExpr(cls: ArkClass, object: Value | undefined, builder: ArkMethod | undefined): Map<ArkField, ArkField | ArkMethod> | undefined {
        let transferMap: Map<ArkField, ArkField | ArkMethod> = new Map();
        if (object instanceof Local && object.getType() instanceof ClassType) {
            let anonymousSig = (object.getType() as ClassType).getClassSignature();
            let anonymous = this.findClass(anonymousSig);
            anonymous?.getFields().forEach(field => {
                this.parseFieldInObjectLiteral(field, cls, transferMap);
            });
        }
        // If the builder exists, there will be a unique BuilderParam
        if (builder) {
            cls.getFields().forEach(value => {
                if (value.hasBuilderParamDecorator()) {
                    transferMap.set(value, builder);
                }
            });
        }

        if (transferMap.size === 0) {
            return undefined;
        }
        return transferMap;
    }

    private viewComponentCreationParser(name: string, stmt: Stmt, expr: AbstractInvokeExpr,shouldPush:boolean = true): ViewTreeNodeImpl | undefined {
        let temp = expr.getArg(0) as Local;
        let arg: Value | undefined;
        temp.getUsedStmts().forEach(value => {
            if (value instanceof ArkAssignStmt && value.getRightOp() instanceof ArkInstanceInvokeExpr) {
                const rightOp: ArkInstanceInvokeExpr = value.getRightOp() as ArkInstanceInvokeExpr;
                const methodName = rightOp.getMethodSignature().getMethodSubSignature().getMethodName();
                if (methodName === 'constructor') {
                    arg = rightOp.getArg(0);
                }
            }
        });

        let builderMethod: ArkMethod | undefined;
        let builder = expr.getArg(1) as Local;
        if (builder) {
            let method = this.findMethod((builder.getType() as FunctionType).getMethodSignature());
            if (!method?.hasBuilderDecorator()) {
                method?.addDecorator(new Decorator(BUILDER_DECORATOR));
            }
            if (!method?.hasViewTree()) {
                method?.setViewTree(new ViewTreeImpl(method));
            }
            if (method) {
                builderMethod = method;
            }
        }

        let initValue = backtraceLocalInitValue(temp);
        if (!(initValue instanceof ArkNewExpr)) {
            return undefined;
        }
        const initValueType = initValue.getType();
        if (!(initValueType instanceof ClassType)) {
            return undefined;
        }

        let clsSignature = initValueType.getClassSignature();
        if (clsSignature) {
            let cls = this.findClass(clsSignature);
            if (cls && cls.hasComponentDecorator()) {
                return this.addCustomComponentNode(cls, arg, builderMethod,shouldPush);
            } else {
                logger.error(`ViewTree->viewComponentCreationParser not found class ${clsSignature.toString()}. ${stmt.toString()}`);
            }
        }
        return undefined;
    }

    private waterFlowCreationParser(name: string, stmt: Stmt, expr: AbstractInvokeExpr): ViewTreeNodeImpl {
        let node = this.addSystemComponentNode(name);
        let object = expr.getArg(0);
        if (object instanceof Local && object.getType() instanceof ClassType) {
            let anonymousSig = (object.getType() as ClassType).getClassSignature();
            let anonymous = this.findClass(anonymousSig);
            let footer = anonymous?.getFieldWithName('footer');
            if (!footer) {
                return node;
            }
            let stmts = footer.getInitializer();
            let assignStmt = stmts[stmts.length - 1];
            if (!(assignStmt instanceof ArkAssignStmt)) {
                return node;
            }

            let value = assignStmt.getRightOp();
            let method = this.findBuilderMethod(value);
            if (method?.hasBuilderDecorator()) {
                return this.addBuilderNode(method, true);
            }
        }

        return node;
    }

    private forEachCreationParser(name: string, stmt: Stmt, expr: AbstractInvokeExpr): ViewTreeNodeImpl {
        let node = this.addSystemComponentNode(name);
        let values = expr.getArg(0) as Local;
        let declaringStmt = values?.getDeclaringStmt();
        if (declaringStmt) {
            let stateValues = StateValuesUtils.getInstance(this.getDeclaringArkClass()).parseStmtUsesStateValues(declaringStmt);
            stateValues.forEach(field => {
                node.stateValues.add(field);
                this.addStateValue(field, node);
            });
        }

        let type = (expr.getArg(1) as Local).getType() as FunctionType;
        let method = this.findMethod(type.getMethodSignature());
        if (method && method.getCfg()) {
            this.buildViewTreeFromCfg(method.getCfg() as Cfg);
        }
        return node;
    }

    private repeatCreationParser(name: string, stmt: Stmt, expr: AbstractInvokeExpr): ViewTreeNodeImpl {
        let node = this.addSystemComponentNode(name);
        let arg = expr.getArg(0) as Local;
        let declaringStmt = arg?.getDeclaringStmt();
        if (declaringStmt) {
            let stateValues = StateValuesUtils.getInstance(this.getDeclaringArkClass()).parseStmtUsesStateValues(declaringStmt);
            stateValues.forEach(field => {
                node.stateValues.add(field);
                this.addStateValue(field, node);
            });
        }

        return node;
    }

    private ifBranchCreationParser(name: string, stmt: Stmt, expr: AbstractInvokeExpr): ViewTreeNodeImpl {
        this.popComponentExpect(COMPONENT_IF);
        return this.addSystemComponentNode(COMPONENT_IF_BRANCH);
    }

    private COMPONENT_CREATE_PARSERS: Map<string, (name: string, stmt: Stmt, expr: AbstractInvokeExpr,shouldPush:boolean) => ViewTreeNodeImpl | undefined> = new Map([
        ['ForEach.create', this.forEachCreationParser.bind(this)],
        ['LazyForEach.create', this.forEachCreationParser.bind(this)],
        ['Repeat.create', this.repeatCreationParser.bind(this)],
        ['View.create', this.viewComponentCreationParser.bind(this)],
        ['If.branch', this.ifBranchCreationParser.bind(this)],
        ['WaterFlow.create', this.waterFlowCreationParser.bind(this)],
    ]);
    private COMPONENT_BEHAVIOR_PARSERS:
        Map<string, (local2Node: Map<Local, ViewTreeNodeImpl>, stmt: Stmt, expr: ArkInstanceInvokeExpr) => ViewTreeNodeImpl | undefined
        > = new Map([
            ['tabBar', this.tabBarComponentParser.bind(this)],
            ['navDestination', this.navDestinationComponentParser.bind(this)],
            ['bindContentCover', this.bindContentCoverComponentParser.bind(this)],
            ['bindSheet', this.bindSheetComponentParser.bind(this)],
            ['bindContextMenu', this.bindContextMenuComponentParser.bind(this)],
            ['bindMenu', this.bindMenuComponentParser.bind(this)],
            ['bindPopup', this.bindPopupComponentParser.bind(this)],
        ]);
    
    private DIALOG_SHOW_PARSERS: 
        Map<string, (local2Node: Map<Local, ViewTreeNodeImpl>, stmt: Stmt, expr: ArkInstanceInvokeExpr) => ViewTreeNodeImpl | undefined
        > = new Map([
            ['showAlertDialog', this.AlertDialogShowParser.bind(this)],
            ['showActionSheet', this.ActionSheetShowParser.bind(this)],
            ['CalendarPickerDialog', this.CalendarPickerDialogShowParser.bind(this)],
            ['showDatePickerDialog', this.DatePickerDialogShowParser.bind(this)],
            ['showTimePickerDialog', this.TimePickerDialogShowParser.bind(this)],
            ['showTextPickerDialog', this.TextPickerDialogShowParser.bind(this)],
            ['showToast', this.ToastShowParser.bind(this)],
            ['showDialog,', this.DialogShowParser.bind(this)],
            ['showActionMenu', this.ActionMenuShowParser.bind(this)],
        ]);

    private componentCreateParse(componentName: string, methodName: string, stmt: Stmt, expr: ArkStaticInvokeExpr,shouldPush:boolean = true): ViewTreeNodeImpl | undefined {
        let parserFn = this.COMPONENT_CREATE_PARSERS.get(`${componentName}.${methodName}`);
        if (parserFn) {
            let node = parserFn(componentName, stmt, expr,shouldPush);
            node?.addStmt(this, stmt);
            return node;
        }
        this.popAutomicComponent(componentName);
        let node = this.addSystemComponentNode(componentName);
        node.addStmt(this, stmt);
        return node;
    }

    private parseStaticInvokeExpr(local2Node: Map<Local, ViewTreeNode>, stmt: Stmt, expr: ArkStaticInvokeExpr,shouldPush:boolean = true): ViewTreeNodeImpl | undefined {
        let methodSignature = expr.getMethodSignature();
        let method = this.findMethod(methodSignature);
        if (method?.hasBuilderDecorator()) {
            let node = this.addBuilderNode(method, true);
            node.parseStateValues(this, stmt);
            return node;
        }

        let name = methodSignature.getDeclaringClassSignature().getClassName();
        let methodName = methodSignature.getMethodSubSignature().getMethodName();

        if (this.isCreateFunc(methodName)) {
            return this.componentCreateParse(name, methodName, stmt, expr,shouldPush);
        }

        let currentNode = this.top();
        if (name === currentNode?.name) {
            currentNode.addStmt(this, stmt);
            if (methodName === COMPONENT_POP_FUNCTION) {
                this.pop();
            }
            return currentNode;
        } else if (name === COMPONENT_IF && methodName === COMPONENT_POP_FUNCTION) {
            this.popComponentExpect(COMPONENT_IF);
            this.pop();
        }
        return undefined;
    }

    /**
     * $temp4.margin({ top: 20 });
     * @param viewTree
     * @param local2Node
     * @param expr
     */
    private parseInstanceInvokeExpr(local2Node: Map<Local, ViewTreeNodeImpl>, stmt: Stmt, expr: ArkInstanceInvokeExpr): ViewTreeNodeImpl | undefined {
        let temp = expr.getBase();
        if (local2Node.has(temp)) {
            let component = local2Node.get(temp);
            if (component?.name === COMPONENT_REPEAT && expr.getMethodSignature().getMethodSubSignature().getMethodName() === 'each') {
                let arg = expr.getArg(0);
                let type = arg.getType();
                if (type instanceof FunctionType) {
                    let method = this.findMethod(type.getMethodSignature());
                    this.buildViewTreeFromCfg(method?.getCfg() as Cfg);
                }
                this.pop();
            } else {
                component?.addStmt(this, stmt);
            }
            let methodName = expr.getMethodSignature().getMethodSubSignature().getMethodName();
            let parseFn = this.COMPONENT_BEHAVIOR_PARSERS.get(methodName);
            if (parseFn) {
                parseFn(local2Node, stmt, expr);
            }
            return component;
        }

        let name = expr.getBase().getName();
        if (name.startsWith(TEMP_LOCAL_PREFIX)) {
            let initValue = backtraceLocalInitValue(expr.getBase());
            if (initValue instanceof ArkThisRef) {
                name = 'this';
            }
        }

        let methodName = expr.getMethodSignature().getMethodSubSignature().getMethodName();
        let field = this.getDeclaringArkClass().getFieldWithName(methodName);
        if (name === 'this' && field?.hasBuilderParamDecorator()) {
            return this.addBuilderParamNode(field);
        }

        let method = this.findMethod(expr.getMethodSignature());
        if (name === 'this' && method?.hasBuilderDecorator()) {
            return this.addBuilderNode(method, true);
        }

        return undefined;
    }

    private parsePtrInvokeExpr(local2Node: Map<Local, ViewTreeNodeImpl>, stmt: Stmt, expr: ArkPtrInvokeExpr): ViewTreeNodeImpl | undefined {
        let temp = expr.getFuncPtrLocal();
        if (temp instanceof Local && local2Node.has(temp)) {
            let component = local2Node.get(temp);
            if (component?.name === COMPONENT_REPEAT && expr.getMethodSignature().getMethodSubSignature().getMethodName() === 'each') {
                let arg = expr.getArg(0);
                let type = arg.getType();
                if (type instanceof FunctionType) {
                    let method = this.findMethod(type.getMethodSignature());
                    this.buildViewTreeFromCfg(method?.getCfg() as Cfg);
                }
                this.pop();
            } else {
                component?.addStmt(this, stmt);
            }

            return component;
        } else if (temp instanceof ArkInstanceFieldRef) {
            let name = temp.getBase().getName();
            if (name.startsWith(TEMP_LOCAL_PREFIX)) {
                let initValue = backtraceLocalInitValue(temp.getBase());
                if (initValue instanceof ArkThisRef) {
                    name = 'this';
                }
            }

            let methodName = temp.getFieldName();
            let field = this.getDeclaringArkClass().getFieldWithName(methodName);
            if (name === 'this' && field?.hasBuilderParamDecorator()) {
                return this.addBuilderParamNode(field);
            }

            let method = this.findMethod(expr.getMethodSignature());
            if (name === 'this' && method?.hasBuilderDecorator()) {
                return this.addBuilderNode(method, true);
            }
        }
        return undefined;
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
    private parseAssignStmt(local2Node: Map<Local, ViewTreeNodeImpl>, stmt: ArkAssignStmt): void {
        let left = stmt.getLeftOp();
        let right = stmt.getRightOp();

        if (!(left instanceof Local)) {
            return;
        }

        let component: ViewTreeNodeImpl | undefined;
        if (right instanceof ArkStaticInvokeExpr) {
            component = this.parseStaticInvokeExpr(local2Node, stmt, right);
        } else if (right instanceof ArkInstanceInvokeExpr) {
            component = this.parseInstanceInvokeExpr(local2Node, stmt, right);
        } else if (right instanceof ArkPtrInvokeExpr) {
            component = this.parsePtrInvokeExpr(local2Node, stmt, right);
        }
        if (component) {
            local2Node.set(left, component);
        }
    }

    private parseInvokeStmt(local2Node: Map<Local, ViewTreeNodeImpl>, stmt: ArkInvokeStmt): void {
        let expr = stmt.getInvokeExpr();
        if (expr instanceof ArkStaticInvokeExpr) {
            this.parseStaticInvokeExpr(local2Node, stmt, expr);
        } else if (expr instanceof ArkInstanceInvokeExpr) {
            this.parseInstanceInvokeExpr(local2Node, stmt, expr);
        } else if (expr instanceof ArkPtrInvokeExpr) {
            this.parsePtrInvokeExpr(local2Node, stmt, expr);
        }
    }

    private buildViewTreeFromCfg(cfg: Cfg, local2Node: Map<Local, ViewTreeNodeImpl> = new Map()): void {
        if (!cfg) {
            return;
        }
        let blocks = cfg.getBlocks();
        for (const block of blocks) {
            for (const stmt of block.getStmts()) {
                if (!(stmt instanceof ArkInvokeStmt || stmt instanceof ArkAssignStmt)) {
                    continue;
                }

                if (stmt instanceof ArkAssignStmt) {
                    this.parseAssignStmt(local2Node, stmt);
                } else if (stmt instanceof ArkInvokeStmt) {
                    this.parseInvokeStmt(local2Node, stmt);
                }
            }
        }
    }

    private tabBarComponentParser(local2Node: Map<Local, ViewTreeNodeImpl>, stmt: Stmt, expr: ArkInstanceInvokeExpr): ViewTreeNodeImpl | undefined {
        const args = expr.getArgs();
        for (const arg of args) {
            const local = arg as Local;
            if (local2Node.has(local)) {
                const node = local2Node.get(local);
                let tabs_node = this.getNodeByNameFromStack('Tabs');
                let tabBarNode;
                if (tabs_node && node) {
                    // 创建虚拟父节点 TabBar
                    tabBarNode = ViewTreeNodeImpl.createTabBarNode();
                    tabBarNode.children.push(node);
                    node.parent = tabBarNode;
                    // 挂到 Tabs 节点下
                    tabs_node.children.push(tabBarNode);
                    tabBarNode.parent = tabs_node;
                }
            }
        }
        return undefined;
    }

    private navDestinationComponentParser(local2Node: Map<Local, ViewTreeNodeImpl>, stmt: Stmt, expr: ArkInstanceInvokeExpr): ViewTreeNodeImpl | undefined {
        const args = expr.getArgs();
        for (const arg of args) {
            const local = arg as Local;
            const type = arg.getType();

            // 如果 local 不存在于 local2Node，直接跳过
            if (!local2Node.has(local)) {
                if (!(type instanceof FunctionType)) {
                    continue;
                }

                const method = this.findMethod(type.getMethodSignature());
                if (!method || !method.hasBuilderDecorator()) {
                    continue;
                }

                const builderNode = this.addBuilderNode(method, false);
                local2Node.set(arg as Local, builderNode);

                const base = expr.getBase();
                if (!(base instanceof Local) || !local2Node.has(base)) {
                    continue;
                }

                const navNode = local2Node.get(base);
                if (!navNode) {
                    continue;
                }

                const pageMapNode = ViewTreeNodeImpl.createPageMapNode();
                pageMapNode.children.push(builderNode);
                builderNode.parent = pageMapNode;
                navNode.children.push(pageMapNode);
                pageMapNode.parent = navNode;
                continue;
            }

            // 如果 local 存在于 local2Node
            const node = local2Node.get(local);
            const navigationNode = this.getNodeByNameFromStack('Navigation');
            if (!navigationNode || !node) {
                continue;
            }

            const pageMapNode = ViewTreeNodeImpl.createPageMapNode();
            pageMapNode.children.push(node);
            node.parent = pageMapNode;
            navigationNode.children.push(pageMapNode);
            pageMapNode.parent = navigationNode;
        }
        return undefined;
    }

    private bindContentCoverComponentParser(local2Node: Map<Local, ViewTreeNodeImpl>, stmt: Stmt, expr: ArkInstanceInvokeExpr): ViewTreeNodeImpl | undefined {
        const args = expr.getArgs();
        for (const arg of args) {
            const local = arg as Local;
            if (local2Node.has(local)) {
                const node = local2Node.get(local);
                let root = this.root;
                if (root && node) {
                    // 创建虚拟父节点 BindContent
                    const bindContentNode = ViewTreeNodeImpl.createBindContentNode();
                    bindContentNode.children.push(node);
                    node.parent = bindContentNode;
                    // 收集到全局 WindowViewTree
                    this.addToWindowViewTree(bindContentNode);
                }
            }
        }
        return undefined;
    }

    private bindSheetComponentParser(local2Node: Map<Local, ViewTreeNodeImpl>, stmt: Stmt, expr: ArkInstanceInvokeExpr): ViewTreeNodeImpl | undefined {
        const args = expr.getArgs();
        for (const arg of args) {
            const local = arg as Local;
            if (local2Node.has(local)) {
                const node = local2Node.get(local);
                let root = this.root;
                if (root && node) {
                    // 创建父节点 bindsheet
                    const bindSheetNode = ViewTreeNodeImpl.createBindSheetNode();
                    bindSheetNode.children.push(node);
                    node.parent = bindSheetNode;
                    // 收集到全局 WindowViewTree
                    this.addToWindowViewTree(bindSheetNode);
                }
            }
        }
        return undefined;
    }

    private bindContextMenuComponentParser(local2Node: Map<Local, ViewTreeNodeImpl>, stmt: Stmt, expr: ArkInstanceInvokeExpr): ViewTreeNodeImpl | undefined {
        const args = expr.getArgs();
        for (const arg of args) {
            const type = arg.getType();
            const local = arg as Local;
            if (local2Node.has(local)) {
                const node = local2Node.get(local);
                let root = this.root;
                if (root && node) {
                    // 创建虚拟父节点 TabBar
                    const bindMenuNode = ViewTreeNodeImpl.createMenuNode();
                    bindMenuNode.children.push(node);
                    node.parent = bindMenuNode;
                    // 收集到全局 WindowViewTree
                    this.addToWindowViewTree(bindMenuNode);
                }

            } else if (type instanceof FunctionType) {
                const method = this.findMethod(type.getMethodSignature());
                if (method && method.hasBuilderDecorator()) {
                    const builder_node = this.addBuilderNode(method, false);
                    local2Node.set(arg as Local, builder_node);
                    const MenuWrapperNode = ViewTreeNodeImpl.createMenuNode();
                    MenuWrapperNode.children.push(builder_node);
                    builder_node.parent = MenuWrapperNode;
                    // 收集到全局 WindowViewTree
                    this.addToWindowViewTree(MenuWrapperNode);
                }
            }
        }
        return undefined;
    }

    // bindMenu(isShow: boolean, content: Array<MenuElement> | CustomBuilder, options?: MenuOptions): T
    private bindMenuComponentParser(local2Node: Map<Local, ViewTreeNodeImpl>, stmt: Stmt, expr: ArkInstanceInvokeExpr): ViewTreeNodeImpl | undefined {
        const args = expr.getArgs();
        for (const arg of args) {
            const type = arg.getType();
            const local = arg as Local;
            // 1. 如果参数是数组类型（常见于 bindMenu 场景）
            if (type instanceof ArrayType) {
                const menuNode = ViewTreeNodeImpl.createMenuNode();
                const menuItems = this.handleBindMenuArray(local2Node, arg);
                for (const item of menuItems) {
                    menuNode.children.push(item);
                    item.parent = menuNode;
                }

                this.addToWindowViewTree(menuNode);
            }
            // 2. 如果 local2Node 里有节点，直接挂到 Menu
            else if (local2Node.has(local)) {
                const node = local2Node.get(local);
                if (node) {
                    const menuNode = ViewTreeNodeImpl.createMenuNode();
                    menuNode.children.push(node);
                    node.parent = menuNode;

                    this.addToWindowViewTree(menuNode);
                }
            }
            // 3. 如果参数是 FunctionType，递归分析
            else if (type instanceof FunctionType) {
                const method = this.findMethod(type.getMethodSignature());
                if (method && method.hasBuilderDecorator()) {
                    const menuNode = ViewTreeNodeImpl.createMenuWrapperNode();
                    this.stack.push(menuNode);
                    const builderNode = this.addBuilderNode(method, false);
                    this.pop();
                    local2Node.set(arg as Local, builderNode);
                    menuNode.children.push(builderNode);
                    builderNode.parent = menuNode;

                    this.addToWindowViewTree(menuNode);
                }
            }
        }
        return undefined;
    }

    private handleBindMenuArray(local2Node: Map<Local, ViewTreeNodeImpl>, arg: Value): ViewTreeNodeImpl[] {
        // console.log("执行handleBindMenuArray");
        const result: ViewTreeNodeImpl[] = [];
        const local = arg as Local;
        const stmt = local.getDeclaringStmt();
        if (!(stmt instanceof ArkAssignStmt)) return result;

        const right = stmt.getRightOp();
        if (!(right instanceof ArkInstanceFieldRef)) return result;

        const fieldSig = right.getFieldSignature();
        const scene = this.render.getDeclaringArkFile().getScene();
        const clazz = this.findClass((fieldSig.getDeclaringSignature() as ClassSignature));
        const field = clazz?.getField(fieldSig);
        const inits = field?.getInitializer();

        if (!inits) return result;

        for (const initStmt of inits) {
            if (initStmt instanceof ArkAssignStmt && initStmt.getRightOp() instanceof ArkNewExpr) {
                ///console.log("满足： stmt: ", initStmt.toString());
                const initValue = backtraceLocalInitValue(initStmt.getLeftOp() as Local);
                if (initValue instanceof ArkNewExpr) {
                    const cls = ModelUtils.getArkClassInBuild(scene, initValue.getClassType());
                    const map = parseObjectLiteral(cls, scene);
                    const node = this.buildNodeFromMenuLiteral(local2Node, map, initStmt);
                    if (node) result.push(node);
                }
            }
        }
        return result;
    }


    private buildNodeFromMenuLiteral(local2Node: Map<Local, ViewTreeNodeImpl>, map: ObjectLiteralMap, stmt: Stmt): ViewTreeNodeImpl | null {
        let textNode: ViewTreeNodeImpl | null = null;
        let action: Value | null = null;
        for (const [field, value] of map) {
            if (field.getName() === 'value' || field.getName() == 'title') {
                textNode = new ViewTreeNodeImpl('Text');
                textNode.text_content = (value as StringConstant).getValue();
            } else if (field.getName() === 'action' && !(value instanceof Map)) {
                action = value;
            }
        }
        if (action instanceof Local) {
            const type = action.getType();
            if (type instanceof FunctionType) {
                const method = this.findMethod(type.getMethodSignature());
                if (method && textNode) {
                    local2Node.set(action, textNode);
                }
            }
        }
        if (textNode && stmt) {
            textNode.addStmt(this, stmt);
        }
        return textNode;
    }

    public addToWindowViewTree(node: ViewTreeNodeImpl): void {
        const windowViewTree = new ViewTreeImpl(this.render);
        windowViewTree.root?.children.push(node);
        windowViewTree.buildViewStatus = true;
        this.render.getDeclaringArkFile().getScene().addWindowViewTree(windowViewTree);
    }

    private bindPopupComponentParser(
        local2Node: Map<Local, ViewTreeNodeImpl>,
        stmt: Stmt,
        expr: ArkInstanceInvokeExpr
    ): ViewTreeNodeImpl | undefined {
        const args = expr.getArgs();
        for (const arg of args) {
            const type = arg.getType();
            const local = arg as Local;
            // 1. 如果 local2Node 里有节点，直接挂到 Popup
            if (local2Node.has(local)) {
                const node = local2Node.get(local);
                if (node) {
                    const popupNode = ViewTreeNodeImpl.createPopupNode();
                    popupNode.children.push(node);
                    node.parent = popupNode;

                    this.addToWindowViewTree(popupNode);
                }
            }
            // 2. 如果参数是 ClassType，调用 handleBindPopupClass
            else if (type instanceof ClassType) {
                const popupNode = ViewTreeNodeImpl.createPopupNode(); // 或 createPopupNode()
                const popupItems = this.handleBindPopupClass(local2Node, arg);
                for (const item of popupItems) {
                    popupNode.children.push(item);
                    item.parent = popupNode;
                }

                this.addToWindowViewTree(popupNode);
            }
            // 3. 如果参数是 FunctionType，递归分析
            else if (type instanceof FunctionType) {
                const method = this.findMethod(type.getMethodSignature());
                if (method && method.hasBuilderDecorator()) {
                    const builderNode = this.addBuilderNode(method,false);
                    local2Node.set(arg as Local, builderNode);
                    const popupNode = ViewTreeNodeImpl.createPopupNode(); // 或 createPopupNode()
                    popupNode.children.push(builderNode);
                    builderNode.parent = popupNode;

                    this.addToWindowViewTree(popupNode);
                }
            }
        }
        return undefined;
    }

    private handleBindPopupClass(local2Node: Map<Local, ViewTreeNodeImpl>, arg: Value): ViewTreeNodeImpl[] {
        
        const result: ViewTreeNodeImpl[] = [];
        const calssSig = (arg.getType() as ClassType).getClassSignature();
        const clazz = this.findClass(calssSig);
        if (!clazz) return [];

        const scene = this.render.getDeclaringArkFile().getScene();
        const builder = clazz.getFieldWithName("builder");
        const primary = clazz.getFieldWithName("primaryButton");
        const secondary = clazz.getFieldWithName("secondaryButton");

        // @note(jxianxiao):一定同时存在么？
        //if (!primary || !secondary) return result;
        if (builder) {
            const builder_node = this.parseObjectFromArkField(builder, scene, "bindPopup");
            if (builder_node) {
                local2Node.set(arg as Local, builder_node);
                result.push(builder_node);
            }
        }
        if (primary) {
            const node = this.parseObjectFromArkField(primary, scene, "bindPopup");
            if (node) {
                local2Node.set(arg as Local, node);
                result.push(node);
            } // @note(jxianxiao):这里可能会有问题，对应的arg是同一个，插入2个会导致覆盖
        }
        if (secondary) {
            const secNode = this.parseObjectFromArkField(secondary, scene, "bindPopup");
            if (secNode) {
                local2Node.set(arg as Local, secNode); // @note(jxianxiao):这里可能会有问题，对应的arg是同一个，插入2个会导致覆盖
                result.push(secNode);
            }
        }

        return result;
    }

    private parseObjectFromArkField(field: ArkField, scene: Scene, api_name: string): ViewTreeNodeImpl | null | undefined {
        //console.log("field: ",field);
        const initStmts = field.getInitializer();
        const newLocals: Local[] = [];

        // 提取所有 ArkNewExpr 左值
        for (const stmt of initStmts) {

            if (stmt instanceof ArkAssignStmt) {
                let rightOp = stmt.getRightOp();
                let leftOp = stmt.getLeftOp();
                if (rightOp instanceof ArkNewExpr) {
                    newLocals.push(stmt.getLeftOp() as Local);
                } else if (rightOp instanceof ArkInstanceFieldRef) {
                    if (field.getType() instanceof FunctionType) {
                        const methodSignature = (field.getType() as FunctionType).getMethodSignature();
                        const method = scene.getMethod(methodSignature);
                        if (method?.hasBuilderDecorator()) {
                            const builder_node = this.addBuilderNode(method,false);
                            return builder_node;
                        }
                    }
                } else if (rightOp instanceof Local && rightOp.getType() instanceof FunctionType && leftOp instanceof ArkInstanceFieldRef && leftOp.getFieldName() == "builder") {
                    const methodSignature = (rightOp.getType() as FunctionType).getMethodSignature();
                    const method = scene.getMethod(methodSignature);
                    const builder_method = method ? this.findBuilderMethodDeep(method) : undefined;
                    if (builder_method) {
                        const builder_node = this.addBuilderNode(builder_method,false);
                        return builder_node;
                    }
                }
                else {
                    // console.log("type : ", rightOp);
                }
            }
        }
        for (const local of newLocals) {
            const initValue = backtraceLocalInitValue(local);
            //console.log("initValue: ", initValue);
            if (initValue instanceof ArkNewExpr) {
                const arkClass = ModelUtils.getArkClassInBuild(scene, initValue.getClassType());
                const fieldValueMap = parseObjectLiteral(arkClass, scene); // Map<ArkField, Value | ObjectLiteralMap>

                //console.log("fieldValueMap: ", fieldValueMap);
                let node;
                let action;
                for (let pair of fieldValueMap) {
                    let field_name = pair[0].getName();
                    let value = pair[1];

                    if (field_name == 'value') {
                        // @todo(jxianxiao):根据 action 回调函数 来实现与 node 的绑定（UI迁移行为）
                        // if(api_name == "bindPopup"){
                        //     node = new ViewTreeNodeImpl("Button");   
                        // }else{
                        //     node = new ViewTreeNodeImpl("Text"); 
                        // }
                        node = new ViewTreeNodeImpl('Text');
                        if (value instanceof StringConstant) {
                            node.text_content = (value as StringConstant).getValue();
                        }
                    } else if (field_name == 'action') {
                        action = value
                    } else if (field_name == 'builder') {
                        // console.log("value: ", value);
                        if (value instanceof Local) {
                            const type = value.getType();

                            if (type instanceof FunctionType) {
                                const method = this.findMethod(type.getMethodSignature());
                                if (method && method.hasBuilderDecorator()) {
                                    // 分析 builder 方法，生成 Dialog 内容树
                                    const builderNode = this.addBuilderNode(method,false);
                                    // ...将 builderNode 挂到 Dialog 节点下...

                                    this.addToWindowViewTree(builderNode);
                                }
                            } else if (type instanceof ClassType) {
                                // 递归分析自定义组件
                                // ...
                            }
                        } else if (value instanceof ArkStaticInvokeExpr) {
                            const fakeStmt = new ArkInvokeStmt(value); // 或者用你已有的 stmt
                            const view_node = this.parseStaticInvokeExpr(new Map(), fakeStmt, value,false);
                            //console.log("view_node: ", view_node);
                            if (view_node) {
                                this.addToWindowViewTree(view_node);
                            }
                            const agrs = value.getArgs();
                            for (const arg of agrs) {
                                const type = arg.getType();
                                if (type instanceof ClassType) {
                                    // 递归分析自定义组件
                                    // ...
                                    this.handleDialogClass(new Map(), arg, type, fakeStmt, value.getMethodSignature().getMethodSubSignature().getMethodName());
                                }
                            }
                        }
                    }
                }
                if (!action) {
                    continue;
                }
                let type = (action as Local).getType();
                if (type instanceof FunctionType) {
                    const method_signature = type.getMethodSignature();
                    let method = scene.getMethod(method_signature);
                    if (method && method.getCfg()) {
                        // @todo(jxianxiao):根据 action 回调函数 来实现与 node 的绑定（UI迁移行为）
                    }
                }
                return node;
            }
        }
        return null;
    }

    private findBuilderMethodDeep(method: ArkMethod): ArkMethod | undefined {
        if (method.hasBuilderDecorator()) {
            return method;
        }
        const cfg = method.getCfg();
        if (!cfg) return undefined;
        for (const stmt of cfg.getStmts()) {
            // 1. 直接 instanceinvoke 语句
            if (stmt instanceof ArkInvokeStmt) {
                const expr = stmt.getInvokeExpr();
                if (expr instanceof ArkInstanceInvokeExpr) {
                    const base = expr.getBase();
                    //const methodName = expr.getMethodSignature().getMethodSubSignature().getMethodName();
                    if (base.getName() === 'this') {
                        const subMethod = this.findMethod(expr.getMethodSignature());
                        if (subMethod && subMethod.hasBuilderDecorator()) {
                            return subMethod;
                        }
                    }
                }
            }
            // 2. 赋值语句，右侧是 instanceinvoke
            else if (stmt instanceof ArkAssignStmt) {
                const rightOp = stmt.getRightOp();
                if (rightOp instanceof ArkInstanceInvokeExpr) {
                    const base = rightOp.getBase();
                    //const methodName = rightOp.getMethodSignature().getMethodSubSignature().getMethodName();
                    if (base.getName() === 'this') {
                        const subMethod = this.findMethod(rightOp.getMethodSignature());
                        if (subMethod && subMethod.hasBuilderDecorator()) {
                            return subMethod;
                        }
                    }
                }
            }
            // 3. 可以递归处理更深层的表达式（如右侧是 Lambda/Block/CallChain）
            // 可根据实际IR结构扩展
        }
        return undefined;
    }

    private handleDialogClass(local2Node: Map<Local, ViewTreeNodeImpl>, arg: Value, type: ClassType, stmt: Stmt, dialog_type: string): void {

        const calssSig = (arg.getType() as ClassType).getClassSignature();
        // console.log("calssSig: ", calssSig);
        const clazz = this.findClass(calssSig);
        if (!clazz) return;

        const scene = this.render.getDeclaringArkFile().getScene();
        // console.log("handleDialogClass clazz: ", clazz);
        const primary = clazz.getFieldWithName('primaryButton');
        const secondary = clazz.getFieldWithName('secondaryButton');
        const confirm = clazz.getFieldWithName('confirm');

        const buttons = clazz.getFieldWithName('buttons');

        const radioContent = clazz.getFieldWithName('radioContent');
        // @note(jxianxiao):一定同时存在么？
        //if (!primary || !secondary) return result;
        let dialog_node = ViewTreeNodeImpl.createAlertDialogNode();
        if (dialog_type == "AlertDialog") {
            dialog_node = ViewTreeNodeImpl.createAlertDialogNode();
        } else if (dialog_type == "TipsDialog") {
            dialog_node = ViewTreeNodeImpl.createTipsDialogNode();
        } else if (dialog_type == "ConfirmDialog") {
            dialog_node = ViewTreeNodeImpl.createConfirmDialogNode();
        } else if (dialog_type == "LodaingDialog") {
            dialog_node = ViewTreeNodeImpl.createLodaingDialogNode();
        } else if (dialog_type == "CustomContentDialog") {
            dialog_node = ViewTreeNodeImpl.createCustomContentDialogNode();
        } else if (dialog_type == "Toast") {
            dialog_node = ViewTreeNodeImpl.createToastNode();
        } else if (dialog_type == "Dialog") {
            dialog_node = ViewTreeNodeImpl.createDialogNode();
        } else if (dialog_type == "ActionMenu") {
            dialog_node = ViewTreeNodeImpl.createMenuNode();
        }

        if (primary) {
            const node = this.parseObjectFromArkField(primary, scene, 'AlertDialog');
            if (node) {
                local2Node.set(arg as Local, node);
                dialog_node.children.push(node);
                node.parent = dialog_node;
            } // @note(jxianxiao):这里可能会有问题，对应的arg是同一个，插入2个会导致覆盖
        }

        if (secondary) {
            const secNode = this.parseObjectFromArkField(secondary, scene,'AlertDialog');
            if (secNode) {
                local2Node.set(arg as Local, secNode); // @note(jxianxiao):这里可能会有问题，对应的arg是同一个，插入2个会导致覆盖
                dialog_node.children.push(secNode);
                secNode.parent = dialog_node;
            }
        }
        if (confirm) {
            const confirm_node = this.parseObjectFromArkField(confirm, scene, 'AlertDialog');
            if (confirm_node) {
                local2Node.set(arg as Local, confirm_node); // @note(jxianxiao):这里可能会有问题，对应的arg是同一个，插入2个会导致覆盖
                dialog_node.children.push(confirm_node);
                confirm_node.parent = dialog_node;
            }
        }

        if (buttons) {
            const type = buttons.getType();
            if (type instanceof ArrayType) {
                const inits = buttons.getInitializer();
                for (const initStmt of inits) {
                    if (initStmt instanceof ArkAssignStmt && initStmt.getRightOp() instanceof ArkNewExpr) {
                        const initValue = backtraceLocalInitValue(initStmt.getLeftOp() as Local);
                        if (initValue instanceof ArkNewExpr) {
                            const cls = ModelUtils.getArkClassInBuild(scene, initValue.getClassType());
                            const map = parseObjectLiteral(cls, scene);
                            const node = this.buildNodeFromMenuLiteral(local2Node, map, initStmt);
                            if (node) {
                                dialog_node.children.push(node);
                                node.parent = dialog_node;
                            }
                        }
                    }
                }
            }
            //parseObjectFromArkField(buttons, scene, "AlertDialog");
        }

        if (radioContent) {
            const type = radioContent.getType();
            if (type instanceof ArrayType) {
                const inits = radioContent.getInitializer();
                for (const initStmt of inits) {
                    if (initStmt instanceof ArkAssignStmt && initStmt.getRightOp() instanceof ArkNewExpr) {
                        const initValue = backtraceLocalInitValue(initStmt.getLeftOp() as Local);
                        if (initValue instanceof ArkNewExpr) {
                            const cls = ModelUtils.getArkClassInBuild(scene, initValue.getClassType());
                            const map = parseObjectLiteral(cls, scene);
                            const node = this.buildNodeFromMenuLiteral(local2Node, map, initStmt);
                            if (node) {
                                dialog_node.children.push(node);
                                node.parent = dialog_node;
                            }
                        }
                    }
                }
            }
            //parseObjectFromArkField(buttons, scene, "AlertDialog");
        }
        this.addToWindowViewTree(dialog_node);
        //return result;
    }


    private AlertDialogShowParser(local2Node: Map<Local, ViewTreeNodeImpl>, stmt: Stmt, expr: ArkInstanceInvokeExpr): ViewTreeNodeImpl | undefined {
        if (!(expr instanceof ArkInstanceInvokeExpr)) return;
        const args = expr.getArgs();
        for (const arg of args) {
            const type = arg.getType();
            if (type instanceof ClassType) {
                this.handleDialogClass(local2Node, arg, type, stmt, "AlterDialog");
            }
        }
    }
    private ToastShowParser(local2Node: Map<Local, ViewTreeNodeImpl>, stmt: Stmt, expr: ArkInstanceInvokeExpr): ViewTreeNodeImpl | undefined {
        if (!(expr instanceof ArkInstanceInvokeExpr)) return;
        const args = expr.getArgs();
        for (const arg of args) {
            const type = arg.getType();
            if (type instanceof ClassType) {
                this.handleDialogClass(local2Node, arg, type, stmt, "Toast");
            }
        }
    }
    private DialogShowParser(local2Node: Map<Local, ViewTreeNodeImpl>, stmt: Stmt, expr: ArkInstanceInvokeExpr): ViewTreeNodeImpl | undefined {
        if (!(expr instanceof ArkInstanceInvokeExpr)) return;
        const args = expr.getArgs();
        for (const arg of args) {
            const type = arg.getType();
            if (type instanceof ClassType) {
                this.handleDialogClass(local2Node, arg, type, stmt, "Dialog");
            }
        }
    }
    private ActionMenuShowParser(local2Node: Map<Local, ViewTreeNodeImpl>, stmt: Stmt, expr: ArkInstanceInvokeExpr): ViewTreeNodeImpl | undefined {
        if (!(expr instanceof ArkInstanceInvokeExpr)) return;
        const args = expr.getArgs();
        for (const arg of args) {
            const type = arg.getType();
            if (type instanceof ClassType) {
                this.handleDialogClass(local2Node, arg, type, stmt, "ActionMenu");
            }
        }
    }
    private ActionSheetShowParser(local2Node: Map<Local, ViewTreeNodeImpl>, stmt: Stmt, expr: ArkInstanceInvokeExpr): ViewTreeNodeImpl | undefined {
        if (!(expr instanceof ArkInstanceInvokeExpr)) return;

        const args = expr.getArgs();
        for (const arg of args) {
            const type = arg.getType();
            if (type instanceof ClassType) {
                this.handleSheetClass(local2Node, arg, type, stmt);
            }
        }
    }

    private handleSheetClass(local2Node: Map<Local, ViewTreeNodeImpl>, arg: Value, type: ClassType, stmt: Stmt): void {

        const calssSig = (arg.getType() as ClassType).getClassSignature();

        const clazz = this.findClass(calssSig);
        if (!clazz) return;

        const scene = this.render.getDeclaringArkFile().getScene();
        const primary = clazz.getFieldWithName("primaryButton");
        const secondary = clazz.getFieldWithName("secondaryButton");
        const confirm = clazz.getFieldWithName("confirm");

        const sheets = clazz.getFieldWithName("sheets");
        // @note(jxianxiao):一定同时存在么？
        //if (!primary || !secondary) return result;

        const alter_dialog_node = ViewTreeNodeImpl.createActionSheetNode();

        if (primary) {
            const node = this.parseObjectFromArkField(primary, scene, "ActionSheet");
            if (node) {
                local2Node.set(arg as Local, node);
                alter_dialog_node.children.push(node);
                node.parent = alter_dialog_node;
            } // @note(jxianxiao):这里可能会有问题，对应的arg是同一个，插入2个会导致覆盖
        }

        if (secondary) {
            const secNode = this.parseObjectFromArkField(secondary, scene, "ActionSheet");
            if (secNode) {
                local2Node.set(arg as Local, secNode); // @note(jxianxiao):这里可能会有问题，对应的arg是同一个，插入2个会导致覆盖
                alter_dialog_node.children.push(secNode);
                secNode.parent = alter_dialog_node;
            }
        }
        if (confirm) {
            const confirm_node = this.parseObjectFromArkField(confirm, scene, "ActionSheet");
            if (confirm_node) {
                local2Node.set(arg as Local, confirm_node); // @note(jxianxiao):这里可能会有问题，对应的arg是同一个，插入2个会导致覆盖
                alter_dialog_node.children.push(confirm_node);
                confirm_node.parent = alter_dialog_node;
            }
        }

        if (sheets) {
            const type = sheets.getType();
            if (type instanceof ArrayType) {
                const inits = sheets.getInitializer();
                for (const initStmt of inits) {
                    if (initStmt instanceof ArkAssignStmt && initStmt.getRightOp() instanceof ArkNewExpr) {
                        const initValue = backtraceLocalInitValue(initStmt.getLeftOp() as Local);
                        if (initValue instanceof ArkNewExpr) {
                            const cls = ModelUtils.getArkClassInBuild(scene, initValue.getClassType());
                            const map = parseObjectLiteral(cls, scene);
                            const node = this.buildNodeFromMenuLiteral(local2Node, map, initStmt);
                            if (node) {
                                alter_dialog_node.children.push(node);
                                node.parent = alter_dialog_node;
                            }
                        }
                    }
                }
            }
            //parseObjectFromArkField(buttons, scene, "AlertDialog");
        }
        this.addToWindowViewTree(alter_dialog_node);
    }

    private CalendarPickerDialogShowParser(local2Node: Map<Local, ViewTreeNodeImpl>, stmt: Stmt, expr: ArkInstanceInvokeExpr): ViewTreeNodeImpl | undefined {
        const Dialog = ViewTreeNodeImpl.createDialogNode();
        const node1 = new ViewTreeNodeImpl("Text");
        node1.text_content = "确定";

        const node2 = new ViewTreeNodeImpl("Text");
        node2.text_content = "取消";

        const Calendar_node = new ViewTreeNodeImpl("Calendar");

        Dialog.children.push(node1);
        Dialog.children.push(node2);
        Dialog.children.push(Calendar_node);

        this.addToWindowViewTree(Dialog);
        return Dialog;
    }


    private DatePickerDialogShowParser(local2Node: Map<Local, ViewTreeNodeImpl>, stmt: Stmt, expr: ArkInstanceInvokeExpr): ViewTreeNodeImpl | undefined {
        const Dialog = ViewTreeNodeImpl.createDialogNode();
        const node1 = new ViewTreeNodeImpl("Text");
        node1.text_content = "确定";

        const node2 = new ViewTreeNodeImpl("Text");
        node2.text_content = "取消";

        const DatePicker_node = new ViewTreeNodeImpl("DatePicker");

        Dialog.children.push(node1);
        Dialog.children.push(node2);
        Dialog.children.push(DatePicker_node);

        this.addToWindowViewTree(Dialog);
    
        return Dialog;
    }
    private TimePickerDialogShowParser(local2Node: Map<Local, ViewTreeNodeImpl>, stmt: Stmt, expr: ArkInstanceInvokeExpr): ViewTreeNodeImpl | undefined {
        const Dialog = ViewTreeNodeImpl.createDialogNode();
        const node1 = new ViewTreeNodeImpl("Text");
        node1.text_content = "确定";

        const node2 = new ViewTreeNodeImpl("Text");
        node2.text_content = "取消";

        const TimePicker_node = new ViewTreeNodeImpl("TimePicker");

        Dialog.children.push(node1);
        Dialog.children.push(node2);
        Dialog.children.push(TimePicker_node);

        this.addToWindowViewTree(Dialog);
        return Dialog;
    }
    private TextPickerDialogShowParser(local2Node: Map<Local, ViewTreeNodeImpl>, stmt: Stmt, expr: ArkInstanceInvokeExpr): ViewTreeNodeImpl | undefined {
        const Dialog = ViewTreeNodeImpl.createDialogNode();
        const node1 = new ViewTreeNodeImpl("Text");
        node1.text_content = "确定";

        const node2 = new ViewTreeNodeImpl("Text");
        node2.text_content = "取消";

        const TextPicker_node = new ViewTreeNodeImpl("TextPicker");

        Dialog.children.push(node1);
        Dialog.children.push(node2);
        Dialog.children.push(TextPicker_node);

        this.addToWindowViewTree(Dialog);
        return Dialog;
    }

    private analyzeDialog(scene: Scene,local2Node: Map<Local, ViewTreeNodeImpl> = new Map()): void {
        const cfg = this.render.getCfg();
        const stmts = cfg?.getStmts() || [];
        if(cfg){
            for(const stmt of stmts){
                this.analyzeDialogFromStmt(stmt,scene,local2Node);
            }
        }
    }
    private analyzeDialogFromStmt(stmt: Stmt, scene: Scene,local2Node: Map<Local, ViewTreeNodeImpl>): void {
        if (stmt instanceof ArkInvokeStmt) {
            const expr = stmt.getInvokeExpr();
            if (expr instanceof ArkInstanceInvokeExpr) {

                const base = expr.getBase();
                const method_name = expr.getMethodSignature().getMethodSubSignature().getMethodName();
                if (method_name == 'showAlertDialog') {
                    let parserFn = this.DIALOG_SHOW_PARSERS.get(method_name);
                    if (parserFn) {
                        parserFn(local2Node, stmt, expr);
                    }
                } else if (method_name == 'showActionSheet') {
                    let parserFn = this.DIALOG_SHOW_PARSERS.get(method_name);
                    if (parserFn) {
                        parserFn(local2Node, stmt, expr);
                    }
                } else if (method_name == 'open') {
                    const base = expr.getBase();
                    const initValue = backtraceLocalInitValue(base as Local);
                    if (initValue instanceof ArkInstanceFieldRef) {
                        const field_name = initValue.getFieldSignature().getFieldName();
                        const declaring_sig = initValue.getFieldSignature().getDeclaringSignature();
                        if (declaring_sig instanceof ClassSignature) {
                            const clazz = this.findClass(declaring_sig);
                            let field = clazz?.getFieldWithName(field_name);
                            if (field instanceof ArkField) {
                                this.parseObjectFromArkField(field, scene, 'open');
                            }
                        }
                    }
                } else if (base.getName() == 'CalendarPickerDialog' && method_name == 'show') {
                    let parserFn = this.DIALOG_SHOW_PARSERS.get(base.getName());
                    if (parserFn) {
                        parserFn(local2Node, stmt, expr);
                    }
                } else if (method_name == 'showDatePickerDialog' || method_name == 'showTimePickerDialog' || method_name == 'showTextPickerDialog') {
                    let parserFn = this.DIALOG_SHOW_PARSERS.get(method_name);
                    if (parserFn) {
                        parserFn(local2Node, stmt, expr);
                    }
                }
            }
        }
    }


}

export function buildViewTree(render: ArkMethod): ViewTree {
    return new ViewTreeImpl(render);
}


