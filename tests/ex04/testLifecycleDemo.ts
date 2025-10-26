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

console.log('Starting Lifecycle Demo ViewTree Test...\n');

// Use absolute path from project root
const configPath = join(process.cwd(), 'tests/resources/LifecycleDemo/arkanalyzer_config.json');
console.log('Config path:', configPath);

let config: SceneConfig = new SceneConfig();
config.buildFromJson(configPath);
let scene: Scene = new Scene();

console.log('Building scene from project directory...');
scene.buildSceneFromProjectDir(config);

console.log('Inferring types...');
scene.inferTypes();

// 分析 Page 组件 ViewTree
console.log('\nSearching for Page.ets file...');
let arkFile = scene.getFiles().find((file) => file.getName().endsWith('Page.ets'));

if (!arkFile) {
    console.error('Page.ets file not found!');
    console.log('Available files:', scene.getFiles().map(f => f.getName()));
    process.exit(1);
}

console.log('Found Page.ets, getting all classes...');
let classes = arkFile.getClasses();
console.log('Available classes:', classes.map(c => c.getName()));

// 分析主组件 Page
let pageClass = arkFile?.getClassWithName('Page');
if (pageClass) {
    console.log('\n=== Analyzing Page Component ===');
    let pageVt = pageClass.getViewTree();
    if (pageVt) {
        console.log('✓ Page ViewTree found');
        console.log('Generating Page ViewTree dot file...');
        PrinterBuilder.dump(new ViewTreePrinter(pageVt), 'out/PageViewTree.dot');
        console.log('✓ Page ViewTree exported to out/PageViewTree.dot');

        // 遍历 ViewTree 找到子组件
        let root = pageVt.getRoot();
        console.log('\nTraversing Page ViewTree to find child components...\n');

        root?.walk((item) => {
            if (item.isCustomComponent() && item.signature instanceof ClassSignature) {
                const componentName = item.signature?.getClassName();
                console.log(`✓ Found custom component: ${componentName}`);

                let values: string[] = [];
                if (item.stateValuesTransfer) {
                    try {
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
                    console.log(`  No state transfer detected`);
                }
            }
            return false;
        });
    } else {
        console.log('✗ Page ViewTree not found');
    }
} else {
    console.log('✗ Page class not found');
}

// 分析子组件 UserProfile
let userProfileClass = arkFile?.getClassWithName('UserProfile');
if (userProfileClass) {
    console.log('\n=== Analyzing UserProfile Component ===');
    let userProfileVt = userProfileClass.getViewTree();
    if (userProfileVt) {
        console.log('✓ UserProfile ViewTree found');
        console.log('Generating UserProfile ViewTree dot file...');
        PrinterBuilder.dump(new ViewTreePrinter(userProfileVt), 'out/UserProfileViewTree.dot');
        console.log('✓ UserProfile ViewTree exported to out/UserProfileViewTree.dot');
    } else {
        console.log('✗ UserProfile ViewTree not found');
    }
} else {
    console.log('✗ UserProfile class not found');
}

// 分析子组件 ConsumerChild
let consumerChildClass = arkFile?.getClassWithName('ConsumerChild');
if (consumerChildClass) {
    console.log('\n=== Analyzing ConsumerChild Component ===');
    let consumerChildVt = consumerChildClass.getViewTree();
    if (consumerChildVt) {
        console.log('✓ ConsumerChild ViewTree found');
        console.log('Generating ConsumerChild ViewTree dot file...');
        PrinterBuilder.dump(new ViewTreePrinter(consumerChildVt), 'out/ConsumerChildViewTree.dot');
        console.log('✓ ConsumerChild ViewTree exported to out/ConsumerChildViewTree.dot');
    } else {
        console.log('✗ ConsumerChild ViewTree not found');
    }
} else {
    console.log('✗ ConsumerChild class not found');
}

// 使用 PrinterBuilder 导出整个文件的 CFG
console.log('\n=== Generating CFG for all methods ===');
console.log('Generating complete CFG dot file for Page.ets...');
let printerBuilder = new PrinterBuilder('out');
printerBuilder.dumpToDot(arkFile);
console.log('✓ Complete CFG exported to out/ directory');

console.log('\n=== Test completed successfully! ===');
console.log('\nGenerated files:');
console.log('  - out/PageViewTree.dot');
console.log('  - out/UserProfileViewTree.dot');
console.log('  - out/ConsumerChildViewTree.dot');
console.log('  - out/Page.ets.dot (Complete CFG)');
