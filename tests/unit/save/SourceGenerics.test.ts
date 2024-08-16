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

import { Scene, SceneConfig, SourceClassPrinter, SourceFilePrinter } from '../../../src/index';
import { assert, describe, expect, it } from 'vitest';
import path from 'path';

const CASE1_EXPECT = `function identity<T>(arg: T): T {
  return arg;
}
let myIdentity = identity;
let output = identity('myString');
class GenericNumber<T> {
  zeroValue: T;
  add: (x: T, y: T) => T ;
  private methods: Set;
  private calls: Map;
}
interface Lengthwise {
  length: number;
}
function loggingIdentity<T>(arg: T): T {
  logger.info(arg.length);
  return arg;
}
class BeeKeeper {
  hasMask: boolean;
}
class ZooKeeper {
  nametag: string;
}
class Animal1 {
  numLegs: number;
}
class Bee extends Animal1 {
  keeper: BeeKeeper;
}
class Lion extends Animal1 {
  keeper: ZooKeeper;
}
function createInstance<A>(c: ConstructorType): A {
  return new c();
}
let l = new Lion();
logger.info(l.keeper);
`;

const CASE2_EXPECT = `class GenericNumber<T> {
  zeroValue: T;
  add: (x: T, y: T) => T ;
  private methods: Set;
  private calls: Map;
}
`;

describe('SourceGenericsTest', () => {
    let config: SceneConfig = new SceneConfig();
    config.buildFromProjectDir(path.join(__dirname, '../../resources/save'));
    let scene = new Scene();
    scene.buildSceneFromProjectDir(config);
    let arkfile = scene.getFiles().find((value) => {
        return value.getName().endsWith('generics.ts');
    });

    it('case1: whole file', () => {
        if (!arkfile) {
            return;
        }
        let printer = new SourceFilePrinter(arkfile);
        let source = printer.dump();
        expect(source).eq(CASE1_EXPECT);
    });

    it('case2: Generic Class', () => {
        let cls = arkfile?.getClassWithName('GenericNumber');
        if (!cls) {
            assert.isDefined(cls);
            return;
        }

        let printer = new SourceClassPrinter(cls);
        let source = printer.dump();
        expect(source).eq(CASE2_EXPECT);
    });
});
