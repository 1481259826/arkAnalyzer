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

import { Constant } from "../base/Constant";
import { NullType, NumberType, StringType, Type, UndefinedType } from "../base/Type";

export class ValueUtil {
    private static readonly StringTypeDefaultInstance = new Constant('', StringType.getInstance());
    private static readonly NumberTypeDefaultInstance = new Constant('0', NumberType.getInstance());
    private static readonly UndefinedTypeDefaultInstance = new Constant('undefined', UndefinedType.getInstance());

    public static getDefaultInstance(type: Type): Constant {
        switch (type) {
            case StringType.getInstance():
                return this.getStringTypeDefaultValue();
            case NumberType.getInstance():
                return this.getNumberTypeDefaultValue();
            case UndefinedType.getInstance():
                return this.getUndefinedTypeDefaultValue();
            default:
                return new Constant('null', NullType.getInstance());
        }
    }

    public static getStringTypeDefaultValue(): Constant {
        return this.StringTypeDefaultInstance;
    }

    public static getNumberTypeDefaultValue(): Constant {
        return this.NumberTypeDefaultInstance;
    }

    public static getUndefinedTypeDefaultValue(): Constant {
        return this.UndefinedTypeDefaultInstance;
    }
}