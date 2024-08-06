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

let someArray = [1, 'string', false];

for (let entry of someArray) {
    logger.info(entry); // 1, "string", false
}

let list = [4, 5, 6];

for (let i in list) {
    logger.info(i); // "0", "1", "2",
}

for (let i of list) {
    logger.info(i); // "4", "5", "6"
}

list.forEach(i => {
    logger.info(i);
});

for (let i = 0; i < list.length; i++) {
    if (i == 0) {
        continue;
    }
    if (i == 2) {
        break;
    }
    logger.info(list[i]);
}

for (let j = 0; j < list.length; j++) {
    if (j == 0) {
        continue;
    }
    if (j == 2) {
        break;
    }
    logger.info(list[j]);
}


let pets = new Set(['Cat', 'Dog', 'Hamster']);
for (let pet in pets) {
    logger.info(pet); // "species"
}

for (let pet of pets) {
    logger.info(pet); // "Cat", "Dog", "Hamster"
}