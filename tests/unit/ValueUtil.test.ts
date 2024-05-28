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

import { Constant } from "../../src/core/base/Constant";
import { NullType, NumberType, StringType, UndefinedType } from "../../src/core/base/Type";
import { ValueUtil } from "../../src/core/common/ValueUtil";
import { assert, describe, expect, it } from "vitest";

describe("ValueUtil Test", () => {
    it('string case', () => {
        let type = StringType.getInstance();
        expect(ValueUtil.getDefaultInstance(type))
            .toEqual(ValueUtil.getStringTypeDefaultValue());
    })
    it('normal case 2', () => {
        let type = NumberType.getInstance();
        expect(ValueUtil.getDefaultInstance(type))
            .toEqual(ValueUtil.getNumberTypeDefaultValue());
    })
    it('normal case 3', () => {
        let type = UndefinedType.getInstance();
        expect(ValueUtil.getDefaultInstance(type))
            .toEqual(ValueUtil.getUndefinedTypeDefaultValue());
    })
    it('normal case 4', () => {
        let type = NullType.getInstance();
        expect(ValueUtil.getDefaultInstance(type))
            .toEqual(new Constant('null', type));
    })
})