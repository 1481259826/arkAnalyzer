# `node tests/quickstart_demo/basicUsage.js` 底层逻辑详解

## 一、执行流程概览

```
用户执行命令
    ↓
Node.js 加载 JS 文件
    ↓
导入 ArkAnalyzer 模块
    ↓
读取配置文件
    ↓
构建 Scene (项目分析)
    ↓
    ├─ 1. 扫描源代码文件
    ├─ 2. 解析 TypeScript AST
    ├─ 3. 构建 ArkFile (文件抽象)
    ├─ 4. 提取类、方法、字段
    ├─ 5. 构建 CFG (控制流图)
    └─ 6. 建立依赖关系
    ↓
执行查询操作
    ↓
输出结果
```

## 二、核心步骤详解

### 步骤 1: Node.js 加载模块

```javascript
// basicUsage.js (编译后的 JS 文件)
const Scene_1 = require("../../out/src/Scene");
const Config_1 = require("../../out/src/Config");
```

**发生了什么：**
- Node.js 使用 CommonJS 模块系统加载编译后的 JavaScript 代码
- 加载 ArkAnalyzer 的核心模块：Scene 和 SceneConfig
- 这些模块包含了静态程序分析的所有功能

### 步骤 2: 读取配置文件

```javascript
const configPath = "tests/quickstart_demo/config.json";
let config = new Config_1.SceneConfig();
config.buildFromJson(configPath);
```

**config.json 内容：**
```json
{
  "targetProjectName": "QuickStartDemo",
  "targetProjectDirectory": "tests/quickstart_demo/src",
  "ohosSdkPath": "",
  "kitSdkPath": "",
  "systemSdkPath": "",
  "otherSdks": []
}
```

**底层操作：**
1. 读取 JSON 文件
2. 解析项目配置信息
3. 确定要分析的源代码路径：`tests/quickstart_demo/src`

### 步骤 3: 构建 Scene (核心！)

```javascript
let scene = new Scene_1.Scene();
scene.buildSceneFromProjectDir(config);
```

**这是最核心的步骤，内部发生了大量操作：**

#### 3.1 扫描源文件
```typescript
// Scene.ts 内部逻辑
private genArkFiles(): void {
    this.projectFiles.forEach(file => {
        const arkFile = new ArkFile(...);
        buildArkFileFromFile(file, ...);  // 解析文件
        this.setFile(arkFile);
    });
}
```

扫描到的文件：
- `index.ts`
- `models/book.ts`
- `services/bookService.ts`

#### 3.2 解析 TypeScript 源代码

使用 `ohos-typescript` 编译器解析每个文件：

```typescript
// ArkFileBuilder.ts 内部逻辑
export function buildArkFileFromFile(filePath, projectDir, arkFile, projectName) {
    // 1. 读取文件内容
    const sourceCode = fs.readFileSync(filePath, 'utf-8');

    // 2. 使用 TypeScript 编译器生成 AST
    const sourceFile = ts.createSourceFile(
        fileName,
        sourceCode,
        ts.ScriptTarget.ES2015,
        true
    );

    // 3. 遍历 AST 提取信息
    visitNode(sourceFile);
}
```

**AST (抽象语法树) 示例：**

对于 `book.ts` 中的代码：
```typescript
export namespace Library {
    export class Book {
        public title: string;
        public author: string;
    }
}
```

生成的 AST 结构类似：
```
SourceFile
└── ModuleDeclaration (Library)
    └── ClassDeclaration (Book)
        ├── PropertyDeclaration (title)
        └── PropertyDeclaration (author)
```

#### 3.3 构建 ArkFile、ArkClass、ArkMethod 等数据结构

```typescript
// 从 AST 中提取的信息转换为 ArkAnalyzer 的数据结构

ArkFile: "models/book.ts"
  └── ArkNamespace: "Library"
      └── ArkClass: "Book"
          ├── ArkField: "title" (type: string)
          ├── ArkField: "author" (type: string)
          └── ArkMethod: "constructor"
              └── ArkBody
                  └── CFG (控制流图)
```

#### 3.4 构建 CFG (Control Flow Graph - 控制流图)

对于每个方法，ArkAnalyzer 会构建 CFG：

```typescript
// BookService.addBook 方法
public addBook(book: Library.Book): void {
    this.books.push(book);
}
```

**转换为三地址码 IR (中间表示)：**
```
Block 0 (Entry):
  stmt 0: $temp0 = this
  stmt 1: $temp1 = $temp0.books
  stmt 2: $temp2 = parameter[0]  // book 参数
  stmt 3: $temp3 = $temp1.push($temp2)
  stmt 4: return undefined
```

**CFG 结构：**
```
┌─────────────────────┐
│  Entry Block        │
│  (5 statements)     │
└─────────────────────┘
          ↓
   (no branches)
          ↓
┌─────────────────────┐
│  Exit               │
└─────────────────────┘
```

这就是为什么运行结果显示：
```
addBook 方法的 CFG 基本块数量: 1
addBook 方法的 CFG 语句数量: 5
```

#### 3.5 建立依赖关系

```typescript
// Scene 内部维护多个映射表
private filesMap: Map<string, ArkFile>
private namespacesMap: Map<string, ArkNamespace>
private classesMap: Map<string, ArkClass>
private methodsMap: Map<string, ArkMethod>
```

### 步骤 4: 执行查询操作

当执行 `scene.getFiles()` 时：

```typescript
// Scene.ts
public getFiles(): ArkFile[] {
    return Array.from(this.filesMap.values());
}
```

**底层逻辑：**
1. 从内部的 `filesMap` (Map 数据结构) 中获取所有 ArkFile 对象
2. 转换为数组返回
3. 每个 ArkFile 包含文件的完整信息（类、方法、导入导出等）

### 步骤 5: 数据结构遍历

当执行 `files.map(file => file.getName())` 时：

```typescript
// 实际调用链
files[0].getName()
    ↓
ArkFile.getName()
    ↓
return this.name  // "index.ts"
```

## 三、内存中的数据结构

运行时，Scene 对象在内存中维护如下数据结构：

```
Scene {
  projectName: "QuickStartDemo"
  projectFiles: ["index.ts", "models/book.ts", "services/bookService.ts"]

  filesMap: Map {
    "index.ts" => ArkFile {
      name: "index.ts"
      classes: [DefaultClass]
      imports: [...]
      exports: [...]
    }
    "models/book.ts" => ArkFile {
      name: "models/book.ts"
      namespaces: [Library]
      classes: [DefaultClass]
    }
    "services/bookService.ts" => ArkFile {
      name: "services/bookService.ts"
      classes: [DefaultClass, BookService]
    }
  }

  namespacesMap: Map {
    "Library" => ArkNamespace {
      name: "Library"
      classes: [DefaultClass, Book]
    }
  }

  classesMap: Map {
    "Book" => ArkClass {
      name: "Book"
      fields: [title, author]
      methods: [constructor, %instInit, %statInit]
    }
    "BookService" => ArkClass {
      name: "BookService"
      fields: [books]
      methods: [addBook, getAllBooks, %instInit, %statInit]
    }
  }

  methodsMap: Map {
    "addBook" => ArkMethod {
      name: "addBook"
      parameters: [book]
      body: ArkBody {
        cfg: Cfg {
          blocks: [Block0]
          stmts: [5 statements]
        }
      }
    }
  }
}
```

## 四、关键技术点

### 1. TypeScript 编译器 API
ArkAnalyzer 使用 `ohos-typescript` (TypeScript 编译器的定制版本) 来：
- 解析 TypeScript 源代码
- 生成 AST (抽象语法树)
- 进行类型推断

### 2. 三地址码 IR (Intermediate Representation)
将复杂的 TypeScript 代码转换为简单的三地址码形式：
- 每条语句最多 3 个操作数
- 便于进行数据流分析
- 便于生成控制流图

### 3. 控制流图 (CFG)
- 基本块 (BasicBlock)：顺序执行的语句序列
- 边 (Edge)：控制流转移关系
- 用于数据流分析、死代码检测等

### 4. 数据结构索引
使用 Map 数据结构建立快速索引：
- 文件签名 -> ArkFile
- 类签名 -> ArkClass
- 方法签名 -> ArkMethod

## 五、性能特点

1. **延迟计算**：CFG 在首次访问时才构建
2. **缓存机制**：一旦构建完成，结果被缓存
3. **索引查询**：O(1) 时间复杂度查找文件、类、方法

## 六、总结

当你运行 `node tests/quickstart_demo/basicUsage.js` 时，实际上是：

1. **加载分析框架**：导入 ArkAnalyzer 核心模块
2. **解析源代码**：使用 TypeScript 编译器 API 生成 AST
3. **构建中间表示**：转换为 ArkAnalyzer 的 IR (ArkFile, ArkClass 等)
4. **生成控制流图**：为每个方法构建 CFG
5. **建立索引**：创建高效的查询数据结构
6. **执行查询**：快速访问分析结果

这个过程类似于编译器的前端工作，但目标是进行静态分析而非代码生成。
