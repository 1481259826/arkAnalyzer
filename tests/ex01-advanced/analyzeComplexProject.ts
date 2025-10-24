import { SceneConfig } from '../../out/src/Config';
import { Scene } from '../../out/src/Scene';
import { ArkFile } from '../../out/src/core/model/ArkFile';
import { ArkNamespace } from '../../out/src/core/model/ArkNamespace';
import { ArkClass } from '../../out/src/core/model/ArkClass';
import { ArkField } from '../../out/src/core/model/ArkField';
import { ArkMethod } from '../../out/src/core/model/ArkMethod';
import { MethodParameter } from '../../out/src/core/model/builder/ArkMethodBuilder';
import { Cfg } from '../../out/src/core/graph/Cfg';
import { Local } from '../../out/src/core/base/Local';
import { Type } from '../../out/src/core/base/Type';
import { ClassSignature } from '../../out/src/core/model/ArkSignature';
import { MethodSignature } from '../../out/src/core/model/ArkSignature';
import { DotMethodPrinter } from '../../out/src/save/DotPrinter';
import { PrinterBuilder } from '../../out/src/save/PrinterBuilder';
import { join } from 'path';

const projectRoot = join(process.cwd(), 'tests/resources/advancedUsage/complexProject');
const configPath = join(projectRoot, 'config.json');

console.log('=== ArkAnalyzer 高级用法示例 ===\n');
console.log('项目路径:', projectRoot);
console.log('配置文件:', configPath);
console.log();

// 初始化场景
let config: SceneConfig = new SceneConfig();
config.buildFromJson(configPath);
let scene: Scene = new Scene();
scene.buildSceneFromProjectDir(config);
scene.inferTypes();

console.log('✓ 场景构建完成\n');

// ==================== 基础查询 ====================

// ex01: 获取所有文件及其导入信息
console.log('\n=== Ex01: 文件及导入分析 ===');
let files: ArkFile[] = scene.getFiles();
let fileNames: string[] = files.map((file) => file.getName());
console.log('所有文件:', fileNames);

files.forEach(file => {
    let imports = file.getImportInfos();
    console.log(`文件 ${file.getName()} 的导入:`, imports.length);
});

// ex02: 获取所有命名空间及其包含的类
console.log('\n=== Ex02: 命名空间及类统计 ===');
let namespaces: ArkNamespace[] = scene.getNamespaces();
namespaces.forEach(ns => {
    let classes = ns.getClasses();
    let methods: ArkMethod[] = []; // Namespace methods not directly accessible
    console.log(`命名空间 ${ns.getName()}: ${classes.length} 个类, ${methods.length} 个方法`);
});

// ex03: 获取所有类及其继承关系
console.log('\n=== Ex03: 类及继承关系 ===');
let classes: ArkClass[] = scene.getClasses();
classes.forEach(cls => {
    let superClass = cls.getSuperClass();
    let interfaceNames = cls.getImplementedInterfaceNames();
    console.log(`类 ${cls.getName()}:`);
    console.log(`  父类: ${superClass ? superClass.getName() : 'Object'}`);
    console.log(`  接口: ${interfaceNames.join(', ') || '无'}`);
    console.log(`  是否抽象: ${cls.isAbstract()}`);
});

// ex04: 分析特定类的所有字段
console.log('\n=== Ex04: BookService 类字段分析 ===');
let bookServiceClass: ArkClass | undefined = classes.find(cls => cls.getName() === 'BookService');
if (bookServiceClass) {
    let fields: ArkField[] = bookServiceClass.getFields();
    fields.forEach(field => {
        let fieldType: Type | undefined = field.getType();
        console.log(`字段: ${field.getName()}`);
        console.log(`  类型: ${fieldType?.toString() || 'unknown'}`);
        console.log(`  修饰符: static=${field.isStatic()}, private=${field.isPrivate()}, readonly=${field.isReadonly()}`);
    });
}

// ex05: 分析特定类的所有方法及参数
console.log('\n=== Ex05: BookService 类方法分析 ===');
if (bookServiceClass) {
    let methods: ArkMethod[] = bookServiceClass.getMethods();
    methods.forEach(method => {
        let params: MethodParameter[] = method.getParameters();
        let returnType: Type | undefined = method.getReturnType();
        let signature: MethodSignature = method.getSignature();

        console.log(`\n方法: ${method.getName()}`);
        console.log(`  签名: ${signature.toString()}`);
        console.log(`  参数数量: ${params.length}`);
        params.forEach((param, idx) => {
            console.log(`    参数${idx}: ${param.getName()}: ${param.getType()?.toString() || 'any'}`);
        });
        console.log(`  返回类型: ${returnType?.toString() || 'void'}`);
        console.log(`  修饰符: static=${method.isStatic()}, private=${method.isPrivate()}`);
    });
}

// ex06: 分析方法体的局部变量和 CFG
console.log('\n=== Ex06: searchBooks 方法详细分析 ===');
let searchMethod: ArkMethod | undefined = bookServiceClass?.getMethodWithName('searchBooks');
if (searchMethod) {
    let body = searchMethod.getBody();
    if (body) {
        // 局部变量
        let localsMap = body.getLocals();
        let locals: Local[] = Array.from(localsMap.values());
        console.log('局部变量:');
        locals.forEach(local => {
            console.log(`  ${local.getName()}: ${local.getType()?.toString() || 'unknown'}`);
        });

        // CFG 信息
        let cfg: Cfg | undefined = body.getCfg();
        if (cfg) {
            let blocks = cfg.getBlocks();
            let stmts = cfg.getStmts();
            console.log(`CFG 统计:`);
            console.log(`  基本块数: ${blocks.size}`);
            console.log(`  语句数: ${stmts.length}`);

            // 导出 CFG
            let dotPrinter = new DotMethodPrinter(searchMethod);
            PrinterBuilder.dump(dotPrinter, 'out/searchBooks_cfg.dot');
            console.log('  已导出 CFG 到: out/searchBooks_cfg.dot');
        }
    }
}

// ex07: 按条件查找方法
console.log('\n=== Ex07: 查找所有静态方法 ===');
let allMethods: ArkMethod[] = scene.getMethods();
let staticMethods: ArkMethod[] = allMethods.filter(m => m.isStatic());
console.log(`找到 ${staticMethods.length} 个静态方法:`);
staticMethods.forEach(method => {
    let declaringClass = method.getDeclaringArkClass();
    console.log(`  ${declaringClass.getName()}.${method.getName()}`);
});

// ex08: 查找所有返回 Promise 的方法
console.log('\n=== Ex08: 查找所有返回 Promise 的方法 ===');
let asyncMethods: ArkMethod[] = allMethods.filter(m => {
    let returnType = m.getReturnType();
    return returnType?.toString().includes('Promise');
});
console.log(`找到 ${asyncMethods.length} 个方法:`);
asyncMethods.forEach(method => {
    let declaringClass = method.getDeclaringArkClass();
    let returnType = method.getReturnType();
    console.log(`  ${declaringClass.getName()}.${method.getName()}: ${returnType?.toString() || 'void'}`);
});

// ex09: 查找带有特定返回类型的方法
console.log('\n=== Ex09: 查找返回 Promise<boolean> 的方法 ===');
let promiseBoolMethods: ArkMethod[] = allMethods.filter(m => {
    let returnType = m.getReturnType();
    return returnType?.toString().includes('Promise') && returnType?.toString().includes('boolean');
});
console.log(`找到 ${promiseBoolMethods.length} 个方法:`);
promiseBoolMethods.forEach(method => {
    let declaringClass = method.getDeclaringArkClass();
    console.log(`  ${declaringClass.getName()}.${method.getName()}`);
});

// ex10: 统计代码复杂度
console.log('\n=== Ex10: 代码复杂度统计 ===');
let totalClasses = classes.length;
let totalMethods = allMethods.length;
let totalFields = 0;
let totalStatements = 0;

classes.forEach(cls => {
    totalFields += cls.getFields().length;
});

allMethods.forEach(method => {
    let body = method.getBody();
    if (body && body.getCfg()) {
        totalStatements += body.getCfg()!.getStmts().length;
    }
});

console.log(`总体统计:`);
console.log(`  类: ${totalClasses}`);
console.log(`  方法: ${totalMethods}`);
console.log(`  字段: ${totalFields}`);
console.log(`  语句: ${totalStatements}`);
console.log(`  平均每个类的方法数: ${(totalMethods / totalClasses).toFixed(2)}`);
console.log(`  平均每个方法的语句数: ${(totalStatements / totalMethods).toFixed(2)}`);

// ex11: 分析类的详细信息
console.log('\n=== Ex11: User 类详细分析 ===');
let userClass: ArkClass | undefined = classes.find(cls => cls.getName() === 'User');
if (userClass) {
    let signature: ClassSignature = userClass.getSignature();
    console.log(`类签名: ${signature.toString()}`);
    console.log(`类修饰符: abstract=${userClass.isAbstract()}`);

    // 字段统计
    let allFields = userClass.getFields();
    let privateFields = allFields.filter(f => f.isPrivate());
    let staticFields = allFields.filter(f => f.isStatic());
    let readonlyFields = allFields.filter(f => f.isReadonly());

    console.log(`字段统计:`);
    console.log(`  总数: ${allFields.length}`);
    console.log(`  私有: ${privateFields.length}`);
    console.log(`  静态: ${staticFields.length}`);
    console.log(`  只读: ${readonlyFields.length}`);

    // 方法统计
    let allMethods = userClass.getMethods();
    let publicMethods = allMethods.filter(m => m.isPublic());
    let privateMethods = allMethods.filter(m => m.isPrivate());

    console.log(`方法统计:`);
    console.log(`  总数: ${allMethods.length}`);
    console.log(`  公有: ${publicMethods.length}`);
    console.log(`  私有: ${privateMethods.length}`);
}

// ex12: 批量导出多个类的方法 CFG
console.log('\n=== Ex12: 批量导出 CFG ===');
let classesToExport = ['BookService', 'UserManager', 'OrderService'];
let exportCount = 0;

classesToExport.forEach(className => {
    let targetClass = classes.find(cls => cls.getName() === className);
    if (targetClass) {
        let methods = targetClass.getMethods();
        methods.forEach(method => {
            let body = method.getBody();
            if (body && body.getCfg()) {
                let dotPrinter = new DotMethodPrinter(method);
                let outputPath = `out/cfg/${className}_${method.getName()}_cfg.dot`;
                try {
                    PrinterBuilder.dump(dotPrinter, outputPath);
                    exportCount++;
                } catch (error) {
                    console.error(`导出失败: ${outputPath}`);
                }
            }
        });
    }
});
console.log(`成功导出 ${exportCount} 个 CFG 文件到 out/cfg/ 目录`);

// ex13: 查找特定模式的方法（多条件）
console.log('\n=== Ex13: 查找公有且带参数的方法 ===');
let publicMethodsWithParams = allMethods.filter(m =>
    m.isPublic() && m.getParameters().length > 0
);
console.log(`找到 ${publicMethodsWithParams.length} 个方法:`);

// 修复：提前提取所需数据，避免在循环中调用可能有副作用的方法
let methodsToDisplay = publicMethodsWithParams.slice(0, 5).map(method => {
    try {
        const declaringClass = method.getDeclaringArkClass();
        const className = declaringClass ? declaringClass.getName() : 'Unknown';
        const methodName = method.getName();
        const paramCount = method.getParameters().length;
        return { className, methodName, paramCount };
    } catch (error) {
        console.error('Error processing method:', error);
        return null;
    }
}).filter(item => item !== null);

// 输出处理后的数据
methodsToDisplay.forEach(item => {
    console.log(`  ${item.className}.${item.methodName} (${item.paramCount} 个参数)`);
});

// ex14: 分析文件之间的依赖关系
console.log('\n=== Ex14: 文件依赖关系 ===');
files.forEach(file => {
    let imports = file.getImportInfos();
    if (imports.length > 0) {
        console.log(`${file.getName()} 依赖于:`);
        imports.forEach(importInfo => {
            console.log(`  - ${importInfo.getImportClauseName()}`);
        });
    }
});

console.log('\n=== 分析完成 ===');
