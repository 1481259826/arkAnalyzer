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

// let a: number[] = [1, 2, 3];
// for (let i of a) {
//     console.log(i);
// }
//
// for (let i = 0; i < 3; i++) {
//     console.log(i);
// }

// let i = 0;
// for (let j = 0, k = 1; j < 10 && k < 11; j++) {
//     i = j;
//     k++;
// }

// let i = 0;
// while ((i + 1) < 10) {
//     let a = i + 1;
// }

// let i = 0;
// do {
//     i++;
//     for (let j = 0; j < 100; j++) {
//         i+=3;
//     }
// } while ((i + 2) < 10);

// let arr1 = [1, 2];
// for (const [id, n] of arr1.entries()) {
//     console.log(id, n);
// }

// let arr2 = [{i: 1, j: 2}];
// for (const {i, j} of arr2) {
//     console.log(i, j);
// }

// for (let i = 0; i < list.length; i++) {
//     if (i == 0) {
//         continue;
//     }
//     if (i == 2) {
//         break;
//     }
//     logger.info(list[i]);
// }

// let list1 = [1, 2, 3];
//
// for (let i in list1) {
//     logger.info(i); // "0", "1", "2",
// }
//
// for (let j of list1) {
//     logger.info(j); // "4", "5", "6"
// }

let list2 = [1, 2, 3];
for (let i = 0; i < list2.length; i++) {
    if (i == 0) {
        continue;
    }
    if (i == 2) {
        break;
    }
    logger.info(list2[i]);
}




// let i = 0;
// if (i == 0) {
//     i += 1;
// }
// i = 2;
