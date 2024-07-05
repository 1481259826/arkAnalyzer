import { SceneConfig } from "../src/Config";
import { PrinterBuilder } from "../src/save/PrinterBuilder";
import { Scene } from "../src/Scene";
import path from "path";

const log4js = require("log4js");
const logger = log4js.getLogger("ark");

let config = new SceneConfig();
config.buildFromProjectDir(path.join(__dirname, "resources/save"));
let scene = new Scene();
scene.buildSceneFromProjectDir(config);

let printer = new PrinterBuilder();
for (let f of scene.getFiles()) {
    logger.info("Processing: " + f.getFilePath());
    printer.dumpToTs(f);
    printer.dumpToJson(f);
}
