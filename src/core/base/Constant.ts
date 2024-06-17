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

import { StringType, Type, UnknownType } from './Type';
import { Value } from './Value';

/**
 * @category core/base
 */
export class Constant implements Value {
    private value: string;
    private type: Type;

    constructor(value: string, type: Type = UnknownType.getInstance()) {
        this.value = value;
        this.type = type;
    }

    public getValue(): string {
        return this.value;
    }

    public setValue(newValue: string): void {
        this.value = newValue;
    }

    public getUses(): Value[] {
        return [];
    }

    public getType(): Type {
        return this.type;
    }

    public setType(newType: Type): void {
        this.type = newType;
    }

    public toString(): string {
        let str = '';
        if (this.type instanceof StringType) {
            str = '\'' + this.value + '\'';
        } else {
            str = this.value;
        }
        return str;
    }
}