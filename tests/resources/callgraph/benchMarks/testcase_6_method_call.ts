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

// test case for method call 1
// 8/8
// 4/4
// testcase_6_method_call.ts
// 6(0)/6

import { Cat, Dog } from "./lib/a";
console.log("Default_Method")

let num = Cat.getNum()
let cat = new Cat()
let cat_2 = cat.getCat()
cat_2.sound()
let a = cat.testWithParams(new Dog())