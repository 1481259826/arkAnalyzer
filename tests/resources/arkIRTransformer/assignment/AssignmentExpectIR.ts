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

export const Declaration_Expect_IR = {
    stmts: [
        'a = 1',
        'b = 2',
        'c = 3',
        'd = undefined',
        'e = 4',
        'f = 5',
        'g = 6',
    ],
};

export const CompoundAssignment_Expect_IR = {
    stmts: [
        'a = 1',
        'a = a + 2',
        'a = a - 3',
        'a = a * 4',
        'a = a / 5',
        'a = a ** 6',
        'a = a & 7',
        'a = a | 8',
        'a = a ^ 9',
        'a = a << 10',
        'a = a >> 11',
        'a = a >>> 12',
        'b = \'hello\'',
        'b = b + \' world\'',
        'c = 1',
        'c = c + 1',
        'c = c + 1',
        'c = c - 1',
        'c = c - 1',
    ],
};