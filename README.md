# sig_programanalysis

简体中文 | [English](./README.en.md)

说明：本SIG的内容遵循OpenHarmony的PMC管理章程 [README](../../zh/pmc.md)中描述的约定。


## SIG组工作目标和范围

  

### 工作目标

* 程序分析-SIG（Sig_programanalysis） 旨在面向OpenHarmony系统和原生应用开展程序分析技术洞察、关键技术识别和竞争力构建，同时成为OpenHarmony系统和应用程序分析能力的聚集地和相关工程工具的孵化地。

* 程序分析-SIG（Sig_programanalysis）将面向OpenHarmony应用构建基础程序分析框架并基于此为应用开发者提供开箱即用的缺陷扫描分析工具，面向IDE、流水线门禁、应用市场上架审核等场景，打造自动化工具看护能力。

### 工作范围

* 负责程序分析子领域关键根技术地图梳理，以及领域内功能模块分解、接口定义与维护管理等工作。

* 负责程序分析子领域相关项目的架构设计、开源开发和项目维护等工作。


### 项目孵化

程序分析-SIG（Sig_programanalysis）正积极孵化如下项目，欢迎大家参与共享共建（可申请参与已有项目的共建，也可申请创建新的程序分析项目并联合社区启动开源共建）。


* 方舟分析器（ArkAnalyzer）:
	面向ArkTS的OpenHarmony应用程序分析框架。

* 方舟检测器（ArkCheck）:
	面向OpenHarmony应用开发提供代码级缺陷自动检测（I期聚焦高性能编码规则的自动化检测）



## SIG组成员


### Leader

- [lilicoding](https://gitcode.com/lilicoding)


### Committers列表
- [kubigao](https://gitcode.com/kubigao)
- [yifei-xue](https://gitcode.com/yifei-xue)
- [kubrick-hjh](https://gitcode.com/kubrick-hjh)
- [speed9](https://gitee.com/speeds)
- [bbsun](https://gitcode.com/bbsun)
- [chn](https://gitcode.com/chn)
- [Elouan](https://gitcode.com/Elouan)
- [Rnine](https://gitcode.com/Rnine1)
- [workspace_cb](https://gitee.com/workspace_cb)
- [longyuC](https://gitee.com/longyuC)
- [xyji95](https://gitcode.com/xyji95)
- [xulingyun](https://gitcode.com/muya318)


### 会议
 - 会议时间：双周例会，周四晚上19:00, UTC+8
 - 会议申报：[申报链接](https://shimo.im/forms/B1Awd60W7bU51g3m/fill)
 - 会议链接：Welink或其他会议
 - 会议通知：请[订阅](https://lists.openatom.io/postorius/lists/dev.openharmony.io)邮件列表 dev@openharmony.io 获取会议链接
 - 会议纪要：[归档链接地址](https://gitee.com/openharmony-sig/sig-content)


### Contact (optional)

- 邮件列表：[dev@openharmony.io](https://lists.openatom.io/postorius/lists/dev@openharmony.io/)

***

# 方舟分析器：面向ArkTS语言的静态程序分析框架

## 快速开始

### 环境配置
1. 从[Download Visual Studio Code](https://code.visualstudio.com/download)下载vscode并安装，或安装其他IDE。
2. 从[Download Node.js](https://nodejs.org/en/download/current)下载Node.js并安装，Node.js为JavaScript的运行时环境，自带包管理器npm。
3. 通过npm安装TypeScript编译器，命令行输入
```shell
npm install -g typescript
```
4. 克隆仓库并安装依赖
```shell
git clone <repository-url>
cd arkanalyzer
npm install
```

### 运行演示

**立即体验 ArkAnalyzer 的功能：**

```shell
npm run demo
```

这将运行完整的功能演示，包括：
- 基本功能（文件、类、方法、CFG分析）
- 调用图生成（CHA、RTA算法）
- 数据流分析（Def-Use Chain、基本块分析）

### 运行测试

```shell
npm test              # 监听模式
npm run testonce      # 单次运行
npm run coverage      # 生成覆盖率报告
```

### 构建项目

```shell
npm run build         # 开发构建 → out/ 目录
npm run prepack       # 生产构建 → lib/ 目录
```

## 项目结构

```
arkanalyzer/
├── src/                    # 源代码
│   ├── callgraph/          # 调用图（CHA, RTA, PTA）
│   ├── core/               # 核心IR和模型
│   ├── save/               # 输出和序列化
│   └── Scene.ts            # 主入口
├── tests/                  # 测试和演示
│   ├── ex01-03/            # QuickStart 演示
│   ├── ex01-advanced/      # 高级用法演示
│   ├── ex04/               # ViewTree 分析演示
│   ├── resources/          # 测试资源（35个子目录）
│   ├── unit/               # 单元测试（67个测试）
│   └── README.md           # 详细的测试目录说明
├── out/                    # 开发构建输出
├── docs/                   # 文档
└── config/                 # 配置文件
```

更多详细信息请参考 [tests/README.md](tests/README.md)

## 文档

1. **快速入门指南**：[QuickStart.md](docs/QuickStart.md)
2. **API 文档**：[API Reference](docs/api_docs/globals.md)
3. **测试目录说明**：[tests/README.md](tests/README.md)
4. **演示教程**：[tests/ex01-03/README.md](tests/ex01-03/README.md)

## 开发指南

### 生成 API 文档

```shell
npm run gendoc
```

文档将生成在 `docs/api_docs` 目录。

### 调试

将调试配置文件`.vscode/launch.json`中`args`参数数组修改为想要调试的文件路径，然后启动调试。

### 添加测试用例

新增测试代码统一放至 `tests/unit/` 目录下，对应的样例代码和其他资源文件统一放至 `tests/resources/`，按测试场景创建不同文件夹。

详细说明请参考：[tests/README.md](tests/README.md)

## 代码贡献

遵守 OpenHarmony-SIG 代码上库规范，操作方法请参考：[HowToCreatePR.md](docs/HowToCreatePR.md#中文)

## 问题反馈

请参考[链接](docs/HowToHandleIssues.md)提交 Issues。

## 核心功能

ArkAnalyzer 是一个面向 ArkTS（HarmonyOS 原生应用）的静态程序分析框架，支持：

- ✅ **AST 解析**：分析 ArkTS 源文件（.ets），生成抽象语法树
- ✅ **Scene 构建**：构建代码抽象的 Scene 数据结构
- ✅ **CFG 生成**：为每个函数创建控制流图
- ✅ **调用图分析**：支持 CHA、RTA、PTA 三种算法
- ✅ **数据流分析**：Def-Use Chain、到达定义分析、未定义变量检测
- ✅ **ViewTree 分析**：HarmonyOS UI 组件分析
- ✅ **类型推断**：完整的类型推断系统
- ✅ **代码生成**：CFG 可视化、IR 格式输出
