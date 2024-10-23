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

import { im } from './test2';

export class property{
    pp=1;
}
class t{
    static s:property;
    p:property;
    constructor(){
    }
    static sm(){
        console.log(this.s.pp)
        console.log(t.s.pp)
    }
    method(){
        console.log(t.s)
        console.log(x)
    }
    print(){
        console.log(this.p.pp)
    }
}

function U2(){
    let t1 = new t();
    t1.print();
}

function U3(){
    let t1 = new t();
    print(t1)
}

function print(tp:t){
    console.log(tp.p.pp);
}

function U4(){
    console.log(t.s.pp)
}

function U5(){
    t.sm()
}

function U6() {
    im();
}

function U7() {
    console.log(x.pp);
}
export let x:property;
U7();

namespace n{
    x = new property();
    export let y = 1;
    namespace nn{
        export let xnn=1;
    }
    nn.xnn
}

namespace n2{
    n.y=4;
}
console.log(n.y);