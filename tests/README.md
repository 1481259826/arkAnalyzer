# ArkAnalyzer Tests Directory

This directory contains all tests, demos, and test resources for the ArkAnalyzer project.

## Directory Structure

```
tests/
├── ex01-03/           # QuickStart demos (examples 01-03)
├── ex01-advanced/     # Advanced API usage demos
├── ex04/              # ViewTree analysis demo
├── resources/         # Test data for unit tests (35 subdirectories)
├── samples/           # Legacy sample/demo code (for reference)
└── unit/              # Unit tests (67 test files using Vitest)
```

---

## 📚 Demo Directories

### ex01-03/ - QuickStart Tutorial

**Purpose**: Comprehensive demonstration of ArkAnalyzer's basic features

**Main File**: `quickstart.ts`

**Run**: `npm run demo`

**Features**:
- ex01: Basic functionality (files, classes, methods, fields, CFG)
- ex02: Call graph generation (CHA, RTA algorithms)
- ex03: Data flow analysis (Def-Use Chain, basic blocks)

**Test Projects**:
- `src/` - Book management system sample project
- `ex02_callgraph/` - Call graph demonstration project

**Documentation**: See `README.md` and `README_LOGIC.md` in the directory

---

### ex01-advanced/ - Advanced API Usage

**Purpose**: Demonstrates 14 advanced use cases

**Main File**: `analyzeComplexProject.ts`

**Test Project**: Uses `resources/advancedUsage/complexProject/`

**Features**:
1. Field analysis and access modifiers
2. Method introspection and signature analysis
3. CFG export and visualization
4. Type system queries
5. Namespace and module analysis
6. Batch processing and filtering
7. ... and 8 more advanced scenarios

---

### ex04/ - ViewTree Analysis

**Purpose**: Demonstrates HarmonyOS UI component analysis

**Main File**: `testCountDown.ts`

**Test Project**: Uses `resources/CountDown/` (.ets files)

**Features**:
- UI component tree analysis
- Custom component recognition
- @State decorator tracking
- ViewTree visualization

---

## 🧪 Unit Tests (tests/unit/)

**67 unit test files** using Vitest framework

### Test Categories:

| Category | Files | Description |
|----------|-------|-------------|
| **Core** (root) | 31 | Scene, CFG, type inference, SSA, exports |
| **cg/** | 2 | Call graph algorithms (CHA, RTA) |
| **concurrent/** | 3 | Worker, TaskPool, SDK concurrency |
| **core/graph/** | 3 | CFG, SCC, dependency graphs |
| **core/model/** | 7 | ArkFile, ArkClass, ArkMethod, ArkField |
| **pta/** | 5 | Pointer analysis (containers, exports) |
| **save/** | 16 | Code generation and IR printing |

### Running Tests:

```bash
npm test              # Watch mode
npm run testonce      # Run once
npm run coverage      # Generate coverage report
```

---

## 📦 Test Resources (tests/resources/)

**35 subdirectories** containing test data (not executable tests)

### Major Categories:

| Directory | Files | Purpose |
|-----------|-------|---------|
| **viewtree/** | 50 | ViewTree tests (largest category) |
| **pta/** | 36 | Pointer analysis test cases |
| **callgraph/** | 31 | Call graph tests (CHA, RTA, recursion) |
| **Sdk/** | 31 | HarmonyOS SDK type definitions |
| **arkIRTransformer/** | 27 | IR transformation tests |
| **save/** | 23 | Output format tests |
| **exports/** | 19 | Import/export handling |
| **model/** | 17 | Model construction tests |
| **cfg/** | 15 | Control flow graph tests |
| ... | ... | 26 more directories (1-12 files each) |

Each resource directory contains test data referenced by unit tests.

---

## 🗂️ Samples Directory (tests/samples/)

**Legacy demo files** - 28 standalone executable scripts

**Note**: These files are older demo code, most functionality has been migrated to:
- Unit tests (`tests/unit/`)
- Demo files (`tests/ex01-03/`, `tests/ex01-advanced/`, `tests/ex04/`)

Kept for reference and backwards compatibility.

---

## 📊 Demo → Resource Mapping

| Demo File | Uses Resource | Purpose |
|-----------|---------------|---------|
| ex01-03/quickstart.ts | ex01-03/src/ | Book management system |
| ex01-03/quickstart.ts | ex01-03/ex02_callgraph/ | Call graph demo |
| ex01-advanced/analyzeComplexProject.ts | resources/advancedUsage/ | Advanced API demo |
| ex04/testCountDown.ts | resources/CountDown/ | ViewTree/UI analysis |

---

## 🚀 Quick Start

### Run QuickStart Demo:
```bash
npm run demo
```

### Run Unit Tests:
```bash
npm test
```

### Generate API Documentation:
```bash
npm run gendoc
```

---

## 📝 Statistics

- **Total Directories**: 246
- **Total Files**: 504
- **Unit Tests**: 67 test files (.test.ts)
- **Test Resources**: 321 TypeScript/ArkTS files
- **Demo Files**: 8 demo scripts

---

## 🔧 For Contributors

When adding new tests:

1. **Unit tests** → Add to `tests/unit/`
2. **Test data** → Add to `tests/resources/{category}/`
3. **Demos** → Consider adding to existing `ex01-03/` or creating new `ex05/`

Ensure all new test resources have corresponding configuration JSON files.

---

## 📖 Related Documentation

- [Main README](../README.md) - Project overview
- [QuickStart Guide](ex01-03/README.md) - Detailed tutorial
- [API Documentation](../docs/api_docs/) - Generated API docs
