/*
 * Copyright (c) 2025 Huawei Device Co., Ltd.
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

class BasicReadonly {
    fieldA: readonly string[] = ['a', 'b'];
    fieldB: boolean[] = [false];

    readonlyVariable(param: readonly [number, string]): readonly boolean[] {
        let tupleLocal: [number, string] = [123, '123'];
        let readonlyTupleLocal: readonly [number, string] = [123, '123'];

        let arrayLocal: number[] = [123, 345];
        let readonlyArrayLocal: readonly number[] = [123, 345];

        let unionLocal: number[] | [number, string];
        let readonlyUnionLocal: readonly number[] | readonly [number, string];

        return [true];
    }

    readonlyAliasType(param: [number, string]): string[] {
        type A = readonly string[];
        type B = readonly string[] | readonly [number, string];
        type C = string[];
        type D = string[] | [number, string];
        return ['hello', 'world'];
    }
}

type A = boolean;

class ReadonlyOfReferenceType {
    fieldA: readonly A[] = [true, false];
    fieldB: readonly [A, Boolean] = [true, false];

    readonlyVariable(param: readonly [A, string]): readonly A[] {
        type B = readonly A[] | string;
        let readonlyTupleLocal: readonly [number, B] = [123, '123'];
        let readonlyArrayLocal: readonly B[] = [[true], '123'];
        let readonlyUnionLocal: number[] | readonly A[];
        return [true];
    }
}

type C<T> = T;

class ReadonlyOfGenericType {
    fieldA: readonly C<boolean>[] = [true, false];
    fieldB: readonly [C<boolean>, Boolean] = [true, false];

    readonlyVariable(param: readonly [C<string>, string]): readonly C<boolean>[] {
        type D = readonly C<number>[] | string;
        let readonlyTupleLocal: readonly [D, string];
        let readonlyArrayLocal: readonly D[];
        let readonlyUnionLocal: number[] | readonly C<string>[] = [123];
        return [true];
    }
}
