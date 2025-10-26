import { ArkField } from '../../out/src/core/model/ArkField';
import { ClassSignature } from '../../out/src/core/model/ArkSignature';
import { Decorator } from '../../out/src/core/base/Decorator';
import { PrinterBuilder } from '../../out/src/save/PrinterBuilder';
import { Scene } from '../../out/src/Scene';
import { SceneConfig } from '../../out/src/Config';
import { ViewTreePrinter } from '../../out/src/save/ViewTreePrinter';
import { join } from 'path';

function field2str(field: ArkField): string {
    let decorators = field
        .getStateDecorators()
        .map((value) => `@${value.getContent()}`)
        .join(', ');
    return `${decorators} ${field.getName()}`;
}

console.log('Starting Simple Demo ViewTree Test...\n');

// Use absolute path from project root
const configPath = join(process.cwd(), 'tests/resources/SimpleDemo/arkanalyzer_config.json');
console.log('Config path:', configPath);

let config: SceneConfig = new SceneConfig();
config.buildFromJson(configPath);
let scene: Scene = new Scene();

console.log('Building scene from project directory...');
scene.buildSceneFromProjectDir(config);

console.log('Inferring types...');
scene.inferTypes();

// 读取 Page 组件 ViewTree
console.log('\nSearching for Page.ets file...');
let arkFile = scene.getFiles().find((file) => file.getName().endsWith('Page.ets'));

if (!arkFile) {
    console.error('Page.ets file not found!');
    console.log('Available files:', scene.getFiles().map(f => f.getName()));
    process.exit(1);
}

console.log('Found Page.ets, getting Page class...');
let arkClass = arkFile?.getClassWithName('Page');

if (!arkClass) {
    console.error('Page class not found!');
    console.log('Available classes:', arkFile.getClasses().map(c => c.getName()));
    process.exit(1);
}

console.log('Getting ViewTree...');
let vt = arkClass?.getViewTree();

if (!vt) {
    console.error('ViewTree not found for Page class!');
    process.exit(1);
}

// 从根节点遍历 UI 组件，找到外部导入的组件
console.log('\nTraversing ViewTree to find imported components...\n');
let root = vt?.getRoot();
let cityFound = false;
let renameFound = false;

root?.walk((item) => {
    // 自定义组件
    if (item.isCustomComponent() && item.signature instanceof ClassSignature) {
        const componentName = item.signature?.getClassName();
        console.log(`✓ Found custom component: ${componentName}`);

        if (componentName === 'City') {
            cityFound = true;
        } else if (componentName === 'Rename') {
            renameFound = true;
        }

        let values: string[] = [];

        // Check if stateValuesTransfer exists and is iterable
        if (item.stateValuesTransfer) {
            try {
                // Try to iterate as Map
                if (item.stateValuesTransfer instanceof Map) {
                    for (const [key, value] of item.stateValuesTransfer) {
                        values.push(`${field2str(value as ArkField)} -> ${field2str(key)}`);
                    }
                } else if (Array.isArray(item.stateValuesTransfer)) {
                    for (const [key, value] of item.stateValuesTransfer as any) {
                        values.push(`${field2str(value as ArkField)} -> ${field2str(key)}`);
                    }
                }
            } catch (error) {
                console.error('Error iterating stateValuesTransfer:', error);
            }
        }

        if (values.length > 0) {
            console.log(`  State transfer: ${values.join(', ')}`);
        } else {
            console.log(`  No state transfer`);
        }
    }

    return false;
});

if (cityFound) {
    console.log('\n✓ City component from @hmos/worldclock detected');
}
if (renameFound) {
    console.log('✓ Rename component from @hmos/worldclock detected');
}

console.log('\nGenerating ViewTree dot file...');
PrinterBuilder.dump(new ViewTreePrinter(vt!), 'out/SimplePageViewTree.dot');
console.log('✓ ViewTree exported to out/SimplePageViewTree.dot');

// 生成完整的 CFG（包括所有生命周期函数）
console.log('\n=== Generating Complete CFG ===');
console.log('Generating CFG for all methods in Page.ets...');
let printerBuilder = new PrinterBuilder('out');
printerBuilder.dumpToDot(arkFile);
console.log('✓ Complete CFG exported to out/Page.ets.dot');

// 列出所有生命周期方法
console.log('\n=== Lifecycle Methods Detected ===');
let pageClass = arkFile.getClassWithName('Page');
if (pageClass) {
    let methods = pageClass.getMethods();
    console.log(`Total methods in Page class: ${methods.length}`);
    for (let method of methods) {
        const methodName = method.getName();
        console.log(`  - ${methodName}`);
    }
}

console.log('\n=== Test completed successfully! ===');
console.log('\nGenerated files:');
console.log('  - out/SimplePageViewTree.dot (ViewTree structure)');
console.log('  - out/Page.ets.dot (Complete CFG with all lifecycle methods)');
