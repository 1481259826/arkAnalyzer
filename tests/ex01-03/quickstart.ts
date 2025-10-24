import { Scene } from "../../out/src/Scene";
import { SceneConfig } from "../../out/src/Config";
import { ArkFile } from "../../out/src/core/model/ArkFile";
import { ArkClass } from "../../out/src/core/model/ArkClass";
import { ArkMethod } from "../../out/src/core/model/ArkMethod";
import { ArkNamespace } from "../../out/src/core/model/ArkNamespace";
import { ArkField } from "../../out/src/core/model/ArkField";
import { MethodSignature } from "../../out/src/core/model/ArkSignature";
import { CallGraph, CallGraphNode } from "../../out/src/callgraph/model/CallGraph";
import { CallGraphBuilder } from "../../out/src/callgraph/model/builder/CallGraphBuilder";

console.log("============================================================");
console.log("    ArkAnalyzer QuickStart 完整示例演示");
console.log("============================================================\n");

// ============================================================
// ex01: 基本功能演示
// ============================================================
console.log("========== ex01: 基本功能 ==========\n");

const configPath1 = "tests/ex01-03/config.json";
let config1: SceneConfig = new SceneConfig();
config1.buildFromJson(configPath1);
let scene1: Scene = new Scene();
scene1.buildSceneFromProjectDir(config1);

// ex01.1: 获取所有文件
console.log("ex01.1: 获取所有文件");
let files: ArkFile[] = scene1.getFiles();
let fileNames: string[] = files.map(file => file.getName());
console.log(fileNames);
console.log();

// ex01.2: 获取命名空间
console.log("ex01.2: 获取命名空间");
let namespaces: ArkNamespace[] = scene1.getNamespaces();
let namespaceNames: string[] = namespaces.map(ns => ns.getName());
console.log("命名空间:", namespaceNames);
console.log();

// ex01.3: 获取所有类
console.log("ex01.3: 获取所有类");
let classes: ArkClass[] = scene1.getClasses();
let classNames: string[] = classes.map(cls => cls.getName());
console.log("所有类:", classNames);
console.log();

// ex01.4: 获取所有属性
console.log("ex01.4: 获取类的属性");
let bookClass: ArkClass | undefined = classes.find(cls => cls.getName() === "Book");
if (bookClass) {
    let fields: ArkField[] = bookClass.getFields();
    let fieldNames: string[] = fields.map(fld => fld.getName());
    console.log("Book 类的属性:", fieldNames);
}
console.log();

// ex01.5: 获取所有方法
console.log("ex01.5: 获取类的方法");
let serviceClass: ArkClass | undefined = classes.find(cls => cls.getName() === "BookService");
if (serviceClass) {
    let methods: ArkMethod[] = serviceClass.getMethods();
    let methodNames: string[] = methods.map(mthd => mthd.getName());
    console.log("BookService 类的方法:", methodNames);
}
console.log();

// ex01.6: 获取方法 CFG
console.log("ex01.6: 获取方法的控制流图 (CFG)");
let methods1: ArkMethod[] = scene1.getMethods();
let addBookMethod = methods1.find(m => m.getName() === "addBook");
if (addBookMethod && addBookMethod.getBody()) {
    let cfg = addBookMethod.getBody().getCfg();
    console.log("addBook 方法:");
    console.log("  - CFG 基本块数量:", cfg.getBlocks().size);
    console.log("  - CFG 语句数量:", cfg.getStmts().length);
    console.log("  - 起始语句:", cfg.getStartingStmt()?.toString().substring(0, 50) + "...");
}
console.log();

// ============================================================
// ex02: 控制流分析 - 调用图生成
// ============================================================
console.log("\n========== ex02: 控制流分析 - 调用图生成 ==========\n");

const configPath2 = "tests/ex01-03/ex02_callgraph/config.json";
let config2: SceneConfig = new SceneConfig();
config2.buildFromJson(configPath2);
let scene2: Scene = new Scene();
scene2.buildSceneFromProjectDir(config2);

// 进行类型推导
console.log("正在进行类型推导...");
scene2.inferTypes();
console.log("类型推导完成\n");

// 获取 main 方法作为入口点
let files2 = scene2.getFiles();
let mainMethod: ArkMethod | undefined;
for (const file of files2) {
    const defaultClass = file.getDefaultClass();
    mainMethod = defaultClass.getMethods().find(m => m.getName() === "main");
    if (mainMethod) break;
}

if (mainMethod) {
    console.log("找到入口方法: main()\n");
    let methodSignature: MethodSignature = mainMethod.getSignature();
    let entryPoints: MethodSignature[] = [methodSignature];

    // ex02.1: CHA (Class Hierarchy Analysis)
    console.log("ex02.1: 使用 CHA 算法生成调用图");
    try {
        let callGraphCHA: CallGraph = new CallGraph(scene2);
        let cgBuilderCHA = new CallGraphBuilder(callGraphCHA, scene2);
        cgBuilderCHA.buildClassHierarchyCallGraph(entryPoints);

        console.log("CHA - 调用图中的节点数量:", callGraphCHA.getNodeNum());
        console.log("CHA - 调用图中的边数量:", callGraphCHA.getEdgeNum());

        console.log("CHA - 方法列表:");
        let nodeCount = 0;
        for (const node of callGraphCHA.nodesItor()) {
            const cgNode = node as CallGraphNode;
            console.log(`  ${++nodeCount}. ${cgNode.getMethod().toString()}`);
        }
    } catch (error) {
        console.log("CHA 调用图生成失败:", error);
    }
    console.log();

    // ex02.2: RTA (Rapid Type Analysis)
    console.log("ex02.2: 使用 RTA 算法生成调用图");
    try {
        let callGraphRTA = scene2.makeCallGraphRTA(entryPoints);
        console.log("RTA - 调用图中的节点数量:", callGraphRTA.getNodeNum());
        console.log("RTA - 调用图中的边数量:", callGraphRTA.getEdgeNum());

        console.log("RTA - 方法列表:");
        let nodeCount = 0;
        for (const node of callGraphRTA.nodesItor()) {
            const cgNode = node as CallGraphNode;
            console.log(`  ${++nodeCount}. ${cgNode.getMethod().toString()}`);
        }
    } catch (error) {
        console.log("RTA 调用图生成失败:", error);
    }
    console.log();
}

// ============================================================
// ex03: 函数内数据流分析
// ============================================================
console.log("\n========== ex03: 函数内数据流分析 ==========\n");

console.log("ex03.1: Def-Use Chain (定义-使用链)");
if (addBookMethod && addBookMethod.getBody()) {
    let cfg = addBookMethod.getBody().getCfg();
    cfg.buildDefUseChain();
    let chains = cfg.getDefUseChains();
    console.log("addBook 方法的 Def-Use Chain 数量:", chains.length);
    if (chains.length > 0) {
        console.log("示例 Def-Use Chain:");
        chains.slice(0, Math.min(3, chains.length)).forEach((chain, index) => {
            console.log(`  Chain ${index + 1}:`);
            console.log(`    值: ${chain.value}`);
            console.log(`    定义语句: ${chain.def.toString().substring(0, 50)}`);
            console.log(`    使用语句: ${chain.use.toString().substring(0, 50)}`);
        });
    }
}
console.log();

console.log("ex03.2: CFG 基本块分析");
if (addBookMethod && addBookMethod.getBody()) {
    let cfg = addBookMethod.getBody().getCfg();
    const blocks = cfg.getBlocks();
    console.log(`addBook 方法共有 ${blocks.size} 个基本块`);

    let blockIndex = 0;
    for (const block of blocks) {
        console.log(`  基本块 ${blockIndex}:`);
        console.log(`    语句数量: ${block.getStmts().length}`);
        console.log(`    前驱数量: ${block.getPredecessors().length}`);
        console.log(`    后继数量: ${block.getSuccessors().length}`);
        blockIndex++;
    }
}
console.log();

// ============================================================
// ex03.3: 规则检测示例
// ============================================================
console.log("ex03.3: 代码规则检测");
console.log("扫描项目中的所有方法...");
let totalMethods = 0;
let methodsWithBody = 0;
let totalStatements = 0;

for (const method of scene1.getMethods()) {
    totalMethods++;
    if (method.getBody()) {
        methodsWithBody++;
        const cfg = method.getBody().getCfg();
        totalStatements += cfg.getStmts().length;
    }
}

console.log(`统计信息:`);
console.log(`  - 总方法数: ${totalMethods}`);
console.log(`  - 有方法体的方法: ${methodsWithBody}`);
console.log(`  - 总语句数: ${totalStatements}`);
console.log();

// ============================================================
// 总结
// ============================================================
console.log("\n============================================================");
console.log("    演示完成！");
console.log("============================================================");
console.log("\n包含的示例:");
console.log("✓ ex01: 基本功能");
console.log("  - 获取文件、命名空间、类、方法、属性");
console.log("  - 查看 CFG 结构");
console.log("\n✓ ex02: 调用图生成");
console.log("  - CHA (Class Hierarchy Analysis)");
console.log("  - RTA (Rapid Type Analysis)");
console.log("\n✓ ex03: 数据流分析");
console.log("  - Def-Use Chain");
console.log("  - 基本块分析");
console.log("  - 代码统计");
console.log("\n更多高级功能请参考 docs/QuickStart.md\n");
