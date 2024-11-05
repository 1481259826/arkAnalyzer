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

import path from 'path';
import { describe, expect, it } from 'vitest';
import { ArkFile, DEFAULT_ARK_CLASS_NAME, DEFAULT_ARK_METHOD_NAME, Scene, SceneConfig } from '../../../src/index';
import { JsonPrinter } from '../../../src/save/JsonPrinter';

describe('JsonPrinterTest', () => {
    let config: SceneConfig = new SceneConfig();
    config.buildFromProjectDir(path.join(__dirname, '../../resources/save'));
    let scene = new Scene();
    scene.buildSceneFromProjectDir(config);
    scene.inferTypes();
    let arkfile: ArkFile = scene.getFiles().find((value) => {
        return value.getName().endsWith('sample.ts');
    })!;

    let printer = new JsonPrinter(arkfile);
    let json = printer.dump();
    let ir = JSON.parse(json);

    it('function simpleFunction', () => {
        let x = ir.classes
            .find((clazz: any) =>
                clazz.signature.name === DEFAULT_ARK_CLASS_NAME
            )
            .methods
            .find((method: any) =>
                method.signature.name === "simpleFunction"
            );
        expect(x).toEqual(JsonPrinter_simpleFunction_EXPECTED);
    });

    it('function complexFunction', () => {
        let x = ir.classes
            .find((clazz: any) =>
                clazz.signature.name === DEFAULT_ARK_CLASS_NAME
            )
            .methods
            .find((method: any) =>
                method.signature.name === "complexFunction"
            );
        expect(x).toEqual(JsonPrinter_complexFunction_EXPECTED);
    });

    it('class Shape', () => {
        let x = ir.classes
            .find((clazz: any) =>
                clazz.signature.name === "Shape"
            );
        expect(x).toEqual(JsonPrinter_Shape_EXPECTED);
    });

    it('default class', () => {
        let x = ir.classes
            .find((clazz: any) =>
                clazz.signature.name === DEFAULT_ARK_CLASS_NAME
            );
        expect(x).toEqual(JsonPrinter_DEFAULT_ARK_CLASS_EXPECTED);
    });
});

const JsonPrinter_simpleFunction_EXPECTED = {
    "signature": {
        "enclosingClass": {
            "name": "%dflt"
        },
        "name": "simpleFunction",
        "parameters": [
            {
                "name": "x",
                "type": {
                    "_": "NumberType"
                },
                "isOptional": false
            },
            {
                "name": "y",
                "type": {
                    "_": "NumberType"
                },
                "isOptional": false
            }
        ],
        "returnType": {
            "_": "NumberType"
        }
    },
    "modifiers": 0,
    "typeParameters": [],
    "body": {
        "locals": [
            {
                "name": "this",
                "type": {
                    "_": "ClassType",
                    "signature": {
                        "name": "%dflt"
                    }
                }
            },
            {
                "name": "x",
                "type": {
                    "_": "NumberType"
                }
            },
            {
                "name": "y",
                "type": {
                    "_": "NumberType"
                }
            },
            {
                "name": "sum",
                "type": {
                    "_": "NumberType"
                }
            },
            {
                "name": "difference",
                "type": {
                    "_": "NumberType"
                }
            },
            {
                "name": "product",
                "type": {
                    "_": "NumberType"
                }
            },
            {
                "name": "quotient",
                "type": {
                    "_": "NumberType"
                }
            },
            {
                "name": "result",
                "type": {
                    "_": "NumberType"
                }
            },
            {
                "name": "%0",
                "type": {
                    "_": "NumberType"
                }
            },
            {
                "name": "%1",
                "type": {
                    "_": "NumberType"
                }
            }
        ],
        "cfg": {
            "blocks": [
                {
                    "id": 0,
                    "successors": [
                        1,
                        4
                    ],
                    "stmts": [
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
                                        "name": "%dflt"
                                    }
                                }
                            },
                            "right": {
                                "_": "ThisRef",
                                "type": {
                                    "_": "ClassType",
                                    "signature": {
                                        "name": "%dflt"
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
                                "op": ">",
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
                },
                {
                    "id": 1,
                    "successors": [
                        2,
                        3
                    ],
                    "stmts": [
                        {
                            "_": "IfStmt",
                            "condition": {
                                "_": "ConditionExpr",
                                "op": "<",
                                "left": {
                                    "_": "Local",
                                    "name": "difference",
                                    "type": {
                                        "_": "NumberType"
                                    }
                                },
                                "right": {
                                    "_": "Constant",
                                    "value": "0",
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
                },
                {
                    "id": 2,
                    "successors": [],
                    "stmts": [
                        {
                            "_": "AssignStmt",
                            "left": {
                                "_": "Local",
                                "name": "%0",
                                "type": {
                                    "_": "NumberType"
                                }
                            },
                            "right": {
                                "_": "BinopExpr",
                                "op": "+",
                                "left": {
                                    "_": "Local",
                                    "name": "sum",
                                    "type": {
                                        "_": "NumberType"
                                    }
                                },
                                "right": {
                                    "_": "Local",
                                    "name": "difference",
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
                                "name": "%1",
                                "type": {
                                    "_": "NumberType"
                                }
                            },
                            "right": {
                                "_": "BinopExpr",
                                "op": "+",
                                "left": {
                                    "_": "Local",
                                    "name": "%0",
                                    "type": {
                                        "_": "NumberType"
                                    }
                                },
                                "right": {
                                    "_": "Local",
                                    "name": "product",
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
                                "name": "result",
                                "type": {
                                    "_": "NumberType"
                                }
                            },
                            "right": {
                                "_": "BinopExpr",
                                "op": "-",
                                "left": {
                                    "_": "Local",
                                    "name": "%1",
                                    "type": {
                                        "_": "NumberType"
                                    }
                                },
                                "right": {
                                    "_": "Local",
                                    "name": "quotient",
                                    "type": {
                                        "_": "NumberType"
                                    }
                                }
                            }
                        },
                        {
                            "_": "ReturnStmt",
                            "arg": {
                                "_": "Local",
                                "name": "result",
                                "type": {
                                    "_": "NumberType"
                                }
                            }
                        }
                    ]
                },
                {
                    "id": 3,
                    "successors": [
                        2
                    ],
                    "stmts": [
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
                                "_": "Constant",
                                "value": "0",
                                "type": {
                                    "_": "NumberType"
                                }
                            }
                        }
                    ]
                },
                {
                    "id": 4,
                    "successors": [
                        1
                    ],
                    "stmts": [
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
                                "_": "Constant",
                                "value": "100",
                                "type": {
                                    "_": "NumberType"
                                }
                            }
                        }
                    ]
                }
            ]
        }
    }
};

const JsonPrinter_complexFunction_EXPECTED = {
    "signature": {
        "enclosingClass": {
            "name": "%dflt"
        },
        "name": "complexFunction",
        "parameters": [
            {
                "name": "a",
                "type": {
                    "_": "NumberType"
                },
                "isOptional": false
            },
            {
                "name": "b",
                "type": {
                    "_": "NumberType"
                },
                "isOptional": false
            },
            {
                "name": "flag",
                "type": {
                    "_": "BooleanType"
                },
                "isOptional": false
            }
        ],
        "returnType": {
            "_": "NumberType"
        }
    },
    "modifiers": 0,
    "typeParameters": [],
    "body": {
        "locals": [
            {
                "name": "this",
                "type": {
                    "_": "ClassType",
                    "signature": {
                        "name": "%dflt"
                    }
                }
            },
            {
                "name": "a",
                "type": {
                    "_": "NumberType"
                }
            },
            {
                "name": "b",
                "type": {
                    "_": "NumberType"
                }
            },
            {
                "name": "flag",
                "type": {
                    "_": "BooleanType"
                }
            },
            {
                "name": "result",
                "type": {
                    "_": "NumberType"
                }
            },
            {
                "name": "%0",
                "type": {
                    "_": "NumberType"
                }
            },
            {
                "name": "%1",
                "type": {
                    "_": "NumberType"
                }
            },
            {
                "name": "%2",
                "type": {
                    "_": "NumberType"
                }
            },
            {
                "name": "%3",
                "type": {
                    "_": "NumberType"
                }
            }
        ],
        "cfg": {
            "blocks": [
                {
                    "id": 0,
                    "successors": [
                        1,
                        7
                    ],
                    "stmts": [
                        {
                            "_": "AssignStmt",
                            "left": {
                                "_": "Local",
                                "name": "a",
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
                                "name": "b",
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
                                "name": "flag",
                                "type": {
                                    "_": "BooleanType"
                                }
                            },
                            "right": {
                                "_": "ParameterRef",
                                "index": 2,
                                "type": {
                                    "_": "BooleanType"
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
                                        "name": "%dflt"
                                    }
                                }
                            },
                            "right": {
                                "_": "ThisRef",
                                "type": {
                                    "_": "ClassType",
                                    "signature": {
                                        "name": "%dflt"
                                    }
                                }
                            }
                        },
                        {
                            "_": "AssignStmt",
                            "left": {
                                "_": "Local",
                                "name": "result",
                                "type": {
                                    "_": "NumberType"
                                }
                            },
                            "right": {
                                "_": "Constant",
                                "value": "undefined",
                                "type": {
                                    "_": "UndefinedType"
                                }
                            }
                        },
                        {
                            "_": "IfStmt",
                            "condition": {
                                "_": "ConditionExpr",
                                "op": "!=",
                                "left": {
                                    "_": "Local",
                                    "name": "flag",
                                    "type": {
                                        "_": "BooleanType"
                                    }
                                },
                                "right": {
                                    "_": "Constant",
                                    "value": "false",
                                    "type": {
                                        "_": "BooleanType"
                                    }
                                },
                                "type": {
                                    "_": "BooleanType"
                                }
                            }
                        }
                    ]
                },
                {
                    "id": 1,
                    "successors": [
                        2
                    ],
                    "stmts": [
                        {
                            "_": "AssignStmt",
                            "left": {
                                "_": "Local",
                                "name": "%2",
                                "type": {
                                    "_": "NumberType"
                                }
                            },
                            "right": {
                                "_": "BinopExpr",
                                "op": "/",
                                "left": {
                                    "_": "Local",
                                    "name": "a",
                                    "type": {
                                        "_": "NumberType"
                                    }
                                },
                                "right": {
                                    "_": "Local",
                                    "name": "b",
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
                                "name": "%3",
                                "type": {
                                    "_": "NumberType"
                                }
                            },
                            "right": {
                                "_": "BinopExpr",
                                "op": "+",
                                "left": {
                                    "_": "Local",
                                    "name": "a",
                                    "type": {
                                        "_": "NumberType"
                                    }
                                },
                                "right": {
                                    "_": "Local",
                                    "name": "b",
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
                                "name": "result",
                                "type": {
                                    "_": "NumberType"
                                }
                            },
                            "right": {
                                "_": "BinopExpr",
                                "op": "-",
                                "left": {
                                    "_": "Local",
                                    "name": "%2",
                                    "type": {
                                        "_": "NumberType"
                                    }
                                },
                                "right": {
                                    "_": "Local",
                                    "name": "%3",
                                    "type": {
                                        "_": "NumberType"
                                    }
                                }
                            }
                        }
                    ]
                },
                {
                    "id": 2,
                    "successors": [
                        3,
                        6
                    ],
                    "stmts": [
                        {
                            "_": "IfStmt",
                            "condition": {
                                "_": "ConditionExpr",
                                "op": ">",
                                "left": {
                                    "_": "Local",
                                    "name": "result",
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
                },
                {
                    "id": 3,
                    "successors": [
                        4,
                        5
                    ],
                    "stmts": [
                        {
                            "_": "IfStmt",
                            "condition": {
                                "_": "ConditionExpr",
                                "op": "<",
                                "left": {
                                    "_": "Local",
                                    "name": "result",
                                    "type": {
                                        "_": "NumberType"
                                    }
                                },
                                "right": {
                                    "_": "Constant",
                                    "value": "0",
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
                },
                {
                    "id": 4,
                    "successors": [],
                    "stmts": [
                        {
                            "_": "ReturnStmt",
                            "arg": {
                                "_": "Local",
                                "name": "result",
                                "type": {
                                    "_": "NumberType"
                                }
                            }
                        }
                    ]
                },
                {
                    "id": 5,
                    "successors": [
                        4
                    ],
                    "stmts": [
                        {
                            "_": "AssignStmt",
                            "left": {
                                "_": "Local",
                                "name": "result",
                                "type": {
                                    "_": "NumberType"
                                }
                            },
                            "right": {
                                "_": "Constant",
                                "value": "0",
                                "type": {
                                    "_": "NumberType"
                                }
                            }
                        }
                    ]
                },
                {
                    "id": 6,
                    "successors": [
                        4
                    ],
                    "stmts": [
                        {
                            "_": "AssignStmt",
                            "left": {
                                "_": "Local",
                                "name": "result",
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
                            }
                        }
                    ]
                },
                {
                    "id": 7,
                    "successors": [
                        2
                    ],
                    "stmts": [
                        {
                            "_": "AssignStmt",
                            "left": {
                                "_": "Local",
                                "name": "%0",
                                "type": {
                                    "_": "NumberType"
                                }
                            },
                            "right": {
                                "_": "BinopExpr",
                                "op": "*",
                                "left": {
                                    "_": "Local",
                                    "name": "a",
                                    "type": {
                                        "_": "NumberType"
                                    }
                                },
                                "right": {
                                    "_": "Local",
                                    "name": "b",
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
                                "name": "%1",
                                "type": {
                                    "_": "NumberType"
                                }
                            },
                            "right": {
                                "_": "BinopExpr",
                                "op": "-",
                                "left": {
                                    "_": "Local",
                                    "name": "a",
                                    "type": {
                                        "_": "NumberType"
                                    }
                                },
                                "right": {
                                    "_": "Local",
                                    "name": "b",
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
                                "name": "result",
                                "type": {
                                    "_": "NumberType"
                                }
                            },
                            "right": {
                                "_": "BinopExpr",
                                "op": "+",
                                "left": {
                                    "_": "Local",
                                    "name": "%0",
                                    "type": {
                                        "_": "NumberType"
                                    }
                                },
                                "right": {
                                    "_": "Local",
                                    "name": "%1",
                                    "type": {
                                        "_": "NumberType"
                                    }
                                }
                            }
                        }
                    ]
                }
            ]
        }
    }
};

const JsonPrinter_Shape_EXPECTED = {
    "signature": {
        "name": "Shape"
    },
    "modifiers": 32,
    "superClassName": "",
    "implementedInterfaceNames": [],
    "fields": [],
    "methods": [
        {
            "signature": {
                "enclosingClass": {
                    "name": "Shape"
                },
                "name": "%instInit",
                "parameters": [],
                "returnType": {
                    "_": "UnknownType"
                }
            },
            "modifiers": 0,
            "typeParameters": [],
            "body": {
                "locals": [],
                "cfg": {
                    "blocks": [
                        {
                            "id": 0,
                            "successors": [],
                            "stmts": [
                                {
                                    "_": "AssignStmt",
                                    "left": {
                                        "_": "Local",
                                        "name": "this",
                                        "type": {
                                            "_": "ClassType",
                                            "signature": {
                                                "name": "Shape"
                                            }
                                        }
                                    },
                                    "right": {
                                        "_": "ThisRef",
                                        "type": {
                                            "_": "ClassType",
                                            "signature": {
                                                "name": "Shape"
                                            }
                                        }
                                    }
                                },
                                {
                                    "_": "ReturnVoidStmt"
                                }
                            ]
                        }
                    ]
                }
            }
        },
        {
            "signature": {
                "enclosingClass": {
                    "name": "Shape"
                },
                "name": "%statInit",
                "parameters": [],
                "returnType": {
                    "_": "UnknownType"
                }
            },
            "modifiers": 0,
            "typeParameters": [],
            "body": {
                "locals": [],
                "cfg": {
                    "blocks": [
                        {
                            "id": 0,
                            "successors": [],
                            "stmts": [
                                {
                                    "_": "AssignStmt",
                                    "left": {
                                        "_": "Local",
                                        "name": "this",
                                        "type": {
                                            "_": "ClassType",
                                            "signature": {
                                                "name": "Shape"
                                            }
                                        }
                                    },
                                    "right": {
                                        "_": "ThisRef",
                                        "type": {
                                            "_": "ClassType",
                                            "signature": {
                                                "name": "Shape"
                                            }
                                        }
                                    }
                                },
                                {
                                    "_": "ReturnVoidStmt"
                                }
                            ]
                        }
                    ]
                }
            }
        },
        {
            "signature": {
                "enclosingClass": {
                    "name": "Shape"
                },
                "name": "area",
                "parameters": [],
                "returnType": {
                    "_": "NumberType"
                }
            },
            "modifiers": 32,
            "typeParameters": [],
            "body": null
        },
        {
            "signature": {
                "enclosingClass": {
                    "name": "Shape"
                },
                "name": "perimeter",
                "parameters": [],
                "returnType": {
                    "_": "NumberType"
                }
            },
            "modifiers": 32,
            "typeParameters": [],
            "body": null
        },
        {
            "signature": {
                "enclosingClass": {
                    "name": "Shape"
                },
                "name": "description",
                "parameters": [],
                "returnType": {
                    "_": "StringType"
                }
            },
            "modifiers": 0,
            "typeParameters": [],
            "body": {
                "locals": [
                    {
                        "name": "this",
                        "type": {
                            "_": "ClassType",
                            "signature": {
                                "name": "Shape"
                            }
                        }
                    },
                    {
                        "name": "%0",
                        "type": {
                            "_": "NumberType"
                        }
                    },
                    {
                        "name": "%1",
                        "type": {
                            "_": "NumberType"
                        }
                    },
                    {
                        "name": "%2",
                        "type": {
                            "_": "StringType"
                        }
                    },
                    {
                        "name": "%3",
                        "type": {
                            "_": "StringType"
                        }
                    },     
                    {
                        "name": "%4",
                        "type": {
                            "_": "StringType"
                        }
                    }
                ],
                "cfg": {
                    "blocks": [
                        {
                            "id": 0,
                            "successors": [],
                            "stmts": [
                                {
                                    "_": "AssignStmt",
                                    "left": {
                                        "_": "Local",
                                        "name": "this",
                                        "type": {
                                            "_": "ClassType",
                                            "signature": {
                                                "name": "Shape"
                                            }
                                        }
                                    },
                                    "right": {
                                        "_": "ThisRef",
                                        "type": {
                                            "_": "ClassType",
                                            "signature": {
                                                "name": "Shape"
                                            }
                                        }
                                    }
                                },
                                {
                                    "_": "AssignStmt",
                                    "left": {
                                        "_": "Local",
                                        "name": "%0",
                                        "type": {
                                            "_": "NumberType"
                                        }
                                    },
                                    "right": {
                                        "_": "InstanceCallExpr",
                                        "instance": {
                                            "_": "Local",
                                            "name": "this",
                                            "type": {
                                                "_": "ClassType",
                                                "signature": {
                                                    "name": "Shape"
                                                }
                                            }
                                        },
                                        "method": {
                                            "enclosingClass": {
                                                "name": "Shape"
                                            },
                                            "name": "area",
                                            "parameters": [],
                                            "returnType": {
                                                "_": "NumberType"
                                            }
                                        },
                                        "args": []
                                    }
                                },
                                {
                                    "_": "AssignStmt",
                                    "left": {
                                        "_": "Local",
                                        "name": "%1",
                                        "type": {
                                            "_": "NumberType"
                                        }
                                    },
                                    "right": {
                                        "_": "InstanceCallExpr",
                                        "instance": {
                                            "_": "Local",
                                            "name": "this",
                                            "type": {
                                                "_": "ClassType",
                                                "signature": {
                                                    "name": "Shape"
                                                }
                                            }
                                        },
                                        "method": {
                                            "enclosingClass": {
                                                "name": "Shape"
                                            },
                                            "name": "perimeter",
                                            "parameters": [],
                                            "returnType": {
                                                "_": "NumberType"
                                            }
                                        },
                                        "args": []
                                    }
                                },
                                {
                                    "_": "AssignStmt",
                                    "left": {
                                        "_": "Local",
                                        "name": "%2",
                                        "type": {
                                            "_": "StringType"
                                        }
                                    },
                                    "right": {
                                        "_": "BinopExpr",
                                        "op": "+",
                                        "left": {
                                            "_": "Constant",
                                            "type": {
                                                "_": "StringType"
                                            },
                                            "value": "Area: ",

                                        },
                                        "right": {
                                            "_": "Local",
                                            "name": "%0",
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
                                        "name": "%3",
                                        "type": {
                                            "_": "StringType"
                                        }
                                    },
                                    "right": {
                                        "_": "BinopExpr",
                                        "op": "+",
                                        "left": {
                                            "_": "Local",
                                            "name": "%2",
                                            "type": {
                                                "_": "StringType"
                                            }
                                        },
                                        "right": {
                                            "_": "Constant",
                                            "value": ", Perimeter: ",
                                            "type": {
                                                "_": "StringType"
                                            }
                                        }
                                    }
                                },
                                {
                                    "_": "AssignStmt",
                                    "left": {
                                        "_": "Local",
                                        "name": "%4",
                                        "type": {
                                            "_": "StringType"
                                        }
                                    },
                                    "right": {
                                        "_": "BinopExpr",
                                        "op": "+",
                                        "left": {
                                            "_": "Local",
                                            "name": "%3",
                                            "type": {
                                                "_": "StringType"
                                            }
                                        },
                                        "right": {
                                            "_": "Local",
                                            "name": "%1",
                                            "type": {
                                                "_": "NumberType"
                                            }
                                        }
                                    }
                                },
                                {
                                    "_": "ReturnStmt",
                                    "arg": {
                                        "_": "Local",
                                        "name": "%4",
                                        "type": {
                                            "_": "StringType"
                                        }
                                    }
                                }
                            ]
                        }
                    ]
                }
            }
        },
        {
            "signature": {
                "enclosingClass": {
                    "name": "Shape"
                },
                "name": "constructor",
                "parameters": [],
                "returnType": {
                    "_": "UnknownType"
                }
            },
            "modifiers": 0,
            "typeParameters": [],
            "body": {
                "locals": [
                    {
                        "name": "this",
                        "type": {
                            "_": "UnknownType"
                        }
                    }
                ],
                "cfg": {
                    "blocks": [
                        {
                            "id": 0,
                            "successors": [],
                            "stmts": [
                                {
                                    "_": "AssignStmt",
                                    "left": {
                                        "_": "Local",
                                        "name": "this",
                                        "type": {
                                            "_": "UnknownType"
                                        }
                                    },
                                    "right": {
                                        "_": "ThisRef",
                                        "type": {
                                            "_": "ClassType",
                                            "signature": {
                                                "name": "Shape"
                                            }
                                        }
                                    }
                                },
                                {
                                    "_": "CallStmt",
                                    "expr": {
                                        "_": "InstanceCallExpr",
                                        "instance": {
                                            "_": "Local",
                                            "name": "this",
                                            "type": {
                                                "_": "UnknownType"
                                            }
                                        },
                                        "method": {
                                            "enclosingClass": {
                                                "name": "Shape"
                                            },
                                            "name": "%instInit",
                                            "parameters": [],
                                            "returnType": {
                                                "_": "UnknownType"
                                            }
                                        },
                                        "args": []
                                    }
                                },
                                {
                                    "_": "ReturnVoidStmt"
                                }
                            ]
                        }
                    ]
                }
            }
        }
    ]
};

const JsonPrinter_DEFAULT_ARK_CLASS_EXPECTED = {
    signature: {
        name: "%dflt",
    },
    modifiers: 0,
    superClassName: "",
    implementedInterfaceNames: [
    ],
    fields: [],
    methods: [
        {
            signature: {
                enclosingClass: {
                    name: "%dflt",
                },
                name: DEFAULT_ARK_METHOD_NAME,
                parameters: [
                ],
                returnType: {
                    _: "UnknownType",
                },
            },
            modifiers: 0,
            typeParameters: [
            ],
            body: {
                locals: [
                    {
                        name: "this",
                        type: {
                            _: "ClassType",
                            signature: {
                                name: "%dflt",
                            },
                        },
                    },
                    {
                        name: "sum",
                        type: {
                            _: "NumberType",
                        },
                    },
                    {
                        name: "i",
                        type: {
                            _: "NumberType",
                        },
                    },
                    {
                        name: "fileContent",
                        type: {
                            _: "StringType",
                        },
                    },
                    {
                        name: "readFileSync",
                        type: {
                            _: "UnknownType",
                        },
                    },
                ],
                cfg: {
                    blocks: [
                        {
                            id: 0,
                            successors: [
                                1,
                            ],
                            stmts: [
                                {
                                    _: "AssignStmt",
                                    left: {
                                        _: "Local",
                                        name: "this",
                                        type: {
                                            _: "ClassType",
                                            signature: {
                                                name: "%dflt",
                                            },
                                        },
                                    },
                                    right: {
                                        _: "ThisRef",
                                        type: {
                                            _: "ClassType",
                                            signature: {
                                                name: "%dflt",
                                            },
                                        },
                                    },
                                },
                                {
                                    _: "AssignStmt",
                                    left: {
                                        _: "Local",
                                        name: "sum",
                                        type: {
                                            _: "NumberType",
                                        },
                                    },
                                    right: {
                                        _: "Constant",
                                        value: "0",
                                        type: {
                                            _: "NumberType",
                                        },
                                    },
                                },
                                {
                                    _: "AssignStmt",
                                    left: {
                                        _: "Local",
                                        name: "i",
                                        type: {
                                            _: "NumberType",
                                        },
                                    },
                                    right: {
                                        _: "Constant",
                                        value: "1",
                                        type: {
                                            _: "NumberType",
                                        },
                                    },
                                },
                            ],
                        },
                        {
                            id: 1,
                            successors: [
                                2,
                                3,
                            ],
                            stmts: [
                                {
                                    _: "IfStmt",
                                    condition: {
                                        _: "ConditionExpr",
                                        op: "<=",
                                        left: {
                                            _: "Local",
                                            name: "i",
                                            type: {
                                                _: "NumberType",
                                            },
                                        },
                                        right: {
                                            _: "Constant",
                                            value: "10",
                                            type: {
                                                _: "NumberType",
                                            },
                                        },
                                        type: {
                                            _: "BooleanType",
                                        },
                                    },
                                },
                            ],
                        },
                        {
                            id: 2,
                            successors: [
                            ],
                            stmts: [
                                {
                                    _: "AssignStmt",
                                    left: {
                                        _: "Local",
                                        name: "fileContent",
                                        type: {
                                            _: "StringType",
                                        },
                                    },
                                    right: {
                                        _: "StaticCallExpr",
                                        method: {
                                            enclosingClass: {
                                                name: "",
                                            },
                                            name: "readFileSync",
                                            parameters: [
                                            ],
                                            returnType: {
                                                _: "UnknownType",
                                            },
                                        },
                                        args: [
                                            {
                                                _: "Constant",
                                                value: "dummy.txt",
                                                type: {
                                                    _: "StringType",
                                                },
                                            },
                                            {
                                                _: "Constant",
                                                value: "utf8",
                                                type: {
                                                    _: "StringType",
                                                },
                                            },
                                        ],
                                    },
                                },
                                {
                                    _: "ReturnVoidStmt",
                                },
                            ],
                        },
                        {
                            id: 3,
                            successors: [
                                1,
                            ],
                            stmts: [
                                {
                                    _: "AssignStmt",
                                    left: {
                                        _: "Local",
                                        name: "sum",
                                        type: {
                                            _: "NumberType",
                                        },
                                    },
                                    right: {
                                        _: "BinopExpr",
                                        op: "+",
                                        left: {
                                            _: "Local",
                                            name: "sum",
                                            type: {
                                                _: "NumberType",
                                            },
                                        },
                                        right: {
                                            _: "Local",
                                            name: "i",
                                            type: {
                                                _: "NumberType",
                                            },
                                        },
                                    },
                                },
                                {
                                    _: "AssignStmt",
                                    left: {
                                        _: "Local",
                                        name: "i",
                                        type: {
                                            _: "NumberType",
                                        },
                                    },
                                    right: {
                                        _: "BinopExpr",
                                        op: "+",
                                        left: {
                                            _: "Local",
                                            name: "i",
                                            type: {
                                                _: "NumberType",
                                            },
                                        },
                                        right: {
                                            _: "Constant",
                                            value: "1",
                                            type: {
                                                _: "NumberType",
                                            },
                                        },
                                    },
                                },
                            ],
                        },
                    ],
                },
            },
        },
        {
            signature: {
                enclosingClass: {
                    name: "%dflt",
                },
                name: "simpleFunction",
                parameters: [
                    {
                        name: "x",
                        type: {
                            _: "NumberType",
                        },
                        isOptional: false,
                    },
                    {
                        name: "y",
                        type: {
                            _: "NumberType",
                        },
                        isOptional: false,
                    },
                ],
                returnType: {
                    _: "NumberType",
                },
            },
            modifiers: 0,
            typeParameters: [
            ],
            body: {
                locals: [
                    {
                        name: "this",
                        type: {
                            _: "ClassType",
                            signature: {
                                name: "%dflt",
                            },
                        },
                    },
                    {
                        name: "x",
                        type: {
                            _: "NumberType",
                        },
                    },
                    {
                        name: "y",
                        type: {
                            _: "NumberType",
                        },
                    },
                    {
                        name: "sum",
                        type: {
                            _: "NumberType",
                        },
                    },
                    {
                        name: "difference",
                        type: {
                            _: "NumberType",
                        },
                    },
                    {
                        name: "product",
                        type: {
                            _: "NumberType",
                        },
                    },
                    {
                        name: "quotient",
                        type: {
                            _: "NumberType",
                        },
                    },
                    {
                        name: "result",
                        type: {
                            _: "NumberType",
                        },
                    },
                    {
                        name: "%0",
                        type: {
                            _: "NumberType",
                        },
                    },
                    {
                        name: "%1",
                        type: {
                            _: "NumberType",
                        },
                    },
                ],
                cfg: {
                    blocks: [
                        {
                            id: 0,
                            successors: [
                                1,
                                4,
                            ],
                            stmts: [
                                {
                                    _: "AssignStmt",
                                    left: {
                                        _: "Local",
                                        name: "x",
                                        type: {
                                            _: "NumberType",
                                        },
                                    },
                                    right: {
                                        _: "ParameterRef",
                                        index: 0,
                                        type: {
                                            _: "NumberType",
                                        },
                                    },
                                },
                                {
                                    _: "AssignStmt",
                                    left: {
                                        _: "Local",
                                        name: "y",
                                        type: {
                                            _: "NumberType",
                                        },
                                    },
                                    right: {
                                        _: "ParameterRef",
                                        index: 1,
                                        type: {
                                            _: "NumberType",
                                        },
                                    },
                                },
                                {
                                    _: "AssignStmt",
                                    left: {
                                        _: "Local",
                                        name: "this",
                                        type: {
                                            _: "ClassType",
                                            signature: {
                                                name: "%dflt",
                                            },
                                        },
                                    },
                                    right: {
                                        _: "ThisRef",
                                        type: {
                                            _: "ClassType",
                                            signature: {
                                                name: "%dflt",
                                            },
                                        },
                                    },
                                },
                                {
                                    _: "AssignStmt",
                                    left: {
                                        _: "Local",
                                        name: "sum",
                                        type: {
                                            _: "NumberType",
                                        },
                                    },
                                    right: {
                                        _: "BinopExpr",
                                        op: "+",
                                        left: {
                                            _: "Local",
                                            name: "x",
                                            type: {
                                                _: "NumberType",
                                            },
                                        },
                                        right: {
                                            _: "Local",
                                            name: "y",
                                            type: {
                                                _: "NumberType",
                                            },
                                        },
                                    },
                                },
                                {
                                    _: "AssignStmt",
                                    left: {
                                        _: "Local",
                                        name: "difference",
                                        type: {
                                            _: "NumberType",
                                        },
                                    },
                                    right: {
                                        _: "BinopExpr",
                                        op: "-",
                                        left: {
                                            _: "Local",
                                            name: "x",
                                            type: {
                                                _: "NumberType",
                                            },
                                        },
                                        right: {
                                            _: "Local",
                                            name: "y",
                                            type: {
                                                _: "NumberType",
                                            },
                                        },
                                    },
                                },
                                {
                                    _: "AssignStmt",
                                    left: {
                                        _: "Local",
                                        name: "product",
                                        type: {
                                            _: "NumberType",
                                        },
                                    },
                                    right: {
                                        _: "BinopExpr",
                                        op: "*",
                                        left: {
                                            _: "Local",
                                            name: "x",
                                            type: {
                                                _: "NumberType",
                                            },
                                        },
                                        right: {
                                            _: "Local",
                                            name: "y",
                                            type: {
                                                _: "NumberType",
                                            },
                                        },
                                    },
                                },
                                {
                                    _: "AssignStmt",
                                    left: {
                                        _: "Local",
                                        name: "quotient",
                                        type: {
                                            _: "NumberType",
                                        },
                                    },
                                    right: {
                                        _: "BinopExpr",
                                        op: "/",
                                        left: {
                                            _: "Local",
                                            name: "x",
                                            type: {
                                                _: "NumberType",
                                            },
                                        },
                                        right: {
                                            _: "Local",
                                            name: "y",
                                            type: {
                                                _: "NumberType",
                                            },
                                        },
                                    },
                                },
                                {
                                    _: "IfStmt",
                                    condition: {
                                        _: "ConditionExpr",
                                        op: ">",
                                        left: {
                                            _: "Local",
                                            name: "sum",
                                            type: {
                                                _: "NumberType",
                                            },
                                        },
                                        right: {
                                            _: "Constant",
                                            value: "100",
                                            type: {
                                                _: "NumberType",
                                            },
                                        },
                                        type: {
                                            _: "BooleanType",
                                        },
                                    },
                                },
                            ],
                        },
                        {
                            id: 1,
                            successors: [
                                2,
                                3,
                            ],
                            stmts: [
                                {
                                    _: "IfStmt",
                                    condition: {
                                        _: "ConditionExpr",
                                        op: "<",
                                        left: {
                                            _: "Local",
                                            name: "difference",
                                            type: {
                                                _: "NumberType",
                                            },
                                        },
                                        right: {
                                            _: "Constant",
                                            value: "0",
                                            type: {
                                                _: "NumberType",
                                            },
                                        },
                                        type: {
                                            _: "BooleanType",
                                        },
                                    },
                                },
                            ],
                        },
                        {
                            id: 2,
                            successors: [
                            ],
                            stmts: [
                                {
                                    _: "AssignStmt",
                                    left: {
                                        _: "Local",
                                        name: "%0",
                                        type: {
                                            _: "NumberType",
                                        },
                                    },
                                    right: {
                                        _: "BinopExpr",
                                        op: "+",
                                        left: {
                                            _: "Local",
                                            name: "sum",
                                            type: {
                                                _: "NumberType",
                                            },
                                        },
                                        right: {
                                            _: "Local",
                                            name: "difference",
                                            type: {
                                                _: "NumberType",
                                            },
                                        },
                                    },
                                },
                                {
                                    _: "AssignStmt",
                                    left: {
                                        _: "Local",
                                        name: "%1",
                                        type: {
                                            _: "NumberType",
                                        },
                                    },
                                    right: {
                                        _: "BinopExpr",
                                        op: "+",
                                        left: {
                                            _: "Local",
                                            name: "%0",
                                            type: {
                                                _: "NumberType",
                                            },
                                        },
                                        right: {
                                            _: "Local",
                                            name: "product",
                                            type: {
                                                _: "NumberType",
                                            },
                                        },
                                    },
                                },
                                {
                                    _: "AssignStmt",
                                    left: {
                                        _: "Local",
                                        name: "result",
                                        type: {
                                            _: "NumberType",
                                        },
                                    },
                                    right: {
                                        _: "BinopExpr",
                                        op: "-",
                                        left: {
                                            _: "Local",
                                            name: "%1",
                                            type: {
                                                _: "NumberType",
                                            },
                                        },
                                        right: {
                                            _: "Local",
                                            name: "quotient",
                                            type: {
                                                _: "NumberType",
                                            },
                                        },
                                    },
                                },
                                {
                                    _: "ReturnStmt",
                                    arg: {
                                        _: "Local",
                                        name: "result",
                                        type: {
                                            _: "NumberType",
                                        },
                                    },
                                },
                            ],
                        },
                        {
                            id: 3,
                            successors: [
                                2,
                            ],
                            stmts: [
                                {
                                    _: "AssignStmt",
                                    left: {
                                        _: "Local",
                                        name: "difference",
                                        type: {
                                            _: "NumberType",
                                        },
                                    },
                                    right: {
                                        _: "Constant",
                                        value: "0",
                                        type: {
                                            _: "NumberType",
                                        },
                                    },
                                },
                            ],
                        },
                        {
                            id: 4,
                            successors: [
                                1,
                            ],
                            stmts: [
                                {
                                    _: "AssignStmt",
                                    left: {
                                        _: "Local",
                                        name: "sum",
                                        type: {
                                            _: "NumberType",
                                        },
                                    },
                                    right: {
                                        _: "Constant",
                                        value: "100",
                                        type: {
                                            _: "NumberType",
                                        },
                                    },
                                },
                            ],
                        },
                    ],
                },
            },
        },
        {
            signature: {
                enclosingClass: {
                    name: "%dflt",
                },
                name: "complexFunction",
                parameters: [
                    {
                        name: "a",
                        type: {
                            _: "NumberType",
                        },
                        isOptional: false,
                    },
                    {
                        name: "b",
                        type: {
                            _: "NumberType",
                        },
                        isOptional: false,
                    },
                    {
                        name: "flag",
                        type: {
                            _: "BooleanType",
                        },
                        isOptional: false,
                    },
                ],
                returnType: {
                    _: "NumberType",
                },
            },
            modifiers: 0,
            typeParameters: [
            ],
            body: {
                locals: [
                    {
                        name: "this",
                        type: {
                            _: "ClassType",
                            signature: {
                                name: "%dflt",
                            },
                        },
                    },
                    {
                        name: "a",
                        type: {
                            _: "NumberType",
                        },
                    },
                    {
                        name: "b",
                        type: {
                            _: "NumberType",
                        },
                    },
                    {
                        name: "flag",
                        type: {
                            _: "BooleanType",
                        },
                    },
                    {
                        name: "result",
                        type: {
                            _: "NumberType",
                        },
                    },
                    {
                        name: "%0",
                        type: {
                            _: "NumberType",
                        },
                    },
                    {
                        name: "%1",
                        type: {
                            _: "NumberType",
                        },
                    },
                    {
                        name: "%2",
                        type: {
                            _: "NumberType",
                        },
                    },
                    {
                        name: "%3",
                        type: {
                            _: "NumberType",
                        },
                    },
                ],
                cfg: {
                    blocks: [
                        {
                            id: 0,
                            successors: [
                                1,
                                7,
                            ],
                            stmts: [
                                {
                                    _: "AssignStmt",
                                    left: {
                                        _: "Local",
                                        name: "a",
                                        type: {
                                            _: "NumberType",
                                        },
                                    },
                                    right: {
                                        _: "ParameterRef",
                                        index: 0,
                                        type: {
                                            _: "NumberType",
                                        },
                                    },
                                },
                                {
                                    _: "AssignStmt",
                                    left: {
                                        _: "Local",
                                        name: "b",
                                        type: {
                                            _: "NumberType",
                                        },
                                    },
                                    right: {
                                        _: "ParameterRef",
                                        index: 1,
                                        type: {
                                            _: "NumberType",
                                        },
                                    },
                                },
                                {
                                    _: "AssignStmt",
                                    left: {
                                        _: "Local",
                                        name: "flag",
                                        type: {
                                            _: "BooleanType",
                                        },
                                    },
                                    right: {
                                        _: "ParameterRef",
                                        index: 2,
                                        type: {
                                            _: "BooleanType",
                                        },
                                    },
                                },
                                {
                                    _: "AssignStmt",
                                    left: {
                                        _: "Local",
                                        name: "this",
                                        type: {
                                            _: "ClassType",
                                            signature: {
                                                name: "%dflt",
                                            },
                                        },
                                    },
                                    right: {
                                        _: "ThisRef",
                                        type: {
                                            _: "ClassType",
                                            signature: {
                                                name: "%dflt",
                                            },
                                        },
                                    },
                                },
                                {
                                    _: "AssignStmt",
                                    left: {
                                        _: "Local",
                                        name: "result",
                                        type: {
                                            _: "NumberType",
                                        },
                                    },
                                    right: {
                                        _: "Constant",
                                        value: "undefined",
                                        type: {
                                            _: "UndefinedType",
                                        },
                                    },
                                },
                                {
                                    _: "IfStmt",
                                    condition: {
                                        _: "ConditionExpr",
                                        op: "!=",
                                        left: {
                                            _: "Local",
                                            name: "flag",
                                            type: {
                                                _: "BooleanType",
                                            },
                                        },
                                        right: {
                                            _: "Constant",
                                            value: "false",
                                            type: {
                                                _: "BooleanType",
                                            },
                                        },
                                        type: {
                                            _: "BooleanType",
                                        },
                                    },
                                },
                            ],
                        },
                        {
                            id: 1,
                            successors: [
                                2,
                            ],
                            stmts: [
                                {
                                    _: "AssignStmt",
                                    left: {
                                        _: "Local",
                                        name: "%2",
                                        type: {
                                            _: "NumberType",
                                        },
                                    },
                                    right: {
                                        _: "BinopExpr",
                                        op: "/",
                                        left: {
                                            _: "Local",
                                            name: "a",
                                            type: {
                                                _: "NumberType",
                                            },
                                        },
                                        right: {
                                            _: "Local",
                                            name: "b",
                                            type: {
                                                _: "NumberType",
                                            },
                                        },
                                    },
                                },
                                {
                                    _: "AssignStmt",
                                    left: {
                                        _: "Local",
                                        name: "%3",
                                        type: {
                                            _: "NumberType",
                                        },
                                    },
                                    right: {
                                        _: "BinopExpr",
                                        op: "+",
                                        left: {
                                            _: "Local",
                                            name: "a",
                                            type: {
                                                _: "NumberType",
                                            },
                                        },
                                        right: {
                                            _: "Local",
                                            name: "b",
                                            type: {
                                                _: "NumberType",
                                            },
                                        },
                                    },
                                },
                                {
                                    _: "AssignStmt",
                                    left: {
                                        _: "Local",
                                        name: "result",
                                        type: {
                                            _: "NumberType",
                                        },
                                    },
                                    right: {
                                        _: "BinopExpr",
                                        op: "-",
                                        left: {
                                            _: "Local",
                                            name: "%2",
                                            type: {
                                                _: "NumberType",
                                            },
                                        },
                                        right: {
                                            _: "Local",
                                            name: "%3",
                                            type: {
                                                _: "NumberType",
                                            },
                                        },
                                    },
                                },
                            ],
                        },
                        {
                            id: 2,
                            successors: [
                                3,
                                6,
                            ],
                            stmts: [
                                {
                                    _: "IfStmt",
                                    condition: {
                                        _: "ConditionExpr",
                                        op: ">",
                                        left: {
                                            _: "Local",
                                            name: "result",
                                            type: {
                                                _: "NumberType",
                                            },
                                        },
                                        right: {
                                            _: "Constant",
                                            value: "100",
                                            type: {
                                                _: "NumberType",
                                            },
                                        },
                                        type: {
                                            _: "BooleanType",
                                        },
                                    },
                                },
                            ],
                        },
                        {
                            id: 3,
                            successors: [
                                4,
                                5,
                            ],
                            stmts: [
                                {
                                    _: "IfStmt",
                                    condition: {
                                        _: "ConditionExpr",
                                        op: "<",
                                        left: {
                                            _: "Local",
                                            name: "result",
                                            type: {
                                                _: "NumberType",
                                            },
                                        },
                                        right: {
                                            _: "Constant",
                                            value: "0",
                                            type: {
                                                _: "NumberType",
                                            },
                                        },
                                        type: {
                                            _: "BooleanType",
                                        },
                                    },
                                },
                            ],
                        },
                        {
                            id: 4,
                            successors: [
                            ],
                            stmts: [
                                {
                                    _: "ReturnStmt",
                                    arg: {
                                        _: "Local",
                                        name: "result",
                                        type: {
                                            _: "NumberType",
                                        },
                                    },
                                },
                            ],
                        },
                        {
                            id: 5,
                            successors: [
                                4,
                            ],
                            stmts: [
                                {
                                    _: "AssignStmt",
                                    left: {
                                        _: "Local",
                                        name: "result",
                                        type: {
                                            _: "NumberType",
                                        },
                                    },
                                    right: {
                                        _: "Constant",
                                        value: "0",
                                        type: {
                                            _: "NumberType",
                                        },
                                    },
                                },
                            ],
                        },
                        {
                            id: 6,
                            successors: [
                                4,
                            ],
                            stmts: [
                                {
                                    _: "AssignStmt",
                                    left: {
                                        _: "Local",
                                        name: "result",
                                        type: {
                                            _: "NumberType",
                                        },
                                    },
                                    right: {
                                        _: "Constant",
                                        value: "100",
                                        type: {
                                            _: "NumberType",
                                        },
                                    },
                                },
                            ],
                        },
                        {
                            id: 7,
                            successors: [
                                2,
                            ],
                            stmts: [
                                {
                                    _: "AssignStmt",
                                    left: {
                                        _: "Local",
                                        name: "%0",
                                        type: {
                                            _: "NumberType",
                                        },
                                    },
                                    right: {
                                        _: "BinopExpr",
                                        op: "*",
                                        left: {
                                            _: "Local",
                                            name: "a",
                                            type: {
                                                _: "NumberType",
                                            },
                                        },
                                        right: {
                                            _: "Local",
                                            name: "b",
                                            type: {
                                                _: "NumberType",
                                            },
                                        },
                                    },
                                },
                                {
                                    _: "AssignStmt",
                                    left: {
                                        _: "Local",
                                        name: "%1",
                                        type: {
                                            _: "NumberType",
                                        },
                                    },
                                    right: {
                                        _: "BinopExpr",
                                        op: "-",
                                        left: {
                                            _: "Local",
                                            name: "a",
                                            type: {
                                                _: "NumberType",
                                            },
                                        },
                                        right: {
                                            _: "Local",
                                            name: "b",
                                            type: {
                                                _: "NumberType",
                                            },
                                        },
                                    },
                                },
                                {
                                    _: "AssignStmt",
                                    left: {
                                        _: "Local",
                                        name: "result",
                                        type: {
                                            _: "NumberType",
                                        },
                                    },
                                    right: {
                                        _: "BinopExpr",
                                        op: "+",
                                        left: {
                                            _: "Local",
                                            name: "%0",
                                            type: {
                                                _: "NumberType",
                                            },
                                        },
                                        right: {
                                            _: "Local",
                                            name: "%1",
                                            type: {
                                                _: "NumberType",
                                            },
                                        },
                                    },
                                },
                            ],
                        },
                    ],
                },
            },
        },
        {
            signature: {
                enclosingClass: {
                    name: "%dflt",
                },
                name: "processInput",
                parameters: [
                    {
                        name: "input",
                        type: {
                            _: "UnionType",
                            types: [
                                {
                                    _: "StringType",
                                },
                                {
                                    _: "NumberType",
                                },
                            ],
                        },
                        isOptional: false,
                    },
                ],
                returnType: {
                    _: "StringType",
                },
            },
            modifiers: 0,
            typeParameters: [
            ],
            body: {
                locals: [
                    {
                        name: "this",
                        type: {
                            _: "ClassType",
                            signature: {
                                name: "%dflt",
                            },
                        },
                    },
                    {
                        name: "input",
                        type: {
                            _: "UnionType",
                            types: [
                                {
                                    _: "StringType",
                                },
                                {
                                    _: "NumberType",
                                },
                            ],
                        },
                    },
                    {
                        name: "%0",
                        type: {
                            _: "StringType",
                        },
                    },
                    {
                        name: "%1",
                        type: {
                            _: "StringType",
                        },
                    },
                ],
                cfg: {
                    blocks: [
                        {
                            id: 0,
                            successors: [
                                1,
                                4,
                            ],
                            stmts: [
                                {
                                    _: "AssignStmt",
                                    left: {
                                        _: "Local",
                                        name: "input",
                                        type: {
                                            _: "UnionType",
                                            types: [
                                                {
                                                    _: "StringType",
                                                },
                                                {
                                                    _: "NumberType",
                                                },
                                            ],
                                        },
                                    },
                                    right: {
                                        _: "ParameterRef",
                                        index: 0,
                                        type: {
                                            _: "UnionType",
                                            types: [
                                                {
                                                    _: "StringType",
                                                },
                                                {
                                                    _: "NumberType",
                                                },
                                            ],
                                        },
                                    },
                                },
                                {
                                    _: "AssignStmt",
                                    left: {
                                        _: "Local",
                                        name: "this",
                                        type: {
                                            _: "ClassType",
                                            signature: {
                                                name: "%dflt",
                                            },
                                        },
                                    },
                                    right: {
                                        _: "ThisRef",
                                        type: {
                                            _: "ClassType",
                                            signature: {
                                                name: "%dflt",
                                            },
                                        },
                                    },
                                },
                                {
                                    _: "IfStmt",
                                    condition: {
                                        _: "ConditionExpr",
                                        op: "===",
                                        left: {
                                            _: "TypeOfExpr",
                                            arg: {
                                                _: "Local",
                                                name: "input",
                                                type: {
                                                    _: "UnionType",
                                                    types: [
                                                        {
                                                            _: "StringType",
                                                        },
                                                        {
                                                            _: "NumberType",
                                                        },
                                                    ],
                                                },
                                            },
                                        },
                                        right: {
                                            _: "Constant",
                                            value: "string",
                                            type: {
                                                _: "StringType",
                                            },
                                        },
                                        type: {
                                            _: "BooleanType",
                                        },
                                    },
                                },
                            ],
                        },
                        {
                            id: 1,
                            successors: [
                                2,
                                3,
                            ],
                            stmts: [
                                {
                                    _: "IfStmt",
                                    condition: {
                                        _: "ConditionExpr",
                                        op: "===",
                                        left: {
                                            _: "TypeOfExpr",
                                            arg: {
                                                _: "Local",
                                                name: "input",
                                                type: {
                                                    _: "UnionType",
                                                    types: [
                                                        {
                                                            _: "StringType",
                                                        },
                                                        {
                                                            _: "NumberType",
                                                        },
                                                    ],
                                                },
                                            },
                                        },
                                        right: {
                                            _: "Constant",
                                            value: "number",
                                            type: {
                                                _: "StringType",
                                            },
                                        },
                                        type: {
                                            _: "BooleanType",
                                        },
                                    },
                                },
                            ],
                        },
                        {
                            id: 2,
                            successors: [
                            ],
                            stmts: [
                                {
                                    _: "ReturnStmt",
                                    arg: {
                                        _: "Constant",
                                        value: "Unknown input",
                                        type: {
                                            _: "StringType",
                                        },
                                    },
                                },
                            ],
                        },
                        {
                            id: 3,
                            successors: [
                            ],
                            stmts: [
                                {
                                    _: "AssignStmt",
                                    left: {
                                        _: "Local",
                                        name: "%1",
                                        type: {
                                            _: "StringType",
                                        },
                                    },
                                    right: {
                                        _: "BinopExpr",
                                        op: "+",
                                        left: {
                                            _: "Constant",
                                            value: "Number input: ",
                                            type: {
                                                _: "StringType",
                                            },
                                        },
                                        right: {
                                            _: "Local",
                                            name: "input",
                                            type: {
                                                _: "UnionType",
                                                types: [
                                                    {
                                                        _: "StringType",
                                                    },
                                                    {
                                                        _: "NumberType",
                                                    },
                                                ],
                                            },
                                        },
                                    },
                                },
                                {
                                    _: "ReturnStmt",
                                    arg: {
                                        _: "Local",
                                        name: "%1",
                                        type: {
                                            _: "StringType",
                                        },
                                    },
                                },
                            ],
                        },
                        {
                            id: 4,
                            successors: [
                            ],
                            stmts: [
                                {
                                    _: "AssignStmt",
                                    left: {
                                        _: "Local",
                                        name: "%0",
                                        type: {
                                            _: "StringType",
                                        },
                                    },
                                    right: {
                                        _: "BinopExpr",
                                        op: "+",
                                        left: {
                                            _: "Constant",
                                            value: "String input: ",
                                            type: {
                                                _: "StringType",
                                            },
                                        },
                                        right: {
                                            _: "Local",
                                            name: "input",
                                            type: {
                                                _: "UnionType",
                                                types: [
                                                    {
                                                        _: "StringType",
                                                    },
                                                    {
                                                        _: "NumberType",
                                                    },
                                                ],
                                            },
                                        },
                                    },
                                },
                                {
                                    _: "ReturnStmt",
                                    arg: {
                                        _: "Local",
                                        name: "%0",
                                        type: {
                                            _: "StringType",
                                        },
                                    },
                                },
                            ],
                        },
                    ],
                },
            },
        },
    ],
};
