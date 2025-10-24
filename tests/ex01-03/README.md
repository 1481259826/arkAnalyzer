# ArkAnalyzer QuickStart 示例集合

这个目录包含了 ArkAnalyzer 的完整示例代码，涵盖 docs/QuickStart.md 中的所有示例。

## 📁 目录结构

```
tests/quickstart_demo/
├── README.md                    # 本文件
├── README_LOGIC.md             # 底层逻辑详解
├── basicUsage.ts               # ex01 基本功能示例
├── allExamples.ts              # 所有示例的完整版本 ⭐
├── config.json                 # ex01 的配置文件
├── src/                        # ex01 示例项目
│   ├── index.ts
│   ├── models/book.ts
│   └── services/bookService.ts
└── ex02_callgraph/            # ex02 调用图示例
    ├── config.json
    └── src/example.ts
```

## 🚀 快速开始

### 运行所有示例（推荐）

```bash
# 编译（如果修改了代码）
npx tsc tests/quickstart_demo/allExamples.ts --module commonjs --target es2016 --esModuleInterop --skipLibCheck

# 运行
node tests/quickstart_demo/allExamples.js
```

### 运行单个示例

```bash
# 只运行 ex01 基本功能
node tests/quickstart_demo/basicUsage.js
```

## 📚 示例说明

### ✅ ex01: 基本功能

**文件**: `basicUsage.ts`, `allExamples.ts`

**示例项目**: `src/` 目录（图书管理系统）

**涵盖内容**:
- ✓ ex01.1: 获取所有文件
- ✓ ex01.2: 获取命名空间
- ✓ ex01.3: 获取所有类
- ✓ ex01.4: 获取类的属性
- ✓ ex01.5: 获取类的方法
- ✓ ex01.6: 获取方法的 CFG (控制流图)

**运行结果示例**:
```
ex01.1: 获取所有文件
[ 'index.ts', 'models/book.ts', 'services/bookService.ts' ]

ex01.2: 获取命名空间
命名空间: [ 'Library' ]

ex01.3: 获取所有类
所有类: [ '%dflt', '%dflt', '%dflt', 'BookService', '%dflt', 'Book' ]

ex01.4: 获取类的属性
Book 类的属性: [ 'title', 'author' ]

ex01.5: 获取类的方法
BookService 类的方法: [ 'addBook', 'getAllBooks', '%statInit' ]

ex01.6: 获取方法的控制流图 (CFG)
addBook 方法:
  - CFG 基本块数量: 1
  - CFG 语句数量: 5
```

### ✅ ex02: 控制流分析 - 调用图生成

**文件**: `allExamples.ts`

**示例项目**: `ex02_callgraph/src/example.ts`（动物声音多态示例）

**涵盖内容**:
- ✓ ex02.1: CHA (Class Hierarchy Analysis) 算法
- ✓ ex02.2: RTA (Rapid Type Analysis) 算法

**运行结果示例**:
```
ex02.1: 使用 CHA 算法生成调用图
CHA - 调用图中的节点数量: 6
CHA - 调用图中的边数量: 4
CHA - 方法列表:
  1. @CallGraphDemo/example.ts: %dflt.main()
  2. @CallGraphDemo/example.ts: Dog.constructor()
  3. @CallGraphDemo/example.ts: %dflt.makeSound(@CallGraphDemo/example.ts: Animal)
  4. @CallGraphDemo/example.ts: Animal.sound()
  5. @CallGraphDemo/example.ts: Dog.sound()
  6. @CallGraphDemo/example.ts: Cat.sound()

ex02.2: 使用 RTA 算法生成调用图
RTA - 调用图中的节点数量: 6
RTA - 调用图中的边数量: 2
```

**算法对比**:
- **CHA**: 基于类层次结构，分析更保守（包含所有可能的调用）
- **RTA**: 基于快速类型分析，更精确（只包含实际可能的调用）
- **VPA**: 指针分析（最精确，但计算成本最高）- 文档中有示例但未在本代码中实现

### ✅ ex03: 函数内数据流分析

**文件**: `allExamples.ts`

**涵盖内容**:
- ✓ ex03.1: Def-Use Chain (定义-使用链)
- ✓ ex03.2: CFG 基本块分析
- ✓ ex03.3: 代码规则检测和统计

**运行结果示例**:
```
ex03.1: Def-Use Chain (定义-使用链)
addBook 方法的 Def-Use Chain 数量: 3
示例 Def-Use Chain:
  Chain 1:
    值: this
    定义语句: this = this: @QuickStartDemo/services/bookService.
    使用语句: %0 = this.<@QuickStartDemo/services/bookService.ts

ex03.2: CFG 基本块分析
addBook 方法共有 1 个基本块
  基本块 0:
    语句数量: 5
    前驱数量: 0
    后继数量: 0

ex03.3: 代码规则检测
统计信息:
  - 总方法数: 12
  - 有方法体的方法: 12
  - 总语句数: 44
```

## 🔧 自定义和扩展

### 创建自己的分析项目

1. **创建项目目录**:
```bash
mkdir -p tests/my_project/src
```

2. **编写 TypeScript 代码**:
```typescript
// tests/my_project/src/example.ts
export class MyClass {
    myMethod(): void {
        console.log("Hello ArkAnalyzer!");
    }
}
```

3. **创建配置文件**:
```json
{
  "targetProjectName": "MyProject",
  "targetProjectDirectory": "tests/my_project/src",
  "ohosSdkPath": "",
  "kitSdkPath": "",
  "systemSdkPath": "",
  "otherSdks": []
}
```

4. **编写分析代码**:
```typescript
import { Scene, SceneConfig } from "../../out/src/Scene";

const config = new SceneConfig();
config.buildFromJson("tests/my_project/config.json");

const scene = new Scene();
scene.buildSceneFromProjectDir(config);

// 开始分析
const classes = scene.getClasses();
console.log("找到的类:", classes.map(c => c.getName()));
```

## 📖 相关文档

- **QuickStart.md**: `docs/QuickStart.md` - 完整的快速入门文档
- **底层逻辑详解**: `README_LOGIC.md` - 详细解释运行机制
- **API 文档**: `docs/api_docs/` - 完整的 API 参考

## 💡 核心概念

### Scene（场景）
整个项目的抽象表示，包含所有文件、类、方法等信息。

### ArkFile（文件）
单个 TypeScript/ArkTS 文件的抽象。

### ArkClass（类）
类的抽象，包含字段和方法。
- `%dflt` 是默认类，用于存放文件级别的代码

### ArkMethod（方法）
方法的抽象，包含方法体和 CFG。
- `%statInit` 是静态初始化方法
- `%instInit` 是实例初始化方法

### CFG（控制流图）
方法的控制流图，由基本块组成。

### Def-Use Chain（定义-使用链）
追踪变量的定义和使用关系，用于数据流分析。

### Call Graph（调用图）
方法之间的调用关系图。

## 🎯 常见问题

### Q: 为什么类名中有 `%dflt`？
A: `%dflt` 是 ArkAnalyzer 为每个文件和命名空间自动创建的默认类，用于存放顶层代码。

### Q: 什么是三地址码？
A: ArkAnalyzer 将 TypeScript 代码转换为三地址码（每条语句最多3个操作数），便于分析。例如：
```typescript
// 原始代码
this.books.push(book);

// 转换为三地址码
%0 = this.books
%1 = %0.push(book)
```

### Q: CHA 和 RTA 的区别？
A:
- **CHA** (类层次分析): 基于继承关系，包含所有可能的子类方法
- **RTA** (快速类型分析): 基于实际创建的对象，更精确

### Q: 如何查看 CFG 的可视化图？
A: 使用 `PrinterBuilder.dumpToDot()` 生成 .dot 文件，然后用 Graphviz 可视化。

## 🚀 下一步

1. **运行示例**: 先运行 `allExamples.js` 了解所有功能
2. **阅读代码**: 查看 `allExamples.ts` 源代码理解 API 用法
3. **自定义项目**: 创建自己的分析项目
4. **深入学习**: 阅读 `docs/QuickStart.md` 和 API 文档
5. **高级功能**: 探索空指针分析、SSA 转换等高级特性

## 📝 更新日志

- ✅ 完成 ex01 基本功能示例
- ✅ 完成 ex02 调用图生成示例（CHA、RTA）
- ✅ 完成 ex03 数据流分析示例
- ⏳ ex04 函数间数据流分析（待补充）

---

Happy Analyzing! 🎉
