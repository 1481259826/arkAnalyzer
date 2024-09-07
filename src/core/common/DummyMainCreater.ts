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
    ArkNewExpr,
    ArkStaticInvokeExpr,
    RelationalBinaryOperator,
} from '../base/Expr';
import { Local } from '../base/Local';
import { ArkAssignStmt, ArkIfStmt, ArkInvokeStmt, ArkReturnVoidStmt } from '../base/Stmt';
import { BooleanType, ClassType, NumberType, UnclearReferenceType } from '../base/Type';
import { BasicBlock } from '../graph/BasicBlock';
import { Cfg } from '../graph/Cfg';
import { ArkBody } from '../model/ArkBody';
import { ArkClass } from '../model/ArkClass';
import { ArkFile } from '../model/ArkFile';
import { ArkMethod } from '../model/ArkMethod';
import { ArkNamespace } from '../model/ArkNamespace';
import { ClassSignature, FileSignature, MethodSignature } from '../model/ArkSignature';
import { ArkSignatureBuilder } from '../model/builder/ArkSignatureBuilder';

/**
收集所有的onCreate，onStart等函数，构造一个虚拟函数，具体为：
@static_init()
...
count = 0
while (true) {
    if (count == 1) {
        temp1 = new ability
        temp2 = new want
        temp1.onCreate(temp2)
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
    private tempLocalIndex: number = 0;
    private builtInClass: Map<string, ArkClass> = new Map;

    constructor(scene: Scene) {
        this.scene = scene;
        this.entryMethods = this.scene.getEntryMethodsFromModuleJson5();
        this.entryMethods.push(...scene.getCallbackMethods());
        this.buildBuiltInClass();
    }

    private buildBuiltInClass() {
        for (const sdkFile of this.scene.getSdkArkFilesMap().values()) {
            if (sdkFile.getName() == 'api\\@ohos.app.ability.Want.d.ts') {
                const arkClass = sdkFile.getClassWithName('Want')!;
                this.builtInClass.set('Want', arkClass);
            }
        }
    }

    public setEntryMethods(methods: ArkMethod[]): void {
        this.entryMethods = methods;
    }

    public createDummyMain(): void {
        const dummyMainFile = new ArkFile();
        dummyMainFile.setScene(this.scene);
        const dummyMainFileSignature = new FileSignature('', '@dummyFile')
        dummyMainFile.setFileSignature(dummyMainFileSignature)
        this.scene.getFilesMap().set(dummyMainFile.getFileSignature().toString(), dummyMainFile);
        const dummyMainClass = new ArkClass();
        dummyMainClass.setDeclaringArkFile(dummyMainFile);
        dummyMainFile.addArkClass(dummyMainClass);
        const dummyMainClassSignature = new ClassSignature('@dummyClass',
            dummyMainClass.getDeclaringArkFile().getFileSignature(), dummyMainClass.getDeclaringArkNamespace()?.getSignature() || null);
        dummyMainClass.setSignature(dummyMainClassSignature);

        this.dummyMain = new ArkMethod();
        this.dummyMain.setDeclaringArkClass(dummyMainClass);
        this.dummyMain.setIsGeneratedFlag(true);
        dummyMainClass.addMethod(this.dummyMain);
        const methodSubSignature = ArkSignatureBuilder.buildMethodSubSignatureFromMethodName('@dummyMain');
        const methodSignature = new MethodSignature(this.dummyMain.getDeclaringArkClass().getSignature(),
            methodSubSignature);
        this.dummyMain.setSignature(methodSignature);

        for (const method of this.entryMethods) {
            if (method.getDeclaringArkClass().isDefaultArkClass()) {
                this.classLocalMap.set(method, null);
            } else {
                const declaringArkClass = method.getDeclaringArkClass();
                let newLocal: Local | null = null;
                for (const local of this.classLocalMap.values()) {
                    if ((local?.getType() as ClassType).getClassSignature() == declaringArkClass.getSignature()) {
                        newLocal = local;
                        break;
                    }
                }
                if (!newLocal) {
                    newLocal = new Local('temp' + this.tempLocalIndex, new ClassType(declaringArkClass.getSignature()));
                    this.tempLocalIndex++;
                }
                this.classLocalMap.set(method, newLocal);
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

        const locals = Array.from(new Set(this.classLocalMap.values()));
        for (const local of locals) {
            const assStmt = new ArkAssignStmt(local!, new ArkNewExpr(local?.getType() as ClassType))
            firstBlock.addStmt(assStmt);
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

            const invokeBlock = new BasicBlock();
            const paramLocals: Local[] = [];
            for (const param of method.getParameters()) {
                const paramType = param.getType();
                const paramLocal = new Local('temp' + this.tempLocalIndex++, paramType);
                paramLocals.push(paramLocal);
                if (paramType instanceof ClassType) {
                    const assStmt = new ArkAssignStmt(paramLocal, new ArkNewExpr(paramType));
                    invokeBlock.addStmt(assStmt);
                } else if (paramType instanceof UnclearReferenceType) {
                    const arkClass = this.getArkClassFromParamType(paramType.getName(), method.getDeclaringArkFile());
                    if (arkClass) {
                        const classType = new ClassType(arkClass.getSignature());
                        paramLocal.setType(classType);
                        const assStmt = new ArkAssignStmt(paramLocal, new ArkNewExpr(classType));
                        invokeBlock.addStmt(assStmt);
                    }
                }
            }
            const local = this.classLocalMap.get(method);
            let invokeExpr: AbstractInvokeExpr;
            if (local) {
                invokeExpr = new ArkInstanceInvokeExpr(local, method.getSignature(), paramLocals);
            } else {
                invokeExpr = new ArkStaticInvokeExpr(method.getSignature(), paramLocals);
            }
            const invokeStmt = new ArkInvokeStmt(invokeExpr);
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

    private getArkClassFromParamType(name: string, file: ArkFile): ArkClass | null {
        if (name.includes('.')) {
            const nsName = name.split('.')[0];
            const clsName = name.split('.')[1];
            const importInfo = file.getImportInfoBy(nsName);
            const arkExport = importInfo?.getLazyExportInfo()?.getArkExport();
            if (arkExport instanceof ArkNamespace) {
                const arkClass = arkExport.getClassWithName(clsName);
                if (arkClass) {
                    return arkClass;
                }
            }
        } else {
            const importInfo = file.getImportInfoBy(name);
            const arkExport = importInfo?.getLazyExportInfo()?.getArkExport();
            if (arkExport instanceof ArkClass) {
                return arkExport;
            }
        }
        return null;
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