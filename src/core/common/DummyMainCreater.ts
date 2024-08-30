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

import { Scene } from '../../Scene';
import { Constant } from '../base/Constant';
import {
    AbstractInvokeExpr,
    ArkConditionExpr,
    ArkInstanceInvokeExpr,
    ArkStaticInvokeExpr,
    RelationalBinaryOperator,
} from '../base/Expr';
import { Local } from '../base/Local';
import { ArkAssignStmt, ArkIfStmt, ArkInvokeStmt, ArkReturnVoidStmt } from '../base/Stmt';
import { BooleanType, ClassType, NumberType } from '../base/Type';
import { BasicBlock } from '../graph/BasicBlock';
import { Cfg } from '../graph/Cfg';
import { ArkBody } from '../model/ArkBody';
import { ArkClass } from '../model/ArkClass';
import { ArkFile } from '../model/ArkFile';
import { ArkMethod } from '../model/ArkMethod';

/**
收集所有的onCreate，onStart等函数，构造一个虚拟函数，具体为：
@static_init()
...
count = 0
while (true) {
    if (count == 1) {
        onCreate()
    }
    if (count == 2) {
        onDestroy()
    }
    ...
    if (count == *) {
        callbackMethod1()
    }
    ...
}
return
如果是instanceInvoke还要先实例化对象，如果是其他文件的类或者方法还要添加import信息
 */

export class DummyMainCreater {

    private entryMethods: ArkMethod[] = [];
    private classLocalMap: Map<ArkMethod, Local | null> = new Map();
    private dummyMain: ArkMethod = new ArkMethod();
    private scene: Scene;

    constructor(scene: Scene) {
        this.scene = scene;
        this.entryMethods = this.scene.getEntryMethodsFromModuleJson5();
        this.entryMethods.push(...scene.getCallbackMethods());
    }

    public setEntryMethods(methods: ArkMethod[]): void {
        this.entryMethods = methods;
    }

    public createDummyMain(): void {
        const dummyMainFile = new ArkFile();
        dummyMainFile.setName('@dummyFile');
        dummyMainFile.setScene(this.scene);
        dummyMainFile.genFileSignature();
        this.scene.getFilesMap().set(dummyMainFile.getFileSignature().toString(), dummyMainFile);
        const dummyMainClass = new ArkClass();
        dummyMainClass.setName('@dummyClass');
        dummyMainClass.setDeclaringArkFile(dummyMainFile);
        dummyMainClass.genSignature();
        dummyMainFile.addArkClass(dummyMainClass);

        this.dummyMain = new ArkMethod();
        this.dummyMain.setName('@dummyMain');
        this.dummyMain.setDeclaringArkClass(dummyMainClass);
        this.dummyMain.setDeclaringArkFile();
        this.dummyMain.setIsGeneratedFlag(true);
        dummyMainClass.addMethod(this.dummyMain);
        this.dummyMain.genSignature();
        for (const method of this.entryMethods) {
            if (method.getDeclaringArkClass().isDefaultArkClass()) {
                this.classLocalMap.set(method, null);
            } else {
                const declaringArkClass = method.getDeclaringArkClass();
                const local = new Local('temp' + declaringArkClass.getName(), new ClassType(declaringArkClass.getSignature()));
                this.classLocalMap.set(method, local);
            }
        }
        const localSet = new Set(Array.from(this.classLocalMap.values()).filter((value): value is Local => value !== null));
        const dummyBody = new ArkBody(localSet, new Cfg(), this.createDummyMainCfg(), new Map(), new Map());
        this.dummyMain.setBody(dummyBody)
        this.addCfg2Stmt()
    }

    private createDummyMainCfg(): Cfg {
        const dummyCfg = new Cfg();
        dummyCfg.setDeclaringMethod(this.dummyMain);

        const firstBlock = new BasicBlock();
        dummyCfg.addBlock(firstBlock);

        for (const method of this.scene.getStaticInitMethods()) {
            const staticInvokeExpr = new ArkStaticInvokeExpr(method.getSignature(), []);
            const invokeStmt = new ArkInvokeStmt(staticInvokeExpr);
            firstBlock.addStmt(invokeStmt);
        }

        const countLocal = new Local('count', NumberType.getInstance());
        const zero = new Constant('0', NumberType.getInstance());
        const countAssignStmt = new ArkAssignStmt(countLocal, zero);


        const truE = new Constant('true', BooleanType.getInstance());
        const conditionTrue = new ArkConditionExpr(truE, zero, RelationalBinaryOperator.Equality);
        const whileStmt = new ArkIfStmt(conditionTrue);
        firstBlock.addStmt(countAssignStmt);
        const whileBlock = new BasicBlock();
        dummyCfg.addBlock(whileBlock);
        whileBlock.addStmt(whileStmt);
        firstBlock.addSuccessorBlock(whileBlock);
        whileBlock.addPredecessorBlock(firstBlock);
        let lastBlocks: BasicBlock[] = [whileBlock];

        let count = 0;
        for (const method of this.entryMethods) {
            count++;
            const condition = new ArkConditionExpr(countLocal, new Constant(count.toString(), NumberType.getInstance()), RelationalBinaryOperator.Equality);
            const ifStmt = new ArkIfStmt(condition);
            const ifBlock = new BasicBlock();
            dummyCfg.addBlock(ifBlock);
            ifBlock.addStmt(ifStmt);
            for (const block of lastBlocks) {
                ifBlock.addPredecessorBlock(block);
                block.addSuccessorBlock(ifBlock);
            }

            const local = this.classLocalMap.get(method);
            let invokeExpr: AbstractInvokeExpr;
            if (local) {
                invokeExpr = new ArkInstanceInvokeExpr(local, method.getSignature(), []);
            } else {
                invokeExpr = new ArkStaticInvokeExpr(method.getSignature(), []);
            }
            const invokeStmt = new ArkInvokeStmt(invokeExpr);
            const invokeBlock = new BasicBlock();
            dummyCfg.addBlock(invokeBlock);
            invokeBlock.addStmt(invokeStmt);
            ifBlock.addSuccessorBlock(invokeBlock);
            invokeBlock.addPredecessorBlock(ifBlock);
            lastBlocks = [ifBlock, invokeBlock];
        }
        for (const block of lastBlocks) {
            block.addSuccessorBlock(whileBlock);
            whileBlock.addPredecessorBlock(block);
        }
        const returnStmt = new ArkReturnVoidStmt();
        const returnBlock = new BasicBlock();
        dummyCfg.addBlock(returnBlock);
        returnBlock.addStmt(returnStmt);
        whileBlock.addSuccessorBlock(returnBlock);
        returnBlock.addPredecessorBlock(whileBlock);

        return dummyCfg;
    }

    private addCfg2Stmt() {
        const cfg = this.dummyMain.getCfg();
        if (!cfg) {
            return;
        }
        for (const block of cfg.getBlocks()) {
            for (const stmt of block.getStmts()) {
                stmt.setCfg(cfg);
            }
        }
    }

    public getDummyMain(): ArkMethod {
        return this.dummyMain;
    }

}