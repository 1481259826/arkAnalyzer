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
    }

    function test(arg1: param, arg2: param) {
        console.log('test', arg1, arg2);
    }

    function anonFunc(this: { name: string }, arg1: param, arg2: param) {
        console.log(this.name, arg1, arg2);
    };
      
    const obj = { name: "Alice" };

    export function main(): void {
        let heapObj1 = new param('name1', 'value1');
        let heapObj2 = new param('name2', 'value2');
        // ptr invoke 1
        // this in arrow function can't be changed by call/apply/bind
        // let f1 = (arg1: param, arg2: param) => {console.log('f1', arg1, arg2);};
        // f1.call(null, heapObj1, heapObj2);
        // f1.apply(null, [heapObj1, heapObj2]);
        // const f1_new = f1.bind(null, heapObj1, heapObj2);
        // f1_new();

        // ptr invoke 2
        let test_instance = new Test();
        let f2 = test_instance.test;
        // test_instance.test(heapObj1, heapObj2);
        f2.call(test_instance, heapObj1, heapObj2);
        // f2.apply(test_instance, [heapObj1, heapObj2]);
        // const f2_new = f2.bind(test_instance, heapObj1, heapObj2);
        // f2_new();

        // ptr invoke 3
        // let f3 = test;
        // f3.call(null, heapObj1, heapObj2);
        // f3.apply(null, [heapObj1, heapObj2]);
        // const f3_new = f3.bind(null, heapObj1, heapObj2);
        // f3_new();

        // ptr invoke 4
        // anonFunc.call(obj, heapObj1, heapObj2); // Alice
        // anonFunc.apply(obj, [heapObj1, heapObj2]); // Alice
        // const boundFunc = anonFunc.bind(obj, heapObj1, heapObj2);
        // boundFunc(); // Alice
    }
}