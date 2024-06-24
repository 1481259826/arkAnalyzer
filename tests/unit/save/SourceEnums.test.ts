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

import { SceneConfig, Scene, SourceFilePrinter } from '../../../src/index';
import { describe, expect, it } from 'vitest';
import path from 'path';

const CASE1_EXPECT = `enum Direction1 {
  Up = 1,
  Down,
  Left,
  Right,
}
enum Direction2 {
  Up = "UP",
  Down = "DOWN",
  Left = "LEFT",
  Right = "RIGHT",
}
enum BooleanLikeHeterogeneousEnum {
  No = 0,
  Yes = "YES",
}
enum E1 {
  X,
  Y,
  Z,
}
enum E2 {
  A = 1,
  B,
  C,
}
enum FileAccess {
  None,
  Read = 1 << 1,
  Write = 1 << 2,
  ReadWrite = Read | Write,
  G = "123".length,
}
enum Response1 {
  No = 0,
  Yes = 1,
}
function respond(recipient: string, message: Response1): void {
}
respond('Princess Caroline', Response1.Yes);
enum E {
  X,
  Y,
  Z,
}
function f(obj: {X: number}) {
  return obj.X;
}
f(E);
declare enum Enum {
  A,
}
let a2 = Enum.A;
let nameOfA = Enum.a2;
const enum Directions {
  Up,
  Down,
  Left,
  Right,
}
let directions = [Directions.Up, Directions.Down, Directions.Left, Directions.Right];
`;

describe('SourceEnumsTest', () => {
    let config: SceneConfig = new SceneConfig();
    config.buildFromProjectDir(path.join(__dirname, '../../resources/save'));
    let scene = new Scene();
    scene.buildSceneFromProjectDir(config);
    let arkfile = scene.getFiles().find((value) => {
        return value.getName().endsWith('enums.ts');
    });

    it('case1: whole file', () => {
        if (!arkfile) {
            return;
        }
        let printer = new SourceFilePrinter(arkfile);
        let source = printer.dump();
        expect(source).eq(CASE1_EXPECT);
    });
});
