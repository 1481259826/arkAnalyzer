/*
 * Copyright (c) 2024 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ArkFile, buildArkFileFromFile } from '../src/core/model/ArkFile';

let file=new ArkFile()
buildArkFileFromFile('D:\\11study\\ArkAnalyzer\\tests\\resources\\cfg\\t\\t.ts',"D:\\11study\\ArkAnalyzer",file)
for(let clas of file.getClasses()){
    if(clas.getName()=='_DEFAULT_ARK_CLASS'){
        for(let method of clas.getMethods()){
            // if(method.getName()=='_DEFAULT_ARK_METHOD'){
                let body=method.getBody();
                let cfg=body.getCfg();
                // cfg.typeReference();
                logger.info(1)
            // }
        }
    }
}
logger.info(1);


// let fileContent = fs.readFileSync('tests\\resources\\cfg\\main.ts', 'utf8');
// let ast:ASTree=new ASTree(fileContent);
// ast.simplify(ast.root);
// // logger.info(ast.root.text)
// let cfgBuilder:CfgBuilder=new CfgBuilder(ast.root,"main",null);

// let cfg=cfgBuilder.buildCfg();
// cfg.buildDefUseChain();
// logger.info(1)


// cfg.printThreeAddressStrs();
// cfg.printThreeAddressStmts();



// cfg.printThreeAddressStrsAndStmts();


debugger
