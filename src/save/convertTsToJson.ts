import path from "path";

import { PrinterBuilder } from "./PrinterBuilder";
import { ArkFile } from "../core/model/ArkFile";
import { buildArkFileFromFile } from "../core/model/builder/ArkFileBuilder";

function convertTsToJson(input: string, output: string) {
    console.log(`Converting TS to JSON: from '${input}' to '${output}'...`);

    console.log("Creating ArkFile...")
    let arkFile = new ArkFile();
    let filepath = path.resolve(input);
    let projectDir = path.dirname(filepath);
    buildArkFileFromFile(filepath, projectDir, arkFile);

    console.log("Dumping JSON...");
    let printer = new PrinterBuilder();
    printer.dumpToJson(arkFile, output);
    console.log(`Dumped JSON to '${output}'`);

    console.log("All done!");
}

if (require.main === module) {
    if (process.argv.length < 3) {
        console.error("USAGE: script <input> <output>");
        process.exit(1);
    }

    let [, , input, output] = process.argv;
    convertTsToJson(input, output);
}
