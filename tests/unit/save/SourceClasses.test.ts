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

import { Scene, SceneConfig, SourceClassPrinter, SourceFilePrinter, } from '../../../src/index';
import { assert, describe, expect, it } from 'vitest';
import path from 'path';

const SourceClassesTest_CASE1_EXPECT = `class Animal {
  protected _name: string|undefined;
  public constructor(theName: string) {
    this._name = theName;
  }
  public move(distanceInMeters: number) {
    logger.info('' + this._name + ' moved ' + distanceInMeters + 'm.');
  }
  get name(): string|undefined {
    return this._name;
  }
  set name(newName: string|undefined) {
  }
  public print(a: ArrayType): number|null {
    return 0;
  }
  public testArrayReturn(): ArrayType {
    return [];
  }
}
class Snake extends Animal {
  constructor(name: string) {
    super(name);
  }
  move(distanceInMeters: any) {
    logger.info('Slithering...');
    super.move(distanceInMeters);
  }
}
class Horse extends Animal {
  constructor(name: string) {
    super(name);
  }
  move(distanceInMeters: any) {
    logger.info('Galloping...');
    super.move(distanceInMeters);
  }
}
let sam = new Snake('Sammy the Python');
let tom = new Horse('Tommy the Palomino');
sam.move();
tom.move(34);
class Octopus {
  readonly name: string;
  readonly numberOfLegs: number = 8;
  constructor(theName: string) {
    this.name = theName;
  }
}
let dad = new Octopus('Man with the 8 strong legs');
let passcode = 'secret passcode';
class Grid {
  static origin = {x: 0, y: 0};
  calculateDistanceFromOrigin(point: {x: number, y: number}) {
    let xDist = point.x - Grid.origin.x;
    let yDist = point.y - Grid.origin.y;
    return Math.sqrt(xDist * xDist + yDist * yDist) / this.scale;
  }
  constructor(scale: number) {
  }
}
let grid1 = new Grid(1);
let grid2 = new Grid(5);
logger.info(grid1.calculateDistanceFromOrigin({x: 10, y: 10}));
logger.info(grid2.calculateDistanceFromOrigin({x: 10, y: 10}));
abstract class Department {
  constructor(name: string) {
  }
  printName(): void {
    logger.info('Department name: ' + this.name);
  }
  abstract printMeeting(): void;
}
class AccountingDepartment extends Department {
  constructor() {
    super('Accounting and Auditing');
  }
  printMeeting(): void {
    logger.info('The Accounting Department meets each Monday at 10am.');
  }
  generateReports(): void {
    logger.info('Generating accounting reports...');
  }
}
let department = new AccountingDepartment();
department.printName();
department.printMeeting();
class Point {
  x: number;
  y: number;
}
interface Point3d extends Point {
  z: number;
}
let point3d = {x: 1, y: 2, z: 3};
export interface StringValidator {
  isAcceptable(s?: string): boolean;
}
export let numberRegexp = /^[0-9]+$/;
export default class ZipCodeValidator implements StringValidator {
  isAcceptable(s?: string) {
    return s.length === 5 && numberRegexp.test(s);
  }
}
export {ZipCodeValidator as mainValidator};
export class ParseIntBasedZipCodeValidator {
  isAcceptable(s: string) {
    return s.length === 5 && parseInt(s).toString() === s;
  }
}
class ObjectLiteralTest {
  test: Object = {x: 'n', child: [{x: 'c', child: []}]};
}
`;
const SourceClassesTest_CASE2_EXPECT = `class ObjectLiteralTest {
  test: Object = {x: 'n', child: [{x: 'c', child: []}]};
}
`;
const SourceClassesTest_CASE3_EXPECT = `class User extends Account implements Updatable, Serializable {
  displayName?: boolean;
  name!: string;
  : Map;
  roles = ['user'];
  readonly createdAt = new Date();
  constructor(id: string, name: string) {
    super(id);
    this.name = name;
  }
  setName(name: string) {
    this.name = name;
  }
  verifyName = (name: string) => {
  };
  sync(cb: ParenthesizedType): void {
  }
  get accountID() {
    return this.id;
  }
  set accountID(value: string) {
  }
  private makeRequest() {
  }
  protected handleRequest() {
  }
  static  = 0;
  static registerUser(user: User) {
  }
}
`;

// TODO: index not support
const SourceClassesTest_CASE4_EXPECT = `interface Updatable {
  [key: string]: number;
}
`;

describe('SourceClassesTest', () => {
    let config: SceneConfig = new SceneConfig();
    config.buildFromProjectDir(path.join(__dirname, '../../resources/save'));
    let scene = new Scene();
    scene.buildSceneFromProjectDir(config);

    it('case1: whole file', () => {
        let arkfile = scene.getFiles().find((value) => {
            return value.getName() == 'classes.ts';
        });
        if (!arkfile) {
            return;
        }
        let printer = new SourceFilePrinter(arkfile);
        let source = printer.dump();
        expect(source).eq(SourceClassesTest_CASE1_EXPECT);
    });

    it('case2: ObjectLiteralTest', () => {
        let arkfile = scene.getFiles().find((value) => {
            return value.getName() == 'classes.ts';
        });
        let cls = arkfile?.getClassWithName('ObjectLiteralTest');
        if (!cls) {
            assert.isDefined(cls);
            return;
        }
        let printer = new SourceClassPrinter(cls);
        let source = printer.dump();
        expect(source).eq(SourceClassesTest_CASE2_EXPECT);
    });

    it('case3: cheat sheet common yyntax test', () => {
        let arkfile2 = scene.getFiles().find((value) => {
            return value.getName() == 'cheat_sheet_classes.ts';
        });
        let cls = arkfile2?.getClassWithName('User');
        if (!cls) {
            assert.isDefined(cls);
            return;
        }
        let printer = new SourceClassPrinter(cls);
        let source = printer.dump();
        expect(source).eq(SourceClassesTest_CASE3_EXPECT);
    });

    // it('case4: index field test', () => {
    //   let arkfile2 = scene.getFiles().find((value) => {
    //     return value.getName() == 'cheat_sheet_classes.ts';
    //   });
    //   let cls = arkfile2?.getClassWithName('Updatable');
    //   if (!cls) {
    //     assert.isDefined(cls);
    //     return;
    //   }
    //   let printer = new SourceClassPrinter(cls);
    //   let source = printer.dump();
    //   expect(source).eq(SourceClassesTest_CASE4_EXPECT);
    // })
});
