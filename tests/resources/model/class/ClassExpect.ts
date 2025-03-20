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

export const Class_With_Static_Init_Block_Expect = {
    'Case1': {
        '%statInit': {
            methodSignature: '@class/ClassWithStaticInitBlock.ts: Case1.%statInit()',
            stmts: [
                {
                    text: 'this = this: @class/ClassWithStaticInitBlock.ts: Case1',
                },
                {
                    text: 'staticinvoke <@class/ClassWithStaticInitBlock.ts: Case1.[static]%statBlock0()>()',
                },
                {
                    text: 'return',
                },
            ],
        },
        '%statBlock0': {
            methodSignature: '@class/ClassWithStaticInitBlock.ts: Case1.[static]%statBlock0()',
            stmts: [
                {
                    text: 'this = this: @class/ClassWithStaticInitBlock.ts: Case1',
                },
                {
                    text: 'instanceinvoke console.<@%unk/%unk: .log()>(\'static block\')',
                },
                {
                    text: 'return',
                },
            ],
        },
    },
    'Case2': {
        '%statInit': {
            methodSignature: '@class/ClassWithStaticInitBlock.ts: Case2.%statInit()',
            stmts: [
                {
                    text: 'this = this: @class/ClassWithStaticInitBlock.ts: Case2',
                },
                {
                    text: 'staticinvoke <@class/ClassWithStaticInitBlock.ts: Case2.[static]%statBlock0()>()',
                },
                {
                    text: 'staticinvoke <@class/ClassWithStaticInitBlock.ts: Case2.[static]%statBlock1()>()',
                },
                {
                    text: 'return',
                },
            ],
        },
        '%statBlock0': {
            methodSignature: '@class/ClassWithStaticInitBlock.ts: Case2.[static]%statBlock0()',
            stmts: [
                {
                    text: 'this = this: @class/ClassWithStaticInitBlock.ts: Case2',
                },
                {
                    text: 'instanceinvoke console.<@%unk/%unk: .log()>(\'static block1\')',
                },
                {
                    text: 'return',
                },
            ],
        },
        '%statBlock1': {
            methodSignature: '@class/ClassWithStaticInitBlock.ts: Case2.[static]%statBlock1()',
            stmts: [
                {
                    text: 'this = this: @class/ClassWithStaticInitBlock.ts: Case2',
                },
                {
                    text: 'instanceinvoke console.<@%unk/%unk: .log()>(\'static block2\')',
                },
                {
                    text: 'return',
                },
            ],
        },
    },
    'Case3': {
        '%statInit': {
            methodSignature: '@class/ClassWithStaticInitBlock.ts: Case3.%statInit()',
            stmts: [
                {
                    text: 'this = this: @class/ClassWithStaticInitBlock.ts: Case3',
                },
                {
                    text: 'staticinvoke <@class/ClassWithStaticInitBlock.ts: Case3.[static]%statBlock0()>()',
                },
                {
                    text: '@class/ClassWithStaticInitBlock.ts: Case3.[static]field = 1',
                },
                {
                    text: 'staticinvoke <@class/ClassWithStaticInitBlock.ts: Case3.[static]%statBlock1()>()',
                },
                {
                    text: 'return',
                },
            ],
        },
        '%statBlock0': {
            methodSignature: '@class/ClassWithStaticInitBlock.ts: Case3.[static]%statBlock0()',
            stmts: [
                {
                    text: 'this = this: @class/ClassWithStaticInitBlock.ts: Case3',
                },
                {
                    text: 'instanceinvoke console.<@%unk/%unk: .log()>(\'static block1\')',
                },
                {
                    text: 'return',
                },
            ],
        },
        '%statBlock1': {
            methodSignature: '@class/ClassWithStaticInitBlock.ts: Case3.[static]%statBlock1()',
            stmts: [
                {
                    text: 'this = this: @class/ClassWithStaticInitBlock.ts: Case3',
                },
                {
                    text: 'instanceinvoke console.<@%unk/%unk: .log()>(\'static block2\')',
                },
                {
                    text: 'return',
                },
            ],
        },
    },
};

export const ClassWithGeneratedConstructor = `class ClassWithNoConstructor {
  %instInit(): void {
    label0:
      this = this: @class/ClassWithConstructor.ts: ClassWithNoConstructor
      return
  }

  %statInit(): void {
    label0:
      this = this: @class/ClassWithConstructor.ts: ClassWithNoConstructor
      return
  }

  constructor(): @class/ClassWithConstructor.ts: ClassWithNoConstructor {
    label0:
      this = this: @class/ClassWithConstructor.ts: ClassWithNoConstructor
      instanceinvoke this.<@class/ClassWithConstructor.ts: ClassWithNoConstructor.%instInit()>()
      return this
  }

  test(a: string): void {
    label0:
      a = parameter0: string
      this = this: @class/ClassWithConstructor.ts: ClassWithNoConstructor
      instanceinvoke console.<@%unk/%unk: .log()>('no constructor')
      return
  }
}
`;

export const ClassWithFieldAndConstructor = `class ClassWithNoParamConstructor {
  a: number

  %instInit(): void {
    label0:
      this = this: @class/ClassWithConstructor.ts: ClassWithNoParamConstructor
      return
  }

  %statInit(): void {
    label0:
      this = this: @class/ClassWithConstructor.ts: ClassWithNoParamConstructor
      return
  }

  constructor(): @class/ClassWithConstructor.ts: ClassWithNoParamConstructor {
    label0:
      this = this: @class/ClassWithConstructor.ts: ClassWithNoParamConstructor
      instanceinvoke this.<@class/ClassWithConstructor.ts: ClassWithNoParamConstructor.%instInit()>()
      this.<@class/ClassWithConstructor.ts: ClassWithNoParamConstructor.a> = 123
      return this
  }
}
`;

export const ClassWithFieldAndParamConstructor = `class ClassWithParamsConstructor {
  static a: number
  private b: string

  %instInit(): void {
    label0:
      this = this: @class/ClassWithConstructor.ts: ClassWithParamsConstructor
      return
  }

  %statInit(): void {
    label0:
      this = this: @class/ClassWithConstructor.ts: ClassWithParamsConstructor
      @class/ClassWithConstructor.ts: ClassWithParamsConstructor.[static]a = 123
      return
  }

  constructor(b: string): @class/ClassWithConstructor.ts: ClassWithParamsConstructor {
    label0:
      b = parameter0: string
      this = this: @class/ClassWithConstructor.ts: ClassWithParamsConstructor
      instanceinvoke this.<@class/ClassWithConstructor.ts: ClassWithParamsConstructor.%instInit()>()
      this.<@class/ClassWithConstructor.ts: ClassWithParamsConstructor.b> = b
      return this
  }
}
`;

export const ClassWithSuperConstructor = `class ClassWithSuperConstructor extends ClassWithParamsConstructor {
  c: boolean

  %instInit(): void {
    label0:
      this = this: @class/ClassWithConstructor.ts: ClassWithSuperConstructor
      return
  }

  %statInit(): void {
    label0:
      this = this: @class/ClassWithConstructor.ts: ClassWithSuperConstructor
      return
  }

  constructor(b: string, c: boolean): @class/ClassWithConstructor.ts: ClassWithSuperConstructor {
    label0:
      b = parameter0: string
      c = parameter1: boolean
      this = this: @class/ClassWithConstructor.ts: ClassWithSuperConstructor
      staticinvoke <@class/ClassWithConstructor.ts: ClassWithParamsConstructor.super()>(b)
      instanceinvoke this.<@class/ClassWithConstructor.ts: ClassWithSuperConstructor.%instInit()>()
      this.<@class/ClassWithConstructor.ts: ClassWithSuperConstructor.c> = c
      return this
  }
}
`;

export const ClassWithParamProperty = `class ClassWithParamProperty {
  public x: number
  private readonly y: number

  %instInit(): void {
    label0:
      this = this: @class/ClassWithConstructor.ts: ClassWithParamProperty
      return
  }

  %statInit(): void {
    label0:
      this = this: @class/ClassWithConstructor.ts: ClassWithParamProperty
      return
  }

  constructor(x: number, y: number): @class/ClassWithConstructor.ts: ClassWithParamProperty {
    label0:
      x = parameter0: number
      y = parameter1: number
      this = this: @class/ClassWithConstructor.ts: ClassWithParamProperty
      instanceinvoke this.<@class/ClassWithConstructor.ts: ClassWithParamProperty.%instInit()>()
      return this
  }
}
`;

export const InterfaceClass = `interface TestInterface {
  a: string
  b: number
}
`;

export const EnumClass = `enum TestEnum {
  A,
  B,

  %statInit(): void {
    label0:
      this = this: @class/ClassWithOtherCategory.ts: TestEnum
      this.<@class/ClassWithOtherCategory.ts: TestEnum.[static]A> = 123
      this.<@class/ClassWithOtherCategory.ts: TestEnum.[static]B> = 'abc'
      return
  }
}
`;

export const TypeLiteralClass = `typeliteral %AC0 {
  a: string
  b: @class/ClassWithOtherCategory.ts: %AC1
}
`;

export const SubTypeLiteralClass = `typeliteral %AC1 {
  c: @class/ClassWithOtherCategory.ts: %dflt.[static]%dflt()#c
}
`;

export const ObjClass = `object %AC2$%dflt.%dflt {
  a: number
  b: @class/ClassWithOtherCategory.ts: %AC3$%AC2$%dflt.%dflt.%instInit

  constructor(): @class/ClassWithOtherCategory.ts: %AC2$%dflt.%dflt {
    label0:
      this = this: @class/ClassWithOtherCategory.ts: %AC2$%dflt.%dflt
      instanceinvoke this.<@class/ClassWithOtherCategory.ts: %AC2$%dflt.%dflt.%instInit()>()
      return this
  }

  %instInit(): void {
    label0:
      this = this: @class/ClassWithOtherCategory.ts: %AC2$%dflt.%dflt
      @class/ClassWithOtherCategory.ts: %AC2$%dflt.%dflt.a = a
      %0 = new @class/ClassWithOtherCategory.ts: %AC3$%AC2$%dflt.%dflt.%instInit
      instanceinvoke %0.<@class/ClassWithOtherCategory.ts: %AC3$%AC2$%dflt.%dflt.%instInit.constructor()>()
      @class/ClassWithOtherCategory.ts: %dflt.[static]b = %0
      return
  }
}
`;

export const SubObjClass = `object %AC3$%AC2$%dflt.%dflt.%instInit {
  value: number

  constructor(): @class/ClassWithOtherCategory.ts: %AC3$%AC2$%dflt.%dflt.%instInit {
    label0:
      this = this: @class/ClassWithOtherCategory.ts: %AC3$%AC2$%dflt.%dflt.%instInit
      instanceinvoke this.<@class/ClassWithOtherCategory.ts: %AC3$%AC2$%dflt.%dflt.%instInit.%instInit()>()
      return this
  }

  %instInit(): void {
    label0:
      this = this: @class/ClassWithOtherCategory.ts: %AC3$%AC2$%dflt.%dflt.%instInit
      @class/ClassWithOtherCategory.ts: %AC3$%AC2$%dflt.%dflt.%instInit.value = b
      return
  }
}
`;