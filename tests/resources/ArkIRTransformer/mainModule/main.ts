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

// // call
// console.log('hi');
//
// // for i
// for (let i = 0; i < 10; i++) {
//     console.log(i);
// }
//
// for of
// let arr = [1,2,3]
// for (const arrayElement of arr) {
//     console.log(arrayElement);
// }
//
// // WhileStatement
// let i = 0;
// while (i < 10) {
//     i++;
// }
//
// // DoStatement
// let i = 0;
// do {
//     i++;
// } while (i < 10);
//
// // IfStatement
// let i = 0;
// if (i < 10) {
//     i += 1;
//     if (i < 8) {
//         i += 2;
//     }
// } else {
//     i -= 1;
// }
//
// // PropertyAccessExpression
// let arr = [1, 2];
// let len = arr.length;
//
// array
// const arr1 = [1, 2];
// const arr2 = new Array(10);
// const arr3 = new Array(1, 2, 3);
// const arr4 = new Array();

// // arrayLiteralExpression
// // let arr = [[1], [2]];
// let a = [[{'year': 2022}], [{'year': 2023}]];

//
// // 四则运算
// const a = 1 + 2 * (4 - 5);
//
// // assignment
// let i = 0;
// i = 10;
//
// // prefixUnaryExpression、postfixUnaryExpression
// let i = 0;
// i++;
// ++i;
// i--;
// --i;
// -i;
//
// // templateExpression
// let i = 10;
// let s = `hi ${i}!`;
//
// // AwaitExpression
// await func();
//
// // DeleteExpression
// delete a.b;
//
// // ElementAccessExpression
// let arr = [1, 2];
// let a = arr[0];
//
// // NewExpression
// let arr =new Array(1,2);
//
// // ParenthesizedExpression
// let a = 2 * (1 + 2);
//
// // AsExpression
// let a = 1 as number;
//
// // TypeAssertionExpression
// let a = <number>1;
//
// // NonNullExpression
// let a: number[] | null = [1, 1];
// let b = a!.length;
//
// // TypeOfExpression
// let a = 1;
// let b = typeof a;
//
// // Literal
// let a = 1;
// let b = '2';
// let c = /3/;
// let d = false;
// let e = true;

export class GlobalContext {
    private constructor() {
    }

    private static instance: GlobalContext;
    private _objects = new Map<string, Object>();
    private _context: ESObject = null;

    setContext(context: ESObject) {
        this._context = context;
    }

    getContext() {
        return this._context;
    }

    public static getContext(): GlobalContext {
        if (!GlobalContext.instance) {
            GlobalContext.instance = new GlobalContext();
        }
        return GlobalContext.instance;
    }

    getValue(value: string): Object {
        let result = this._objects.get(value);
        if (!result) {
            throw new Error('this value undefined');
        }
        return result;
    }

    setValue(key: string, objectClass: Object): void {
        this._objects.set(key, objectClass);
    }
}