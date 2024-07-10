import { SceneConfig } from "../Config";
import { PrinterBuilder } from "./PrinterBuilder";
import { Scene } from "../Scene";

import path from "path";

function convertTsProjectToJson(inputDir: string, outDir: string) {
    console.log(`Converting TS to JSON: from '${inputDir}' to '${outDir}'`);

    console.log("Building scene...");
    let config = new SceneConfig();
    config.buildFromProjectDir(inputDir);
    let scene = new Scene();
    scene.buildSceneFromProjectDir(config);
    console.log("Built scene.")

    console.log("Dumping JSON...");
    let printer = new PrinterBuilder();
    for (let f of scene.getFiles()) {
        let filepath = f.getName();
        let outPath = path.join(outDir, filepath + '.json');
        console.log(`Converting '${filepath}' to '${outPath}'...`);
        printer.dumpToJson(f, outPath);
    }
    console.log("Dumped JSON.");
}

if (require.main === module) {
    if (process.argv.length < 3) {
        console.error("USAGE: script <input> <output>");
        process.exit(1);
    }

    let [, , input, output] = process.argv;
    convertTsProjectToJson(input, output);
}
