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

/**
 * 17/18
 * 2/3
 * testcase_20_return.ts
 * 1(0)/1
 */

// 定义一个自定义的测试类
class ReturnTester {
    // 测试函数：接受两个数字参数并返回它们的和
    addNumbers(num1: number, num2: number): number {
        return num1 + num2;
    }

    concatenateStrings(str1: string, num: number): string {
        return str1 + num.toString();
    }

    negateBoolean(value: boolean): boolean {
        return !value;
    }
}

// 创建一个 FunctionTester 实例
const tester = new ReturnTester();

// 测试 addNumbers 函数
const result = tester.addNumbers(5, 10);
