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

import { Printer, Scene, SceneConfig } from '../../../src/index';
import { describe, expect, it } from 'vitest';
import path from 'path';
import { ArkIRFilePrinter } from '../../../src/save/arkir/ArkIRFilePrinter';

const CASE1_EXPECT = `class %dflt {
  forLoopTest() {
    label0:
      this = this: @save/basic.ts: %dflt
      %0 = new @%unk/%unk: Person
      instanceinvoke %0.<@%unk/%unk: Person.constructor()>(10)
      myPerson = %0
      i = 0
      goto label1

    label1:
      if i < 10 goto label2 label3

    label2:
      %1 = myPerson.<@%unk/%unk: .age>
      newAge = %1 + i
      instanceinvoke logger.<@%unk/%unk: .info()>(newAge)
      i = i + 1
      goto label1

    label3:
      return

  }

  controlTest() {
    label0:
      this = this: @save/basic.ts: %dflt
      %0 = newarray (number)[5]
      %0[0] = 1
      %0[1] = 2
      %0[2] = 3
      %0[3] = 4
      %0[4] = 5
      sampleData = %0
      i = 0
      goto label1

    label1:
      %1 = sampleData.<@%unk/%unk: .length>
      if i < %1 goto label2 label13

    label2:
      %2 = sampleData[i]
      %3 = %2 % 2
      if %3 === 0 goto label3 label4

    label3:
      %4 = sampleData[i]
      %5 = instanceinvoke %4.<@%unk/%unk: .toString()>()
      %6 = %5 + ' 是偶数'
      instanceinvoke logger.<@%unk/%unk: .info()>(%6)
      goto label5

    label4:
      %7 = sampleData[i]
      %8 = instanceinvoke %7.<@%unk/%unk: .toString()>()
      %9 = %8 + ' 是奇数'
      instanceinvoke logger.<@%unk/%unk: .info()>(%9)
      goto label5

    label5:
      count = 0
      goto label6

    label6:
      %10 = sampleData[i]
      if count < %10 goto label7 label15

    label7:
      %11 = instanceinvoke count.<@%unk/%unk: .toString()>()
      %12 = '当前计数: ' + %11
      instanceinvoke logger.<@%unk/%unk: .info()>(%12)
      count = count + 1
      goto label6

    label8:
      if j < 5 goto label9 label17

    label9:
      if j === 2 goto label16 label10

    label10:
      %13 = instanceinvoke j.<@%unk/%unk: .toString()>()
      %14 = '当前内层循环计数: ' + %13
      instanceinvoke logger.<@%unk/%unk: .info()>(%14)
      goto label16

    label11:
      if k < 3 goto label12 label14

    label12:
      %15 = instanceinvoke k.<@%unk/%unk: .toString()>()
      %16 = '外层循环计数: ' + %15
      instanceinvoke logger.<@%unk/%unk: .info()>(%16)
      %17 = 'Department name: ' + k
      instanceinvoke logger.<@%unk/%unk: .info()>(%17)
      if k === 1 goto label14 label11
      k = k + 1

    label13:
      return

    label14:
      i = i + 1
      goto label1

    label15:
      j = 0
      goto label8

    label16:
      j = j + 1
      goto label8

    label17:
      k = 0
      goto label11

  }

  export classMethodTest() {
    this = this: @save/basic.ts: %dflt
    %0 = new @%unk/%unk: Person
    instanceinvoke %0.<@%unk/%unk: Person.constructor()>(10)
    notPerson = %0
    %1 = new @%unk/%unk: Map
    instanceinvoke %1.<@%unk/%unk: Map.constructor()>()
    x = %1
    %2 = new @%unk/%unk: Error
    instanceinvoke %2.<@%unk/%unk: Error.constructor()>()
    z = %2
    y = staticinvoke <@%unk/%unk: .controlTest()>()
    a = notPerson.<@%unk/%unk: .age>
    instanceinvoke notPerson.<@%unk/%unk: .growOld()>()
    instanceinvoke Person.<@%unk/%unk: .wooooof()>()
    return
  }

  export foo(x: number): number {
    label0:
      x = parameter0: number
      this = this: @save/basic.ts: %dflt
      y = 0
      k = 0
      goto label1

    label1:
      if k < x goto label2 label3

    label2:
      y = y + k
      k = k + 1
      goto label1

    label3:
      return y

  }

  export listParameters(u: number, v: number, w: string): @save/basic.ts: %AC$0 {
    u = parameter0: number
    v = parameter1: number
    w = parameter2: string
    this = this: @save/basic.ts: %dflt
    %0 = new @save/basic.ts: %AC$%dflt$listParameters$9
    instanceinvoke %0.<@save/basic.ts: %AC$%dflt$listParameters$9.constructor()>()
    return %0
  }

  deleteTest() {
    this = this: @save/basic.ts: %dflt
    %0 = new @save/basic.ts: %AC$%dflt$deleteTest$11
    instanceinvoke %0.<@save/basic.ts: %AC$%dflt$deleteTest$11.constructor()>()
    x = %0
    bbb = x.<@%unk/%unk: .b>
    %1 = delete x.<@%unk/%unk: .a>
    %2 = delete bbb[0]
    instanceinvoke logger.<@%unk/%unk: .info()>(x)
    %3 = delete x
    return
  }

  async * yieldTest() {
    this = this: @save/basic.ts: %dflt
    %0 = yield 1
    %1 = yield 2
    %2 = yield 3
    return
  }

  %dflt() {
    this = this: @save/basic.ts: %dflt
    %0 = new @save/basic.ts: %AC$%dflt$%dflt$2
    instanceinvoke %0.<@save/basic.ts: %AC$%dflt$%dflt$2.constructor()>()
    staticinvoke <@%unk/%unk: .configure()>(%0)
    logger = staticinvoke <@%unk/%unk: .getLogger()>()
    someClass = %AC$%dflt$%dflt$8
    %1 = new @%unk/%unk: someClass
    instanceinvoke %1.<@%unk/%unk: someClass.constructor()>('Hello, world')
    m = %1
    %2 = staticinvoke <@%unk/%unk: .yieldTest()>()
    iterator = await %2
    x = 1
    soo = 123
    staticinvoke <@%unk/%unk: .forLoopTest()>()
    staticinvoke <@%unk/%unk: .controlTest()>()
    staticinvoke <@%unk/%unk: .deleteTest()>()
    return
  }

  dealColor(rRGB: number, gRGB: number, bRGB: number) {
    label0:
      rRGB = parameter0: number
      gRGB = parameter1: number
      bRGB = parameter2: number
      this = this: @save/basic.ts: %dflt
      %0 = instanceinvoke Math.<@%unk/%unk: .max()>(rRGB, gRGB)
      max = instanceinvoke Math.<@%unk/%unk: .max()>(%0, bRGB)
      %1 = instanceinvoke Math.<@%unk/%unk: .min()>(rRGB, gRGB)
      min = instanceinvoke Math.<@%unk/%unk: .min()>(%1, bRGB)
      bHSB = max / 255
      hHSB = 0
      %2 = max === rRGB
      %3 = gRGB >= bRGB
      %4 = %2 && %3
      if %4 != 0 goto label1 label2

    label1:
      %5 = gRGB - bRGB
      %6 = 60 * %5
      %7 = max - min
      %8 = %6 / %7
      hHSB = %8 + 0
      goto label2

    label2:
      %9 = max === rRGB
      %10 = gRGB < bRGB
      %11 = %9 && %10
      if %11 != 0 goto label3 label4

    label3:
      %12 = gRGB - bRGB
      %13 = 60 * %12
      %14 = max - min
      %15 = %13 / %14
      hHSB = %15 + 360
      goto label4

    label4:
      if max === gRGB goto label5 label6

    label5:
      %16 = bRGB - rRGB
      %17 = 60 * %16
      %18 = max - min
      %19 = %17 / %18
      hHSB = %19 + 120
      goto label6

    label6:
      if max === bRGB goto label7 label8

    label7:
      %20 = rRGB - gRGB
      %21 = 60 * %20
      %22 = max - min
      %23 = %21 / %22
      hHSB = %23 + 240
      goto label8

    label8:
      if bHSB >= 0.4 goto label9 label10

    label9:
      bHSB = 0.3
      goto label13

    label10:
      if bHSB >= 0.2 goto label11 label12

    label11:
      bHSB = bHSB - 0.1
      goto label13

    label12:
      bHSB = bHSB + 0.2
      goto label13

    label13:
      return

  }

  specialString(text: string) {
    text = parameter0: string
    this = this: @save/basic.ts: %dflt
    %0 = new @%unk/%unk: RegExp
    instanceinvoke %0.<@%unk/%unk: RegExp.constructor()>('\\[\\d{2,}:\\d{2}((\\.|:)\\d{2,})\\]', 'g')
    lrcLineRegex = %0
    %1 = new @%unk/%unk: RegExp
    instanceinvoke %1.<@%unk/%unk: RegExp.constructor()>('\\[\\d{2,}', 'i')
    lrcTimeRegex1 = %1
    %2 = new @%unk/%unk: RegExp
    instanceinvoke %2.<@%unk/%unk: RegExp.constructor()>('\\d{2}\\.\\d{2,}', 'i')
    lrcTimeRegex2 = %2
    lyric = instanceinvoke text.<@%unk/%unk: .split()>('
')
    return
  }

  dotDotDotTokenTest(...args: string[]): void {
    args = parameter0: string[]
    this = this: @save/basic.ts: %dflt
    return
  }

}
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
import {configure, getLogger} from 'log4js';
object %AC$%dflt$%dflt$2 {
  appenders;
  categories;
  %instInit() {
    this = this: @save/basic.ts: %AC$%dflt$%dflt$2
    %0 = new @save/basic.ts: %AC$%AC$%dflt$%dflt$2$%instInit$3
    instanceinvoke %0.<@save/basic.ts: %AC$%AC$%dflt$%dflt$2$%instInit$3.constructor()>()
    this.<@save/basic.ts: %AC$%dflt$%dflt$2.appenders> = %0
    %1 = new @save/basic.ts: %AC$%AC$%dflt$%dflt$2$%instInit$6
    instanceinvoke %1.<@save/basic.ts: %AC$%AC$%dflt$%dflt$2$%instInit$6.constructor()>()
    this.<@save/basic.ts: %AC$%dflt$%dflt$2.categories> = %1
    return
  }

}
object %AC$%AC$%dflt$%dflt$2$%instInit$3 {
  console;
  %instInit() {
    this = this: @save/basic.ts: %AC$%AC$%dflt$%dflt$2$%instInit$3
    %0 = new @save/basic.ts: %AC$%AC$%AC$%dflt$%dflt$2$%instInit$3$%instInit$4
    instanceinvoke %0.<@save/basic.ts: %AC$%AC$%AC$%dflt$%dflt$2$%instInit$3$%instInit$4.constructor()>()
    this.<@save/basic.ts: %AC$%AC$%dflt$%dflt$2$%instInit$3.console> = %0
    return
  }

}
object %AC$%AC$%AC$%dflt$%dflt$2$%instInit$3$%instInit$4 {
  type;
  layout;
  %instInit() {
    this = this: @save/basic.ts: %AC$%AC$%AC$%dflt$%dflt$2$%instInit$3$%instInit$4
    this.<@save/basic.ts: %AC$%AC$%AC$%dflt$%dflt$2$%instInit$3$%instInit$4.type> = 'console'
    %0 = new @save/basic.ts: %AC$%AC$%AC$%AC$%dflt$%dflt$2$%instInit$3$%instInit$4$%instInit$5
    instanceinvoke %0.<@save/basic.ts: %AC$%AC$%AC$%AC$%dflt$%dflt$2$%instInit$3$%instInit$4$%instInit$5.constructor()>()
    this.<@save/basic.ts: %AC$%AC$%AC$%dflt$%dflt$2$%instInit$3$%instInit$4.layout> = %0
    return
  }

}
object %AC$%AC$%AC$%AC$%dflt$%dflt$2$%instInit$3$%instInit$4$%instInit$5 {
  type;
  pattern;
  %instInit() {
    this = this: @save/basic.ts: %AC$%AC$%AC$%AC$%dflt$%dflt$2$%instInit$3$%instInit$4$%instInit$5
    this.<@save/basic.ts: %AC$%AC$%AC$%AC$%dflt$%dflt$2$%instInit$3$%instInit$4$%instInit$5.type> = 'pattern'
    this.<@save/basic.ts: %AC$%AC$%AC$%AC$%dflt$%dflt$2$%instInit$3$%instInit$4$%instInit$5.pattern> = '[%d] [%p] [%z] [ArkAnalyzer] - %m'
    return
  }

}
object %AC$%AC$%dflt$%dflt$2$%instInit$6 {
  default;
  %instInit() {
    this = this: @save/basic.ts: %AC$%AC$%dflt$%dflt$2$%instInit$6
    %0 = new @save/basic.ts: %AC$%AC$%AC$%dflt$%dflt$2$%instInit$6$%instInit$7
    instanceinvoke %0.<@save/basic.ts: %AC$%AC$%AC$%dflt$%dflt$2$%instInit$6$%instInit$7.constructor()>()
    this.<@save/basic.ts: %AC$%AC$%dflt$%dflt$2$%instInit$6.default> = %0
    return
  }

}
object %AC$%AC$%AC$%dflt$%dflt$2$%instInit$6$%instInit$7 {
  appenders;
  level;
  enableCallStack;
  %instInit() {
    this = this: @save/basic.ts: %AC$%AC$%AC$%dflt$%dflt$2$%instInit$6$%instInit$7
    %0 = newarray (string)[1]
    %0[0] = 'console'
    this.<@save/basic.ts: %AC$%AC$%AC$%dflt$%dflt$2$%instInit$6$%instInit$7.appenders> = %0
    this.<@save/basic.ts: %AC$%AC$%AC$%dflt$%dflt$2$%instInit$6$%instInit$7.level> = 'info'
    this.<@save/basic.ts: %AC$%AC$%AC$%dflt$%dflt$2$%instInit$6$%instInit$7.enableCallStack> = false
    return
  }

}
class Person {
  %statInit() {
    this = this: @save/basic.ts: Person
    return
  }

  x: number;
  constructor(age: number) {
    instanceinvoke this.<@save/basic.ts: Person.%instInit()>()
    age = parameter0: number
    this = this: @save/basic.ts: Person
    return
  }

  growOld;
  %AM0$%instInit() {
    this = this: @save/basic.ts: Person
    %0 = this.<@%unk/%unk: .age>
    %0 = %0 + 1
    return
  }

  %instInit() {
    this = this: @save/basic.ts: Person
    this.<@save/basic.ts: Person.x> = 0
    this.<@save/basic.ts: Person.growOld> = %AM0$%instInit
    return
  }

  public getAge() {
    this = this: @save/basic.ts: Person
    %0 = this.<@%unk/%unk: .age>
    return %0
  }

  static wooooof() {
    this = this: @save/basic.ts: Person
    instanceinvoke logger.<@%unk/%unk: .info()>('not a person sound')
    return
  }

}
interface Alarm {
  alert(): void;
}
interface Alarm2 {
  alert2(): void;
}
class Door {
  %instInit() {
    this = this: @save/basic.ts: Door
    return
  }

  %statInit() {
    this = this: @save/basic.ts: Door
    return
  }

}
class Adder {
  %statInit() {
    this = this: @save/basic.ts: Adder
    return
  }

  constructor(a: number) {
    instanceinvoke this.<@save/basic.ts: Adder.%instInit()>()
    a = parameter0: number
    this = this: @save/basic.ts: Adder
    return
  }

  // This function is now safe to pass around
  add;
  %AM0$%instInit(b: string): string {
    b = parameter0: string
    this = this: @save/basic.ts: Adder
    %0 = this.<@%unk/%unk: .a>
    %1 = %0 + b
    return %1
  }

  %instInit() {
    this = this: @save/basic.ts: Adder
    this.<@save/basic.ts: Adder.add> = %AM0$%instInit
    return
  }

}
class ExtendedAdder extends Adder {
  %statInit() {
    this = this: @save/basic.ts: ExtendedAdder
    return
  }

  // Create a copy of parent before creating our own
  private superAdd;
  // Now create our override
  add;
  %AM0$%instInit(b: string): string {
    b = parameter0: string
    this = this: @save/basic.ts: ExtendedAdder
    %0 = instanceinvoke this.<@%unk/%unk: .superAdd()>(b)
    return %0
  }

  %instInit() {
    this = this: @save/basic.ts: ExtendedAdder
    %0 = this.<@%unk/%unk: .add>
    this.<@save/basic.ts: ExtendedAdder.superAdd> = %0
    this.<@save/basic.ts: ExtendedAdder.add> = %AM0$%instInit
    return
  }

}
typeliteral %AC$0 {
  x: number;
  y: number;
  z: string;
}
object %AC$%dflt$listParameters$9 {
  x;
  y;
  z;
  %instInit() {
    this = this: @save/basic.ts: %AC$%dflt$listParameters$9
    this.<@save/basic.ts: %AC$%dflt$listParameters$9.x> = u
    this.<@save/basic.ts: %AC$%dflt$listParameters$9.y> = v
    this.<@save/basic.ts: %AC$%dflt$listParameters$9.z> = w
    return
  }

}
export class SecurityDoor extends Door implements Alarm, Alarm2 {
  %statInit() {
    this = this: @save/basic.ts: SecurityDoor
    return
  }

  x: number;
  y: string;
  z: Person;
  alert(): void {
    this = this: @save/basic.ts: SecurityDoor
    instanceinvoke logger.<@%unk/%unk: .info()>('SecurityDoor alert')
    return
  }

  alert2(): void {
    this = this: @save/basic.ts: SecurityDoor
    instanceinvoke logger.<@%unk/%unk: .info()>('SecurityDoor alert2')
    return
  }

  public Members;
  %instInit() {
    this = this: @save/basic.ts: SecurityDoor
    this.<@save/basic.ts: SecurityDoor.x> = 0
    this.<@save/basic.ts: SecurityDoor.y> = ''
    %0 = new @%unk/%unk: Person
    instanceinvoke %0.<@%unk/%unk: Person.constructor()>(10)
    this.<@save/basic.ts: SecurityDoor.z> = %0
    this.<@save/basic.ts: SecurityDoor.Members> = %AC$SecurityDoor$%instInit$1
    return
  }

  public fooo() {
    this = this: @save/basic.ts: SecurityDoor
    instanceinvoke logger.<@%unk/%unk: .info()>('This is fooo!')
    return
  }

  constructor(x: number, y: string) {
    instanceinvoke this.<@save/basic.ts: SecurityDoor.%instInit()>()
    x = parameter0: number
    y = parameter1: string
    this = this: @save/basic.ts: SecurityDoor
    staticinvoke <@%unk/%unk: .super()>()
    this.<@%unk/%unk: .x> = x
    this.<@%unk/%unk: .y> = y
    instanceinvoke logger.<@%unk/%unk: .info()>('This is a constrctor!')
    return
  }

}
class %AC$SecurityDoor$%instInit$1 {
  %instInit() {
    this = this: @save/basic.ts: %AC$SecurityDoor$%instInit$1
    return
  }

  %statInit() {
    this = this: @save/basic.ts: %AC$SecurityDoor$%instInit$1
    return
  }

}
class %AC$%dflt$%dflt$8<Type> {
  %instInit() {
    this = this: @save/basic.ts: %AC$%dflt$%dflt$8
    return
  }

  %statInit() {
    this = this: @save/basic.ts: %AC$%dflt$%dflt$8
    return
  }

  content: Type;
  constructor(value: Type) {
    instanceinvoke this.<@save/basic.ts: %AC$%dflt$%dflt$8.%instInit()>()
    value = parameter0: Type
    this = this: @save/basic.ts: %AC$%dflt$%dflt$8
    this.<@%unk/%unk: .content> = value
    return
  }

}
abstract class Animal {
  %instInit() {
    this = this: @save/basic.ts: Animal
    return
  }

  %statInit() {
    this = this: @save/basic.ts: Animal
    return
  }

  public abstract sayHi(): void;
  public name;
  public constructor(name: string) {
    instanceinvoke this.<@save/basic.ts: Animal.%instInit()>()
    name = parameter0: string
    this = this: @save/basic.ts: Animal
    this.<@%unk/%unk: .name> = name
    return
  }

}
typeliteral %AC$10 {
  a?: number;
  b: number[];
}
object %AC$%dflt$deleteTest$11 {
  a;
  b;
  %instInit() {
    this = this: @save/basic.ts: %AC$%dflt$deleteTest$11
    this.<@save/basic.ts: %AC$%dflt$deleteTest$11.a> = 42
    %0 = newarray (number)[2]
    %0[0] = 5
    %0[1] = 100
    this.<@save/basic.ts: %AC$%dflt$deleteTest$11.b> = %0
    return
  }

}
export {default};
export interface StringValidator {
  isAcceptable(s?: string): boolean;
  color?: string;
  width?: number;
}
export {ExtendedAdder as ExtAdder};
export {ExtendedAdder};
`;


describe('ArkIRPrinterTest', () => {
    let config: SceneConfig = new SceneConfig({enableLeadingComments: true});
    config.buildFromProjectDir(path.join(__dirname, '../../resources/save'));
    let scene = new Scene();
    scene.buildSceneFromProjectDir(config);

    let arkfile = scene.getFiles().find((value) => {
        return value.getName().endsWith('basic.ts');
    });

    it('case1: ', () => {
        let printer: Printer = new ArkIRFilePrinter(arkfile!);
        let ir = printer.dump();
        expect(ir).eq(CASE1_EXPECT);
    });

    
});
