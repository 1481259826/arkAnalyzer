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

// while (11) {
//     let a = 1;
//     while (12) {
//         let b = 2;
//         while (13) {
//             let c = 3;
//         }
//     }
//     let d = 4;
// }
// let e = 5;

// let a1 = 0;
// for (let i = 1; i < 2; i++) {
//     let a2 = 3;
//     for (let j = 4; j < 5; j++) {
//         let a3 = 6;
//         for (let k = 7; k < 8; k++) {
//             let a4 = 9;
//         }
//     }
//     let a5 = 10;
// }
// let a6 = 11;

// let list = [4, 5, 6];
//
// let i = 0;
// do {
//     if (i == 0) {
//         continue;
//     }
//     if (i == 2) {
//         break;
//     }
//     logger.info(list[i]);
// } while (i++ < list.length);

let i = 0;
do {
    if (i == 2) {
        break;
    }
    i++;
} while (i < 10);
console.log(2);