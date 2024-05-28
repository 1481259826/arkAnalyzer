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
// 6/6
// 3/3
// testcase_7_method_call.ts
// 7(1)/7

import { Cat, Main } from "./lib/a";
console.log("Default_Method")

Main.main()
let main = new Main()
let main_2 = main.getMain()
Main.makeAnimalSound(new Cat())