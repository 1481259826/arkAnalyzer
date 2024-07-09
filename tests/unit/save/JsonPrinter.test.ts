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

import {
    SceneConfig,
    Scene,
    ArkFile,
} from '../../../src/index';
import { JsonPrinter } from '../../../src/save/JsonPrinter';
import { describe, expect, it } from 'vitest';
import path from 'path';

describe('JsonPrinterTest', () => {
    let config: SceneConfig = new SceneConfig();
    config.buildFromProjectDir(path.join(__dirname, '../../resources/save'));
    let scene = new Scene();
    scene.buildSceneFromProjectDir(config);

    let arkfile: ArkFile = scene.getFiles().find((value) => {
        return value.getName().endsWith('sample.ts');
    })!;

    let printer = new JsonPrinter(arkfile);
    let json = printer.dump();
    let ir = JSON.parse(json);

    it('case1: simpleFunction stmts', () => {
        let x = ir["classes"]
            .find((clazz: any) =>
                clazz["signature"]["name"] === "_DEFAULT_ARK_CLASS"
            )["methods"]
            .find((method: any) =>
                method["signature"]["name"] === "simpleFunction"
            )["body"]["cfg"]["blocks"]
            .find((block: any) =>
                block["id"] === 0
            )["stmts"];
        expect(x).toEqual(JsonPrinterTest_CASE1_EXPECT);
    });
});

const JsonPrinterTest_CASE1_EXPECT = [
    {
        "_": "AssignStmt",
        "left": {
            "_": "Local",
            "name": "x",
            "type": {
                "_": "NumberType"
            }
        },
        "right": {
            "_": "ParameterRef",
            "index": 0,
            "type": {
                "_": "NumberType"
            }
        }
    },
    {
        "_": "AssignStmt",
        "left": {
            "_": "Local",
            "name": "y",
            "type": {
                "_": "NumberType"
            }
        },
        "right": {
            "_": "ParameterRef",
            "index": 1,
            "type": {
                "_": "NumberType"
            }
        }
    },
    {
        "_": "AssignStmt",
        "left": {
            "_": "Local",
            "name": "this",
            "type": {
                "_": "ClassType",
                "signature": {
                    "name": "_DEFAULT_ARK_CLASS"
                }
            }
        },
        "right": {
            "_": "ThisRef",
            "type": {
                "_": "ClassType",
                "signature": {
                    "name": "_DEFAULT_ARK_CLASS"
                }
            }
        }
    },
    {
        "_": "AssignStmt",
        "left": {
            "_": "Local",
            "name": "sum",
            "type": {
                "_": "NumberType"
            }
        },
        "right": {
            "_": "BinopExpr",
            "op": "+",
            "left": {
                "_": "Local",
                "name": "x",
                "type": {
                    "_": "NumberType"
                }
            },
            "right": {
                "_": "Local",
                "name": "y",
                "type": {
                    "_": "NumberType"
                }
            }
        }
    },
    {
        "_": "AssignStmt",
        "left": {
            "_": "Local",
            "name": "difference",
            "type": {
                "_": "NumberType"
            }
        },
        "right": {
            "_": "BinopExpr",
            "op": "-",
            "left": {
                "_": "Local",
                "name": "x",
                "type": {
                    "_": "NumberType"
                }
            },
            "right": {
                "_": "Local",
                "name": "y",
                "type": {
                    "_": "NumberType"
                }
            }
        }
    },
    {
        "_": "AssignStmt",
        "left": {
            "_": "Local",
            "name": "product",
            "type": {
                "_": "NumberType"
            }
        },
        "right": {
            "_": "BinopExpr",
            "op": "*",
            "left": {
                "_": "Local",
                "name": "x",
                "type": {
                    "_": "NumberType"
                }
            },
            "right": {
                "_": "Local",
                "name": "y",
                "type": {
                    "_": "NumberType"
                }
            }
        }
    },
    {
        "_": "AssignStmt",
        "left": {
            "_": "Local",
            "name": "quotient",
            "type": {
                "_": "NumberType"
            }
        },
        "right": {
            "_": "BinopExpr",
            "op": "/",
            "left": {
                "_": "Local",
                "name": "x",
                "type": {
                    "_": "NumberType"
                }
            },
            "right": {
                "_": "Local",
                "name": "y",
                "type": {
                    "_": "NumberType"
                }
            }
        }
    },
    {
        "_": "IfStmt",
        "condition": {
            "_": "ConditionExpr",
            "op": "<=",
            "left": {
                "_": "Local",
                "name": "sum",
                "type": {
                    "_": "NumberType"
                }
            },
            "right": {
                "_": "Constant",
                "value": "100",
                "type": {
                    "_": "NumberType"
                }
            },
            "type": {
                "_": "BooleanType"
            }
        }
    }
]
