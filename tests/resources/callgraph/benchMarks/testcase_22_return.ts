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
 * 18/22
 * 4/7
 * testcase_22_return.ts
 * 3(0)/3
 */
// 定义一个自定义的测试类
class FunctionTester {
    // 测试函数：接受一个字符串和一个数字，返回一个包含字符串和数字信息的对象
    processData(str: string, num: number): { data: { message: string, value: number } } {
        return {
            data: {
                message: `Input string: ${str}`,
                value: num * 2
            }
        };
    }

    // 测试函数：接受一个字符串和一个布尔值，返回一个包含字符串和布尔值信息的对象
    processData2(str: string, flag: boolean): { message: string, flag: boolean } {
        return {
            message: `Processed string: ${str}`,
            flag: !flag
        };
    }

    processData3(strArray: string[]): {first: string, length: number} {
        return {
            first: strArray[0],
            length: 1
        }
    }
}

// 创建一个 FunctionTester 实例
const tester = new FunctionTester();

// 测试 processData 函数
const result1 = tester.processData("Hello", 5);

// 测试 processData2 函数
const result2 = tester.processData2("World", true);

const result3 = tester.processData3(["a", "b", "c"])
