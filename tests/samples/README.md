# ArkAnalyzer Samples Directory

## ⚠️ Legacy Demo Code

This directory contains **28 legacy demo files** that were created during earlier development of ArkAnalyzer.

### Current Status

These files are **standalone executable scripts** (not Vitest tests) that demonstrate various features of ArkAnalyzer. Most of their functionality has been migrated to:

1. **Unit Tests** (`tests/unit/`) - Proper Vitest-based tests
2. **Demo Files** - Modern demo scripts in:
   - `tests/ex01-03/quickstart.ts` - QuickStart tutorial
   - `tests/ex01-advanced/analyzeComplexProject.ts` - Advanced usage
   - `tests/ex04/testCountDown.ts` - ViewTree analysis

### Files in This Directory

| File | Purpose | Modern Equivalent |
|------|---------|-------------------|
| AppTest.ts | App analysis demo | tests/unit/ various tests |
| ArkIRTransformerTest.ts | IR transformation demo | tests/unit/ArkIRTransformer.test.ts |
| CallGraphTest.ts | Call graph demo | tests/unit/cg/ + ex01-03/quickstart.ts |
| CfgBuilderTest.ts | CFG building demo | tests/unit/Cfg.test.ts |
| CfgTest.ts | CFG demo | tests/unit/Cfg.test.ts |
| DefUseChainTest.ts | Def-use chain demo | tests/unit/DefUseChain.test.ts |
| DependencyTest.ts | Dependency analysis demo | tests/unit/Dependency.test.ts |
| DummyMainTest.ts | Dummy main demo | tests/unit/DummyMain.test.ts |
| IFDStest.ts | IFDS framework demo | tests/unit/UndefinedVariable.test.ts |
| PointerAnalysisTest.ts | Pointer analysis demo | tests/unit/pta/ + ex01-03/quickstart.ts |
| ReachingDefTest.ts | Reaching definitions demo | tests/unit/ReachingDef.test.ts |
| SceneTest.ts | Scene building demo | tests/unit/BuildScene.test.ts |
| TypeInferenceTest.ts | Type inference demo | tests/unit/TypeInference.test.ts |
| ... | ... | ... |

### Why Keep This Directory?

1. **Historical Reference** - Shows evolution of the framework
2. **Backwards Compatibility** - Some external tools may reference these files
3. **Alternative Examples** - Different usage patterns than modern tests
4. **Git History** - Part of version control history

### Recommended Usage

For **new development** and **learning**, use:
- `npm run demo` - QuickStart tutorial
- `npm test` - Unit tests
- Modern demo files in `tests/ex01-03/`, `tests/ex01-advanced/`, `tests/ex04/`

These legacy files are kept **for reference only** and may not be actively maintained.

---

## How to Run (if needed)

These are standalone TypeScript files that can be run directly:

```bash
# Build the project first
npm run build

# Run a sample file
npx ts-node tests/samples/SceneTest.ts
```

However, most users should use the modern demo files instead:

```bash
npm run demo
```

---

## Maintenance Note

If you're maintaining this project:
- These files are **tracked in git**
- Consider them **read-only** for reference
- New features should be added to `tests/unit/` or demo files
- If a sample file is no longer relevant, document it rather than delete it

---

## See Also

- [tests/README.md](../README.md) - Main test directory documentation
- [tests/ex01-03/README.md](../ex01-03/README.md) - QuickStart tutorial
- [tests/unit/](../unit/) - Modern unit tests
