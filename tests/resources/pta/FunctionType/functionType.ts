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

namespace functionType {
    class param {
        public name: string;
        public value: string;

        constructor(name: string, value: string) {
            this.name = name;
            this.value = value;
        }
    }

    class Test {
        public test(arg1: param, arg2: param) {
            console.log('test', arg1, arg2);
        }

        public static testStatic(arg1: param, arg2: param) {
            console.log('testStatic', arg1, arg2);
        }
    }

    function test(arg1: param, arg2: param) {
        console.log('test', arg1, arg2);
    }

    function anonFunc(this: { name: string }, arg1: param, arg2: param) {
        console.log(this.name, arg1, arg2);
    };
      
    const obj = { name: "Alice" };

    function ptrInvoke1_call(heapObj1: param, heapObj2: param) {
        let f1 = (arg1: param, arg2: param) => { console.log('f1', arg1, arg2); };
        f1.call(null, heapObj1, heapObj2);
    }

    function ptrInvoke1_apply(heapObj1: param, heapObj2: param) {
        let f1 = (arg1: param, arg2: param) => { console.log('f1', arg1, arg2); };
        f1.apply(null, [heapObj1, heapObj2]);
    }

    function ptrInvoke1_bind(heapObj1: param, heapObj2: param) {
        let f1 = (arg1: param, arg2: param) => { console.log('f1', arg1, arg2); };
        const f1_new = f1.bind(null, heapObj1, heapObj2);
        f1_new();
    }

    function ptrInvoke2_call(heapObj1: param, heapObj2: param) {
        let test_instance_1 = new Test();
        let f2 = test_instance_1.test;
        f2.call(test_instance_1, heapObj1, heapObj2);
    }

    function ptrInvoke2_apply(heapObj1: param, heapObj2: param) {
        let test_instance_2 = new Test();
        let f2 = test_instance_2.test;
        f2.apply(test_instance_2, [heapObj1, heapObj2]);
    }

    function ptrInvoke2_bind(heapObj1: param, heapObj2: param) {
        let test_instance = new Test();
        let f2 = test_instance.test;
        const f2_new = f2.bind(test_instance, heapObj1, heapObj2);
        f2_new();
    }

    function ptrInvoke3_call(heapObj1: param, heapObj2: param) {
        let f2 = Test.testStatic;
        f2.call(Test, heapObj1, heapObj2);
    }

    function ptrInvoke3_apply(heapObj1: param, heapObj2: param) {
        let f2 = Test.testStatic;
        f2.apply(null, [heapObj1, heapObj2]);
    }

    function ptrInvoke3_bind(heapObj1: param, heapObj2: param) {
        let test_instance = new Test();
        let f2 = Test.testStatic;
        const f2_new = f2.bind(test_instance, heapObj1, heapObj2);
        f2_new();
    }

    function ptrInvoke4_call(heapObj1: param, heapObj2: param) {
        let f3 = test;
        f3.call(null, heapObj1, heapObj2);
    }

    function ptrInvoke4_apply(heapObj1: param, heapObj2: param) {
        let f3 = test;
        f3.apply(null, [heapObj1, heapObj2]);
    }

    function ptrInvoke4_bind(heapObj1: param, heapObj2: param) {
        let f3 = test;
        const f3_new = f3.bind(null, heapObj1, heapObj2);
        f3_new();
    }

    function ptrInvoke5_call(heapObj1: param, heapObj2: param) {
        anonFunc.call(obj, heapObj1, heapObj2); // Alice
    }

    function ptrInvoke5_apply(heapObj1: param, heapObj2: param) {
        anonFunc.apply(obj, [heapObj1, heapObj2]); // Alice
    }

    function ptrInvoke5_bind(heapObj1: param, heapObj2: param) {
        const boundFunc = anonFunc.bind(obj, heapObj1, heapObj2);
        boundFunc(); // Alice
    }

    export function main(): void {
        let heapObj1 = new param('name1', 'value1');
        let heapObj2 = new param('name2', 'value2');

        ptrInvoke1_call(heapObj1, heapObj2);
        ptrInvoke1_apply(heapObj1, heapObj2);
        ptrInvoke1_bind(heapObj1, heapObj2);

        ptrInvoke2_call(heapObj1, heapObj2);
        ptrInvoke2_apply(heapObj1, heapObj2);
        ptrInvoke2_bind(heapObj1, heapObj2);

        ptrInvoke3_call(heapObj1, heapObj2);
        ptrInvoke3_apply(heapObj1, heapObj2);
        ptrInvoke3_bind(heapObj1, heapObj2);

        ptrInvoke4_call(heapObj1, heapObj2);
        ptrInvoke4_apply(heapObj1, heapObj2);
        ptrInvoke4_bind(heapObj1, heapObj2);

        ptrInvoke5_call(heapObj1, heapObj2);
        ptrInvoke5_apply(heapObj1, heapObj2);
        ptrInvoke5_bind(heapObj1, heapObj2);
    }
}