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

console.log('Starting CountDown ViewTree Test...\n');

// Use absolute path from project root
const configPath = join(process.cwd(), 'tests/resources/CountDown/arkanalyzer_config.json');
console.log('Config path:', configPath);

let config: SceneConfig = new SceneConfig();
config.buildFromJson(configPath);
let scene: Scene = new Scene();

console.log('Building scene from project directory...');
scene.buildSceneFromProjectDir(config);

console.log('Inferring types...');
scene.inferTypes();

// 读取父组件CountDown ViewTree
console.log('\nSearching for CountDown.ets file...');
let arkFile = scene.getFiles().find((file) => file.getName().endsWith('CountDown.ets'));

if (!arkFile) {
    console.error('CountDown.ets file not found!');
    console.log('Available files:', scene.getFiles().map(f => f.getName()));
    process.exit(1);
}

console.log('Found CountDown.ets, getting CountDown class...');
let arkClass = arkFile?.getClassWithName('CountDown');

if (!arkClass) {
    console.error('CountDown class not found!');
    console.log('Available classes:', arkFile.getClasses().map(c => c.getName()));
    process.exit(1);
}

console.log('Getting ViewTree...');
let vt = arkClass?.getViewTree();

if (!vt) {
    console.error('ViewTree not found for CountDown class!');
    process.exit(1);
}

// 从根节点遍历UI组件,找到Clock组件并输出传递的状态变量
console.log('\nTraversing ViewTree to find Clock component...\n');
let root = vt?.getRoot();
let clockFound = false;

root?.walk((item) => {
    // 自定义组件&&类名为Clock
    if (
        item.isCustomComponent() &&
        item.signature instanceof ClassSignature &&
        item.signature?.getClassName() === 'Clock'
    ) {
        clockFound = true;
        console.log('✓ Found Clock component!');

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
                } else {
                    console.log('stateValuesTransfer type:', typeof item.stateValuesTransfer);
                    console.log('stateValuesTransfer:', item.stateValuesTransfer);
                }
            } catch (error) {
                console.error('Error iterating stateValuesTransfer:', error);
            }
        }

        if (values.length > 0) {
            console.log(`\nCountDown->Clock transfer values:\n ${values.join(',\n ')}`);
        } else {
            console.log(`\nCountDown->Clock: no transfer values found.`);
        }
    }

    return false;
});

if (!clockFound) {
    console.log('Clock component not found in ViewTree');
}

console.log('\nGenerating ViewTree dot file...');
PrinterBuilder.dump(new ViewTreePrinter(vt!), 'out/CountDownViewTree.dot');
console.log('✓ ViewTree exported to out/CountDownViewTree.dot');
console.log('\nTest completed successfully!');
