# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ArkAnalyzer is a static program analysis framework for ArkTS (HarmonyOS native applications). It analyzes ArkTS source files (.ets), generates Abstract Syntax Trees (AST), builds a Scene data structure for code abstraction, creates Control Flow Graphs (CFG) for each function, and supports call graph generation and data flow analysis.

## Build and Development Commands

### Build
```bash
npm run build
```
Compiles TypeScript files using `tsc`. Output goes to `lib/` directory for production builds or `out/` directory for development.

### Testing
```bash
# Run tests in watch mode
npm test

# Run tests once (non-interactive)
npm run testonce

# Generate coverage report
npm run coverage
```
Tests are located in `tests/unit/**/*.test.ts` and use Vitest as the test framework.

### Documentation
```bash
npm run gendoc
```
Generates API documentation using TypeDoc. Output is in `docs/api_docs/`.

### Production Build
```bash
npm run prepack
```
Builds production-ready version using `tsconfig.prod.json`.

## Architecture

### Core Data Structures

**Scene** (`src/Scene.ts`)
- Central data structure providing access to all analyzed code
- Contains files, classes, methods, fields, and namespaces
- Entry point for analysis: create via `SceneConfig` and JSON configuration
- Methods: `getFiles()`, `getClasses()`, `getMethods()`, `getNamespaces()`
- Supports three call graph algorithms: CHA, RTA, and PTA (Pointer Analysis)

**Configuration** (`src/Config.ts`)
- `SceneConfig`: Main configuration class built from JSON files
- JSON config requires: `targetProjectName`, `targetProjectDirectory`, SDK paths
- Example configs in `tests/resources/` subdirectories

**IR (Intermediate Representation)**
- Three-address code representation
- Temporary variables use `$temp` + number naming convention
- Loops (while, for, for-of, for-in) are converted to if-statements with code blocks
- Anonymous functions and syntactic sugar are desugared

### Module Structure

**src/core/model/** - Core model classes
- `ArkFile`: Represents source files
- `ArkClass`: Represents classes (including default `_DEFAULT_ARK_CLASS` for each file/namespace)
- `ArkMethod`: Represents methods (including default `_DEFAULT_ARK_METHOD`)
- `ArkField`: Represents class fields
- `ArkNamespace`: Represents namespaces
- `ArkExport`/`ArkImport`: Import/export handling
- `ArkSignature`: Signature types (File, Class, Method, Namespace)

**src/core/base/** - Base IR components
- `Stmt`: Statements
- `Expr`: Expressions
- `Local`: Local variables
- `Value`: Values
- `Type`: Type system
- `Ref`: References
- `Constant`: Constants
- `DefUseChain`: Def-use chain analysis

**src/core/graph/** - Graph structures
- `Cfg`: Control Flow Graph with basic blocks
- `BasicBlock`: CFG basic blocks
- `ViewTree`: View tree structure
- `DominanceFinder`/`DominanceTree`: Dominance analysis
- `DependsGraph`: Dependency graph
- `Scc`: Strongly connected components

**src/core/dataflow/** - Data flow analysis
- `DataflowProblem`/`DataflowSolver`: Generic dataflow framework
- `ReachingDef`: Reaching definitions analysis
- `UndefinedVariable`: Null pointer / undefined variable detection
- `GenericDataFlow`: Generic dataflow implementation

**src/callgraph/** - Call graph construction
- `algorithm/`: CHA, RTA, and abstract analysis base
- `model/CallGraph`: Call graph representation
- `pointerAnalysis/`: Pointer analysis (PTA) implementation
  - `PointerAnalysis`: Main pointer analysis engine
  - `Pag`: Pointer Assignment Graph
  - `plugins/`: Analysis plugins (Function, Container, SDK, Worker, TaskPool, Storage)
  - `context/`: Context-sensitive analysis support

**src/core/common/** - Common utilities
- `TypeInference`: Type inference engine
- `IRInference`: IR-level inference
- `ArkIRTransformer`: IR transformation
- `ModelUtils`: Model manipulation utilities
- `ValueUtil`: Value utilities
- `Builtin`: Built-in function handling
- `SdkUtils`: HarmonyOS SDK utilities

**src/VFG/** - Value Flow Graph
- `DVFG`: Dense Value Flow Graph
- `builder/DVFGBuilder`: VFG construction

**src/save/** - Output and serialization
- `PrinterBuilder`: CFG visualization (generates .dot files for Graphviz)
- Various printers for different output formats

## Key Workflows

### Basic Usage Pattern
```typescript
// 1. Create config from JSON
let config: SceneConfig = new SceneConfig();
config.buildFromJson("path/to/config.json");

// 2. Build scene
let scene: Scene = new Scene(config);

// 3. Access model elements
let files: ArkFile[] = scene.getFiles();
let classes: ArkClass[] = scene.getClasses();
let methods: ArkMethod[] = scene.getMethods();

// 4. Get CFG for a method
let cfg: Cfg = method.getBody().getCfg();
```

### Call Graph Generation
```typescript
// Type inference required before call graph construction
scene.inferTypes();

// Specify entry points
let entryPoints: MethodSignature[] = [method.getSignature()];

// Generate call graph using one of three algorithms:
let callGraph = scene.makeCallGraphCHA(entryPoints);  // Class Hierarchy Analysis
let callGraph = scene.makeCallGraphRTA(entryPoints);  // Rapid Type Analysis
let callGraph = scene.makeCallGraphVPA(entryPoints);  // Pointer Analysis (most precise)
```

### Data Flow Analysis
```typescript
// Build def-use chains
cfg.buildDefUseChain();
const chains = cfg.getDefUseChains();

// SSA transformation
scene.inferTypes();
let ssa = new StaticSingleAssignmentFormer();
ssa.transformBody(method.getBody());
```

### CFG Visualization
```typescript
let printer = new PrinterBuilder();
printer.dumpToDot(arkFile);  // Generates .dot file for Graphviz
```

## Default Elements

ArkAnalyzer creates default elements for organizational purposes:
- Each file and namespace gets a `_DEFAULT_ARK_CLASS`
- Each file and namespace gets a `_DEFAULT_ARK_METHOD`
- Top-level code in files is placed in these default containers

## Testing Best Practices

- Test code goes in `tests/unit/**/*.test.ts`
- Test resources (sample projects, configs) go in `tests/resources/`
- Each test scenario should have its own subfolder in `tests/resources/`
- Use JSON config files to set up test projects (see examples in `tests/resources/`)

## Important Implementation Details

- This codebase analyzes ArkTS (HarmonyOS TypeScript) and TypeScript code
- Supports OpenHarmony SDK integration via configuration
- Loops are desugared into conditional jumps in the IR
- Anonymous functions are converted to named functions with `AnonymousFunc$desugaring$N` naming
- Type inference (`scene.inferTypes()`) must be called before many analysis operations
- The framework uses `ohos-typescript` (bundled dependency) as the TypeScript compiler base
