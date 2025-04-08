
/*
 * Copyright (c) 2025 Huawei Device Co., Ltd.
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

import { assert, describe, it } from 'vitest';
import { SceneConfig, Scene, CallGraph, CallGraphBuilder, Pag, PointerAnalysis, PointerAnalysisConfig } from '../../../src';
import { Sdk } from '../../../src/Config';

let sdk: Sdk = {
    name: 'ohos',
    path: './builtIn/typescript',
    moduleName: ''
};

function test(): PointerAnalysis {
    let config: SceneConfig = new SceneConfig();
    config.buildFromProjectDir('./tests/resources/pta/FunctionType');
    config.getSdksObj().push(sdk);

    let scene = new Scene();
    scene.buildSceneFromProjectDir(config);
    scene.inferTypes();

    let cg = new CallGraph(scene);
    let cgBuilder = new CallGraphBuilder(cg, scene);
    cgBuilder.buildDirectCallGraphForScene();

    let pag = new Pag();
    let debugfunc = cg.getEntries().filter(funcID => cg.getArkMethodByFuncID(funcID)?.getName() === 'main');

    let ptaConfig = PointerAnalysisConfig.create(2, './out', true, true, false);
    let pta = new PointerAnalysis(pag, cg, scene, ptaConfig);
    pta.setEntries(debugfunc);
    pta.start();
    return pta;
}

describe('Function.call Test', () => {
    let pta = test();
    it('case1: anonymousMethod', () => {
        let callerMethod = pta.getScene().getMethods().filter(arkMethod => arkMethod.getSignature().toString()
            === '@FunctionType/functionType.ts: functionType.%dflt.ptrInvoke1_call(@FunctionType/functionType.ts: functionType.param, @FunctionType/functionType.ts: functionType.param)');
        let calleeMethod = pta.getScene().getMethods().filter(arkMethod => arkMethod.getSignature().toString() 
            === '@FunctionType/functionType.ts: functionType.%dflt.%AM0$ptrInvoke1_call(@FunctionType/functionType.ts: functionType.param, @FunctionType/functionType.ts: functionType.param)');

        let argSrcValue_1 = callerMethod[0]?.getBody()?.getLocals().get('heapObj1')!;
        let argSrcValue_2 = callerMethod[0]?.getBody()?.getLocals().get('heapObj2')!;

        let argDstValue_1 = calleeMethod[0]?.getBody()?.getLocals().get('arg1')!;
        let argDstValue_2 = calleeMethod[0]?.getBody()?.getLocals().get('arg2')!;

        let relatedNodes = pta.getRelatedNodes(argSrcValue_1);
        assert(
            Array.from(relatedNodes).find(node => node === argDstValue_1)
        );

        relatedNodes = pta.getRelatedNodes(argSrcValue_2);
        assert(
            Array.from(relatedNodes).find(node => node === argDstValue_2)
        );
    });

    it('case2: class instance method', () => {
        let callerMethod = pta.getScene().getMethods().filter(arkMethod => arkMethod.getSignature().toString()
            === '@FunctionType/functionType.ts: functionType.%dflt.ptrInvoke2_call(@FunctionType/functionType.ts: functionType.param, @FunctionType/functionType.ts: functionType.param)');
        let calleeMethod = pta.getScene().getMethods().filter(arkMethod => arkMethod.getSignature().toString() 
            === '@FunctionType/functionType.ts: functionType.Test.test(@FunctionType/functionType.ts: functionType.param, @FunctionType/functionType.ts: functionType.param)');

        let thisSrcValue = callerMethod[0]?.getBody()?.getLocals().get('test_instance_1')!;
        let argSrcValue_1 = callerMethod[0]?.getBody()?.getLocals().get('heapObj1')!;
        let argSrcValue_2 = callerMethod[0]?.getBody()?.getLocals().get('heapObj2')!;

        let thisDstValue = calleeMethod[0]?.getBody()?.getLocals().get('this')!;
        let argDstValue_1 = calleeMethod[0]?.getBody()?.getLocals().get('arg1')!;
        let argDstValue_2 = calleeMethod[0]?.getBody()?.getLocals().get('arg2')!;

        let relatedNodes = pta.getRelatedNodes(thisSrcValue);
        assert(
            Array.from(relatedNodes).find(node => node === thisDstValue)
        );

        relatedNodes = pta.getRelatedNodes(argSrcValue_1);
        assert(
            Array.from(relatedNodes).find(node => node === argDstValue_1)
        );

        relatedNodes = pta.getRelatedNodes(argSrcValue_2);
        assert(
            Array.from(relatedNodes).find(node => node === argDstValue_2)
        );
    });

    it('case3: class static method', () => {
        let callerMethod = pta.getScene().getMethods().filter(arkMethod => arkMethod.getSignature().toString()
            === '@FunctionType/functionType.ts: functionType.%dflt.ptrInvoke3_call(@FunctionType/functionType.ts: functionType.param, @FunctionType/functionType.ts: functionType.param)');
        let calleeMethod = pta.getScene().getMethods().filter(arkMethod => arkMethod.getSignature().toString() 
            === '@FunctionType/functionType.ts: functionType.Test.[static]testStatic(@FunctionType/functionType.ts: functionType.param, @FunctionType/functionType.ts: functionType.param)');

        let argSrcValue_1 = callerMethod[0]?.getBody()?.getLocals().get('heapObj1')!;
        let argSrcValue_2 = callerMethod[0]?.getBody()?.getLocals().get('heapObj2')!;

        let argDstValue_1 = calleeMethod[0]?.getBody()?.getLocals().get('arg1')!;
        let argDstValue_2 = calleeMethod[0]?.getBody()?.getLocals().get('arg2')!;

        let relatedNodes = pta.getRelatedNodes(argSrcValue_1);
        assert(
            Array.from(relatedNodes).find(node => node === argDstValue_1)
        );

        relatedNodes = pta.getRelatedNodes(argSrcValue_2);
        assert(
            Array.from(relatedNodes).find(node => node === argDstValue_2)
        );
    });

    it('case4: function', () => {
        let callerMethod = pta.getScene().getMethods().filter(arkMethod => arkMethod.getSignature().toString()
            === '@FunctionType/functionType.ts: functionType.%dflt.ptrInvoke4_call(@FunctionType/functionType.ts: functionType.param, @FunctionType/functionType.ts: functionType.param)');
        let calleeMethod = pta.getScene().getMethods().filter(arkMethod => arkMethod.getSignature().toString() 
            === '@FunctionType/functionType.ts: functionType.%dflt.test(@FunctionType/functionType.ts: functionType.param, @FunctionType/functionType.ts: functionType.param)');

        let argSrcValue_1 = callerMethod[0]?.getBody()?.getLocals().get('heapObj1')!;
        let argSrcValue_2 = callerMethod[0]?.getBody()?.getLocals().get('heapObj2')!;

        let argDstValue_1 = calleeMethod[0]?.getBody()?.getLocals().get('arg1')!;
        let argDstValue_2 = calleeMethod[0]?.getBody()?.getLocals().get('arg2')!;

        let relatedNodes = pta.getRelatedNodes(argSrcValue_1);
        assert(
            Array.from(relatedNodes).find(node => node === argDstValue_1)
        );

        relatedNodes = pta.getRelatedNodes(argSrcValue_2);
        assert(
            Array.from(relatedNodes).find(node => node === argDstValue_2)
        );
    });

    it('case5: function with binding environment', () => {
        // 
    });
});

describe('Function.apply Test', () => {
    it('case1: anonymousMethod', () => {
        let pta = test();

        let callerMethod = pta.getScene().getMethods().filter(arkMethod => arkMethod.getSignature().toString()
            === '@FunctionType/functionType.ts: functionType.%dflt.ptrInvoke1_apply(@FunctionType/functionType.ts: functionType.param, @FunctionType/functionType.ts: functionType.param)');
        let calleeMethod = pta.getScene().getMethods().filter(arkMethod => arkMethod.getSignature().toString() 
            === '@FunctionType/functionType.ts: functionType.%dflt.%AM0$ptrInvoke1_call(@FunctionType/functionType.ts: functionType.param, @FunctionType/functionType.ts: functionType.param)');

        let argSrcValue_1 = callerMethod[0]?.getBody()?.getLocals().get('heapObj1')!;
        let argSrcValue_2 = callerMethod[0]?.getBody()?.getLocals().get('heapObj2')!;

        let argDstValue_1 = calleeMethod[0]?.getBody()?.getLocals().get('arg1')!;
        let argDstValue_2 = calleeMethod[0]?.getBody()?.getLocals().get('arg2')!;

        let relatedNodes = pta.getRelatedNodes(argSrcValue_1);
        assert(
            Array.from(relatedNodes).find(node => node === argDstValue_1)
        );

        relatedNodes = pta.getRelatedNodes(argSrcValue_2);
        assert(
            Array.from(relatedNodes).find(node => node === argDstValue_2)
        );
    });

    it('case2: class instance method', () => {
        let pta = test();

        let callerMethod = pta.getScene().getMethods().filter(arkMethod => arkMethod.getSignature().toString()
            === '@FunctionType/functionType.ts: functionType.%dflt.ptrInvoke2_apply(@FunctionType/functionType.ts: functionType.param, @FunctionType/functionType.ts: functionType.param)');
        let calleeMethod = pta.getScene().getMethods().filter(arkMethod => arkMethod.getSignature().toString() 
            === '@FunctionType/functionType.ts: functionType.Test.test(@FunctionType/functionType.ts: functionType.param, @FunctionType/functionType.ts: functionType.param)');

        let thisSrcValue = callerMethod[0]?.getBody()?.getLocals().get('test_instance_2')!;
        let argSrcValue_1 = callerMethod[0]?.getBody()?.getLocals().get('heapObj1')!;
        let argSrcValue_2 = callerMethod[0]?.getBody()?.getLocals().get('heapObj2')!;

        let thisDstValue = calleeMethod[0]?.getBody()?.getLocals().get('this')!;
        let argDstValue_1 = calleeMethod[0]?.getBody()?.getLocals().get('arg1')!;
        let argDstValue_2 = calleeMethod[0]?.getBody()?.getLocals().get('arg2')!;

        let relatedNodes = pta.getRelatedNodes(thisSrcValue);
        assert(
            Array.from(relatedNodes).find(node => node === thisDstValue)
        );

        relatedNodes = pta.getRelatedNodes(argSrcValue_1);
        assert(
            Array.from(relatedNodes).find(node => node === argDstValue_1)
        );

        relatedNodes = pta.getRelatedNodes(argSrcValue_2);
        assert(
            Array.from(relatedNodes).find(node => node === argDstValue_2)
        );
    });

    it('case3: class static method', () => {
        let pta = test();

        let callerMethod = pta.getScene().getMethods().filter(arkMethod => arkMethod.getSignature().toString()
            === '@FunctionType/functionType.ts: functionType.%dflt.ptrInvoke3_apply(@FunctionType/functionType.ts: functionType.param, @FunctionType/functionType.ts: functionType.param)');
        let calleeMethod = pta.getScene().getMethods().filter(arkMethod => arkMethod.getSignature().toString() 
            === '@FunctionType/functionType.ts: functionType.Test.[static]testStatic(@FunctionType/functionType.ts: functionType.param, @FunctionType/functionType.ts: functionType.param)');

        let argSrcValue_1 = callerMethod[0]?.getBody()?.getLocals().get('heapObj1')!;
        let argSrcValue_2 = callerMethod[0]?.getBody()?.getLocals().get('heapObj2')!;

        let argDstValue_1 = calleeMethod[0]?.getBody()?.getLocals().get('arg1')!;
        let argDstValue_2 = calleeMethod[0]?.getBody()?.getLocals().get('arg2')!;

        let relatedNodes = pta.getRelatedNodes(argSrcValue_1);
        assert(
            Array.from(relatedNodes).find(node => node === argDstValue_1)
        );

        relatedNodes = pta.getRelatedNodes(argSrcValue_2);
        assert(
            Array.from(relatedNodes).find(node => node === argDstValue_2)
        );
    });

    it('case4: function', () => {
        let pta = test();

        let callerMethod = pta.getScene().getMethods().filter(arkMethod => arkMethod.getSignature().toString()
            === '@FunctionType/functionType.ts: functionType.%dflt.ptrInvoke4_apply(@FunctionType/functionType.ts: functionType.param, @FunctionType/functionType.ts: functionType.param)');
        let calleeMethod = pta.getScene().getMethods().filter(arkMethod => arkMethod.getSignature().toString() 
            === '@FunctionType/functionType.ts: functionType.%dflt.test(@FunctionType/functionType.ts: functionType.param, @FunctionType/functionType.ts: functionType.param)');

        let argSrcValue_1 = callerMethod[0]?.getBody()?.getLocals().get('heapObj1')!;
        let argSrcValue_2 = callerMethod[0]?.getBody()?.getLocals().get('heapObj2')!;

        let argDstValue_1 = calleeMethod[0]?.getBody()?.getLocals().get('arg1')!;
        let argDstValue_2 = calleeMethod[0]?.getBody()?.getLocals().get('arg2')!;

        let relatedNodes = pta.getRelatedNodes(argSrcValue_1);
        assert(
            Array.from(relatedNodes).find(node => node === argDstValue_1)
        );

        relatedNodes = pta.getRelatedNodes(argSrcValue_2);
        assert(
            Array.from(relatedNodes).find(node => node === argDstValue_2)
        );
    });

    it('case5: function with binding environment', () => {
        // 
    });
});

// TODO: add return value check
describe('Function.bind Test', () => {
    it('case1: anonymousMethod', () => {
        let pta = test();

        let callerMethod = pta.getScene().getMethods().filter(arkMethod => arkMethod.getSignature().toString()
            === '@FunctionType/functionType.ts: functionType.%dflt.ptrInvoke1_bind(@FunctionType/functionType.ts: functionType.param, @FunctionType/functionType.ts: functionType.param)');
        let calleeMethod = pta.getScene().getMethods().filter(arkMethod => arkMethod.getSignature().toString() 
            === '@FunctionType/functionType.ts: functionType.%dflt.%AM0$ptrInvoke1_call(@FunctionType/functionType.ts: functionType.param, @FunctionType/functionType.ts: functionType.param)');

        let argSrcValue_1 = callerMethod[0]?.getBody()?.getLocals().get('heapObj1')!;
        let argSrcValue_2 = callerMethod[0]?.getBody()?.getLocals().get('heapObj2')!;

        let argDstValue_1 = calleeMethod[0]?.getBody()?.getLocals().get('arg1')!;
        let argDstValue_2 = calleeMethod[0]?.getBody()?.getLocals().get('arg2')!;

        let relatedNodes = pta.getRelatedNodes(argSrcValue_1);
        assert(
            Array.from(relatedNodes).find(node => node === argDstValue_1)
        );

        relatedNodes = pta.getRelatedNodes(argSrcValue_2);
        assert(
            Array.from(relatedNodes).find(node => node === argDstValue_2)
        );
    });

    it('case2: class instance method', () => {
        let pta = test();

        let callerMethod = pta.getScene().getMethods().filter(arkMethod => arkMethod.getSignature().toString()
            === '@FunctionType/functionType.ts: functionType.%dflt.ptrInvoke2_bind(@FunctionType/functionType.ts: functionType.param, @FunctionType/functionType.ts: functionType.param)');
        let calleeMethod = pta.getScene().getMethods().filter(arkMethod => arkMethod.getSignature().toString() 
            === '@FunctionType/functionType.ts: functionType.Test.test(@FunctionType/functionType.ts: functionType.param, @FunctionType/functionType.ts: functionType.param)');

        let thisSrcValue = callerMethod[0]?.getBody()?.getLocals().get('test_instance')!;
        let argSrcValue_1 = callerMethod[0]?.getBody()?.getLocals().get('heapObj1')!;
        let argSrcValue_2 = callerMethod[0]?.getBody()?.getLocals().get('heapObj2')!;

        let thisDstValue = calleeMethod[0]?.getBody()?.getLocals().get('this')!;
        let argDstValue_1 = calleeMethod[0]?.getBody()?.getLocals().get('arg1')!;
        let argDstValue_2 = calleeMethod[0]?.getBody()?.getLocals().get('arg2')!;

        let relatedNodes = pta.getRelatedNodes(thisSrcValue);
        assert(
            Array.from(relatedNodes).find(node => node === thisDstValue)
        );

        relatedNodes = pta.getRelatedNodes(argSrcValue_1);
        assert(
            Array.from(relatedNodes).find(node => node === argDstValue_1)
        );

        relatedNodes = pta.getRelatedNodes(argSrcValue_2);
        assert(
            Array.from(relatedNodes).find(node => node === argDstValue_2)
        );
    });

    it('case3: class static method', () => {
        let pta = test();

        let callerMethod = pta.getScene().getMethods().filter(arkMethod => arkMethod.getSignature().toString()
            === '@FunctionType/functionType.ts: functionType.%dflt.ptrInvoke3_bind(@FunctionType/functionType.ts: functionType.param, @FunctionType/functionType.ts: functionType.param)');
        let calleeMethod = pta.getScene().getMethods().filter(arkMethod => arkMethod.getSignature().toString() 
            === '@FunctionType/functionType.ts: functionType.Test.[static]testStatic(@FunctionType/functionType.ts: functionType.param, @FunctionType/functionType.ts: functionType.param)');

        let argSrcValue_1 = callerMethod[0]?.getBody()?.getLocals().get('heapObj1')!;
        let argSrcValue_2 = callerMethod[0]?.getBody()?.getLocals().get('heapObj2')!;

        let argDstValue_1 = calleeMethod[0]?.getBody()?.getLocals().get('arg1')!;
        let argDstValue_2 = calleeMethod[0]?.getBody()?.getLocals().get('arg2')!;

        let relatedNodes = pta.getRelatedNodes(argSrcValue_1);
        assert(
            Array.from(relatedNodes).find(node => node === argDstValue_1)
        );

        relatedNodes = pta.getRelatedNodes(argSrcValue_2);
        assert(
            Array.from(relatedNodes).find(node => node === argDstValue_2)
        );
    });

    it('case4: function', () => {
        let pta = test();

        let callerMethod = pta.getScene().getMethods().filter(arkMethod => arkMethod.getSignature().toString()
            === '@FunctionType/functionType.ts: functionType.%dflt.ptrInvoke4_bind(@FunctionType/functionType.ts: functionType.param, @FunctionType/functionType.ts: functionType.param)');
        let calleeMethod = pta.getScene().getMethods().filter(arkMethod => arkMethod.getSignature().toString() 
            === '@FunctionType/functionType.ts: functionType.%dflt.test(@FunctionType/functionType.ts: functionType.param, @FunctionType/functionType.ts: functionType.param)');

        let argSrcValue_1 = callerMethod[0]?.getBody()?.getLocals().get('heapObj1')!;
        let argSrcValue_2 = callerMethod[0]?.getBody()?.getLocals().get('heapObj2')!;

        let argDstValue_1 = calleeMethod[0]?.getBody()?.getLocals().get('arg1')!;
        let argDstValue_2 = calleeMethod[0]?.getBody()?.getLocals().get('arg2')!;

        let relatedNodes = pta.getRelatedNodes(argSrcValue_1);
        assert(
            Array.from(relatedNodes).find(node => node === argDstValue_1)
        );

        relatedNodes = pta.getRelatedNodes(argSrcValue_2);
        assert(
            Array.from(relatedNodes).find(node => node === argDstValue_2)
        );
    });

    it('case5: function with binding environment', () => {
        // 
    });
});