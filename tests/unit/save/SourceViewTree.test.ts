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

import { SceneConfig, Scene, SourceNamespacePrinter } from '../../../src/index';
import { assert, describe, expect, it } from 'vitest';
import path from 'path';

const CASE2_EXPECT = `namespace Case2 {
  class Tmp {
    paramA1: string = '';
  }
  @Builder
  function overBuilder($$: Tmp) {
    Row.create();
    Column.create();
    Text.create('overBuilder===' + $$.paramA1 + '');
    Text.pop();
    View.create(new HelloComponent({message: $$.paramA1}));
    View.pop();
    Column.pop();
    Row.pop();
  }
  @Component
  struct HelloComponent {
    constructor(value?: {message: string}) {
    }
    @Link
    message: string;
    build() {
      Row.create();
      Text.create('HelloComponent===' + this.message + '');
      Text.pop();
      Row.pop();
    }
  }
  @Entry
  @Component
  struct BuilderTest {
    constructor(value?: {label: string}) {
    }
    @State
    label: string = 'Hello';
    build() {
      Column.create();
      overBuilder({paramA1: .label});
      Button.pop();
      Button.create('Click me').onClick(() => {
        this.label = 'ArkUI';
      });
      Column.pop();
    }
  }
}
`;

const CASE3_EXPECT = `namespace Case3 {
  @Builder
  function overBuilder(paramA1: string) {
    Row.create();
    Text.create('UseStateVarByValue: ' + paramA1 + ' ');
    Text.pop();
    Row.pop();
  }
  @Entry
  @Component
  struct BuilderTest {
    constructor(value?: {label: string}) {
    }
    @State
    label: string = 'Hello';
    build() {
      Column.create();
      overBuilder(this.label);
      Column.pop();
    }
  }
}
`;

describe('SourceViewTreeTest', () => {
    let config: SceneConfig = new SceneConfig();
    config.buildFromProjectDir(
        path.join(__dirname, '../../resources/viewtree')
    );
    let scene = new Scene();
    scene.buildSceneFromProjectDir(config);

    it('case2: class Decorator', () => {
        let arkfile = scene.getFiles().find((value) => {
            return value.getName().endsWith('BuilderTest.ets');
        });

        let ns = arkfile?.getNamespaceWithName('Case2');
        if (!ns) {
            assert.isDefined(ns);
            return;
        }
        let printer = new SourceNamespacePrinter(ns);
        let source = printer.dump();
        expect(source).eq(CASE2_EXPECT);
    });

    it('case3: class Decorator', () => {
        let arkfile = scene.getFiles().find((value) => {
            return value.getName().endsWith('BuilderTest.ets');
        });

        let ns = arkfile?.getNamespaceWithName('Case3');
        if (!ns) {
            assert.isDefined(ns);
            return;
        }
        let printer = new SourceNamespacePrinter(ns);
        let source = printer.dump();
        expect(source).eq(CASE3_EXPECT);
    });
});
