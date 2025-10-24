# sig_programanalysis

English | [简体中文](./README.md)

## SIG Group Work Objectives and Scope

### Work Objectives

* Sig_programanalysis aims to carry out program analysis technology exploration, key technology identification, and competitiveness building for OpenHarmony systems and apps, striving to become the gathering place for OpenHarmony system and app analysis capabilities and an incubation place for related engineering tools.

* Sig_programanalysis will build a basic program analysis framework for OpenHarmony apps, and subsequently based on it to provide application developers with out-of-the-box defect scanning and analysis tools, making it possible to automatically vet code for scenarios such as IDE, CI/CD pipelines, etc.

### Work Scope

* Responsible for building and maintaining the key technology map of program analysis, as well as the decomposition of functional modules in the field, interface definition, and maintenance management.

* Responsible for the architecture design, open source development, and project maintenance of projects related to program analysis.


### Projects

Sig_programanalysis currently incubates the following projects. Everyone is welcome to participate (you can apply to participate in the co-construction of existing projects, or you can apply to create a new program analysis project).


* ArkAnalyzer:
The Static Analysis Framework for ArkTS-based OpenHarmony Apps.

* ArkCheck:
Checking OpenHarmony Apps for Potential Code-level Defects


## SIG Members


### Leader

- [lilicoding](https://gitee.com/lilicoding)


### Committers
- [kubigao](https://gitee.com/kubigao)
- [yifei-xue](https://gitee.com/yifei_xue)
- [kubrick-hjh](https://gitee.com/kubrick-hjh)
- [speed9](https://gitee.com/speeds)
- [bbsun](https://gitee.com/bbsun)
- [chn](https://gitee.com/chn)
- [Elouan](https://gitee.com/Elouan)
- [Rnine](https://gitee.com/Rnine)
- [workspace_cb](https://gitee.com/workspace_cb)
- [longyuC](https://gitee.com/longyuC)
- [xyji95](https://gitee.com/xyji95)
- [xulingyun-red](https://gitee.com/xulingyun-red)


### Meetings
 - Meeting Time: Bi-weekly meeting, Thursday 19:30 Beijing time
 - Meeting Application：[Link](https://shimo.im/forms/B1Awd60W7bU51g3m/fill)
 - Meeting Link: Welink or Others
 - Meeting Notification: [Subscribe to](https://lists.openatom.io/postorius/lists/dev.openharmony.io) mailing list dev@openharmony.io for the meeting link
 - Meeting Summary: [Archive link address](https://gitee.com/openharmony-sig/sig-content)

### Contact

- Mailing list: [dev@openharmony.io](https://lists.openatom.io/postorius/lists/dev@openharmony.io/)

*** 
# ArkAnalyzer: Static Program Analysis Framework for the ArkTS Language

## Quick Start

### Environment Setup
1. [Download Visual Studio Code](https://code.visualstudio.com/download) or other IDE.
2. [Download Node.js](https://nodejs.org/en/download/current) and install it. Node.js is a runtime environment for JavaScript with its own package manager, npm.
3. Install TypeScript via npm:
```shell
npm install -g typescript
```
4. Clone the repository and install dependencies:
```shell
git clone <repository-url>
cd arkanalyzer
npm install
```

### Run Demo

**Experience ArkAnalyzer features immediately:**

```shell
npm run demo
```

This will run a comprehensive demo showcasing:
- Basic features (files, classes, methods, CFG analysis)
- Call graph generation (CHA, RTA algorithms)
- Data flow analysis (Def-Use Chain, basic block analysis)

### Run Tests

```shell
npm test              # Watch mode
npm run testonce      # Run once
npm run coverage      # Generate coverage report
```

### Build Project

```shell
npm run build         # Development build → out/ directory
npm run prepack       # Production build → lib/ directory
```

## Project Structure

```
arkanalyzer/
├── src/                    # Source code
│   ├── callgraph/          # Call graph (CHA, RTA, PTA)
│   ├── core/               # Core IR and models
│   ├── save/               # Output and serialization
│   └── Scene.ts            # Main entry point
├── tests/                  # Tests and demos
│   ├── ex01-03/            # QuickStart demo
│   ├── ex01-advanced/      # Advanced usage demo
│   ├── ex04/               # ViewTree analysis demo
│   ├── resources/          # Test resources (35 subdirectories)
│   ├── unit/               # Unit tests (67 tests)
│   └── README.md           # Detailed test directory guide
├── out/                    # Development build output
├── docs/                   # Documentation
└── config/                 # Configuration files
```

For more details, see [tests/README.md](tests/README.md)

## Documentation

1. **Quick Start Guide**: [QuickStart.md](docs/QuickStart.md)
2. **API Documentation**: [API Reference](docs/api_docs/globals.md)
3. **Test Directory Guide**: [tests/README.md](tests/README.md)
4. **Demo Tutorial**: [tests/ex01-03/README.md](tests/ex01-03/README.md)

## Development Guide

### Generate API Documentation

```shell
npm run gendoc
```

Documentation will be generated in the `docs/api_docs` directory.

### Debug

Modify the `args` parameter array in the debug configuration file `.vscode/launch.json` to the path of the test file you want to debug, then start the debugging process.

### Add Test Cases

Place all new test code in the `tests/unit/` directory. Corresponding sample code and resource files should be placed in `tests/resources/`, creating different folders for each testing scenario.

For detailed instructions, see: [tests/README.md](tests/README.md)

## Contributing

Follow the OpenHarmony-SIG code repository standards. For instructions, refer to: [HowToCreatePR.md](docs/HowToCreatePR.md#english)

## Issue Reporting

For submitting issues, refer to: [HowToHandleIssues.md](docs/HowToHandleIssues.md)

## Core Features

ArkAnalyzer is a static program analysis framework for ArkTS (HarmonyOS native applications), supporting:

- ✅ **AST Parsing**: Analyze ArkTS source files (.ets) and generate Abstract Syntax Trees
- ✅ **Scene Building**: Build Scene data structure for code abstraction
- ✅ **CFG Generation**: Create Control Flow Graphs for each function
- ✅ **Call Graph Analysis**: Support for CHA, RTA, and PTA algorithms
- ✅ **Data Flow Analysis**: Def-Use Chain, reaching definitions, undefined variable detection
- ✅ **ViewTree Analysis**: HarmonyOS UI component analysis
- ✅ **Type Inference**: Complete type inference system
- ✅ **Code Generation**: CFG visualization, IR format output