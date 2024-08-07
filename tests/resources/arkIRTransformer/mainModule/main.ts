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

let flag = false;
if (flag) {
    let i = 0;
} else {
    let j = 1;
}

let str = 's';
if (str) {
    let i = 0;
} else {
    let j = 1;
}

let obj = {};
if (obj) {
    let i = 0;
} else {
    let j = 1;
}

let n = 1;
if (n) {
    let i = 0;
} else {
    let j = 1;
}

if (!obj.hasOwnProperty('SystemComponent')) {
    console.log('error');
}