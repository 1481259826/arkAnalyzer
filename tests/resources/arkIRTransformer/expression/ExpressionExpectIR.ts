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

export const BinaryExpression_Expect_IR = {
    stmts: [
        'a = 0',
        'b = 0',
        '$temp0 = a + b',
        '$temp1 = a - b',
        'c = $temp0 / $temp1',
        'd = a & b',
        '$temp2 = a || b',
        'e = $temp2 && a',
        'f = a ** b',
        'f = a / b',
        'f = a + b',
        'f = a - b',
        'f = a * b',
        'f = a % b',
        'f = a << b',
        'f = a >> b',
        'f = a >>> b',
        'f = a & b',
        'f = a | b',
        'f = a ^ b',
        'g = a < b',
        'g = a <= b',
        'g = a > b',
        'g = a >= b',
        'g = a == b',
        'g = a != b',
        'g = a === b',
        'g = a !== b',
        'h = true',
        'h = g && h',
        'h = g || h',
    ],
};

export const UnaryExpression_Expect_IR = {
    stmts: [
        'a = 1',
        'b = -a',
        'c = ~a',
        'd = !a',
    ],
};

export const NewExpression_Expect_IR = {
    stmts: [
        'sz1 = 1',
        '$temp0 = newarray (any)[sz1]',
        'arr1 = $temp0',
        '$temp1 = newarray (any)[10]',
        'arr2 = $temp1',
        '$temp2 = newarray (number)[3]',
        '$temp2[0] = 1',
        '$temp2[1] = 2',
        '$temp2[2] = 3',
        'arr3 = $temp2',
        '$temp3 = newarray (any)[0]',
        'arr4 = $temp3',
    ],
};

export const LiteralExpression_Expect_IR = {
    stmts: [
        '$temp0 = newarray (number)[3]',
        '$temp0[0] = 1',
        '$temp0[1] = 2',
        '$temp0[2] = 3',
        'arr1 = $temp0',
        '$temp1 = newarray (any)[0]',
        'arr2 = $temp1',
        '$temp2 = newarray (number|string)[3]',
        '$temp2[0] = 1',
        '$temp2[1] = 2',
        '$temp2[2] = \'3\'',
        'arr3 = $temp2',
    ],
};

export const Operator_Expect_IR = {
    stmts: [
        '$temp0 = new @_UnknownProjectName/_UnknownFileName: Point',
        'instanceinvoke $temp0.<@_UnknownProjectName/_UnknownFileName: Point.constructor()>()',
        'p = $temp0',
        '$temp1 = delete p.<@_UnknownProjectName/_UnknownFileName: .y>',
        'a = 0',
        'b = 1',
        '$temp2 = a + b',
        '$temp3 = await 10',
        'x = await 11',
        '$temp4 = yield 20',
        'isCat = cat instanceof Cat',
    ],
};