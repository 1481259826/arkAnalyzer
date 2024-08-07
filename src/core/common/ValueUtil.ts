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

import { Constant } from '../base/Constant';
import { BooleanType, NullType, NumberType, StringType, UndefinedType } from '../base/Type';

export const EMPTY_STRING = '';

export class ValueUtil {
    private static readonly NumberConstantCache: Map<number, Constant> = new Map([
        [0, new Constant('0', NumberType.getInstance())],
        [1, new Constant('1', NumberType.getInstance())],
        [2, new Constant('2', NumberType.getInstance())],
        [3, new Constant('3', NumberType.getInstance())],
        [4, new Constant('4', NumberType.getInstance())],
        [5, new Constant('5', NumberType.getInstance())],
        [6, new Constant('6', NumberType.getInstance())],
        [7, new Constant('7', NumberType.getInstance())],
        [8, new Constant('8', NumberType.getInstance())],
        [9, new Constant('9', NumberType.getInstance())],
        [10, new Constant('10', NumberType.getInstance())],
    ]);
    private static readonly UndefinedConstant = new Constant('undefined', UndefinedType.getInstance());
    private static readonly NullConstant = new Constant('null', NullType.getInstance());
    private static readonly TrueConstant = new Constant('true', BooleanType.getInstance());
    private static readonly FalseConstant = new Constant('false', BooleanType.getInstance());
    private static readonly EMPTY_STRING_CONSTANT = new Constant(EMPTY_STRING, StringType.getInstance());

    public static getOrCreateNumberConst(n: number): Constant {
        let constant = this.NumberConstantCache.get(n);
        if (constant == undefined) {
            constant = new Constant(n.toString(), NumberType.getInstance());
            this.NumberConstantCache.set(n, constant);
        }
        return constant;
    }

    public static createStringConst(str: string): Constant {
        if (str == EMPTY_STRING) {
            return this.EMPTY_STRING_CONSTANT;
        }
        return new Constant(str, StringType.getInstance());
    }

    public static createConst(str: string): Constant {
        const n = Number(str);
        if (!isNaN(n)) {
            return this.getOrCreateNumberConst(n);
        }
        return new Constant(str, StringType.getInstance());
    }

    public static getUndefinedConst(): Constant {
        return this.UndefinedConstant;
    }

    public static getNullConstant(): Constant {
        return this.NullConstant;
    }

    public static getBooleanConstant(value: boolean): Constant {
        return value ? this.TrueConstant : this.FalseConstant;
    }
}