import * as fs from 'fs';
import * as path from 'path';

const targetDir = './typescriptSdk'

function emptyDir(dir: string) {
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).forEach(file => {
      const filePath = path.join(dir, file);
      if (fs.statSync(filePath).isFile()) {
        fs.unlinkSync(filePath);
      } else if (fs.statSync(filePath).isDirectory()) {
        emptyDir(filePath);
        fs.rmdirSync(filePath);
      }
    });
  }
}

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir);
} else {
  emptyDir(targetDir);
}

fs.mkdirSync(path.join(targetDir, 'api'));
fs.mkdirSync(path.join(targetDir, 'api/@internal'));

const sourceFile1 = './node_modules/typescript/lib/lib.es2015.collection.d.ts'
const sourceFile2 = './node_modules/typescript/lib/lib.es5.d.ts'

function copyFile(source: string, destination: string) {
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, destination);
  } else {
    console.log("Error copy typescript file");
  }
}

copyFile(sourceFile1, path.join(targetDir, 'api/@internal', 'lib.es2015.collection.d.ts'));
copyFile(sourceFile2, path.join(targetDir, 'api/@internal', 'lib.es5.d.ts'));