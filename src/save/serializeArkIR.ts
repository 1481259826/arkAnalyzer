import path from "path";
import fs from "fs";
import { Command } from "commander";
import { PrinterBuilder } from "./PrinterBuilder";
import { ArkFile } from "../core/model/ArkFile";
import { buildArkFileFromFile } from "../core/model/builder/ArkFileBuilder";
import { SceneConfig } from "../Config";
import { Scene } from "../Scene";

function serializeTsFile(input: string, output: string) {
    console.log(`Converting TS file to JSON: from '${input}' to '${output}'`);

    let filepath = path.resolve(input);
    let projectDir = path.dirname(filepath);

    console.log("Creating Scene...");
    let config = new SceneConfig();
    config.buildConfig("single-file", projectDir, "", "", []);
    config.getProjectFiles().push(filepath);
    let scene = new Scene();
    // scene.buildBasicInfo(config);
    scene.buildSceneFromProjectDir(config);

    let files = scene.getFiles();
    if (files.length === 0) {
        console.error(`ERROR: No files found in the project directory '${projectDir}'.`);
        process.exit(1);
    }
    if (files.length > 1) {
        console.error(`ERROR: More than one file found in the project directory '${projectDir}'.`);
        process.exit(1);
    }
    // Note: we explicitly push a single path to the project files (in config),
    //       so we expect there is only *one* ArkFile in the scene.
    let arkFile = scene.getFiles()[0];

    console.log(`Dumping ArkIR for '${arkFile.getName()}'...`);
    let printer = new PrinterBuilder();
    printer.dumpToJson(arkFile, output);

    console.log("All done!");
}

function serializeTsProject(inputDir: string, outDir: string) {
    console.log(`Serializing TS project to JSON: from '${inputDir}' into '${outDir}'`);

    console.log("Building scene...");
    let config = new SceneConfig();
    config.buildFromProjectDir(inputDir);
    let scene = new Scene();
    scene.buildSceneFromProjectDir(config);

    console.log("Serializing to JSON...");
    let printer = new PrinterBuilder();
    for (let f of scene.getFiles()) {
        let filepath = f.getName();
        let outPath = path.join(outDir, filepath + '.json');
        console.log(`Serializing ArkIR for '${filepath}' to '${outPath}'...`);
        printer.dumpToJson(f, outPath);
    }

    console.log("All done!");
}

const program = new Command();
program
    .name('script')
    .description('Serialize ArkIR for TypeScript files or projects to JSON')
    .argument('<input>', 'Input file or directory')
    .argument('<output>', 'Output file or directory')
    .option('-p, --project', 'Flag to indicate the input is a project directory')
    .action((input, output, options) => {
        if (!fs.existsSync(input)) {
            console.error(`ERROR: The input path '${input}' does not exist.`);
            process.exit(1);
        }

        let isDirectory = fs.lstatSync(input).isDirectory();

        if (isDirectory && options.project) {
            serializeTsProject(input, output);
        } else if (!isDirectory) {
            serializeTsFile(input, output);
        } else {
            console.error(`ERROR: If the input is a directory, you must provide the '-p' or '--project' flag.`);
            process.exit(1);
        }
    });
program.parse(process.argv);
