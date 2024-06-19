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

import {SceneConfig} from "../../src/Config";
import * as ty from "../../src/core/base/Type";
import {assert, describe, it} from "vitest";
import {Scene} from "../../src/Scene";
import path from "path";
import {SourceUtils} from "../../src/save/source/SourceUtils";


describe("SourceUtils.typeToString Test", () => {
    let config: SceneConfig = new SceneConfig();
    config.buildFromProjectDir(path.join(__dirname, "../resources/save"));
    let scene = new Scene();
    scene.buildSceneFromProjectDir(config);
    let arkClass = scene.getClasses().find(cls => cls.getName() == 'Animal');

    it('TypeLiteralType case', () => {
        if (arkClass == null) {
            assert.isNotNull(arkClass);
            return;
        }
        let type = new ty.TypeLiteralType();
        type.setMembers(arkClass.getFields());
        assert.equal(SourceUtils.typeToString(type), "{name:undefined}");
    })

    it('Array case', () => {
        let type = [1, 2];
        assert.equal(SourceUtils.typeToString(type), "1 | 2");
    })

    it('LiteralType case', () => {
        let type = new ty.LiteralType("BooleanKeyword");
        assert.equal(SourceUtils.typeToString(type), "boolean");
    })

    it('UnknownType case', () => {
        let type = new ty.UnknownType();
        assert.equal(SourceUtils.typeToString(type), "any");
    })

    it('ClassType case', () => {
        if (arkClass == null) {
            assert.isNotNull(arkClass);
            return;
        }
        let type = new ty.ClassType(arkClass.getSignature());
        assert.equal(SourceUtils.typeToString(type), "Animal");
    })


    it('ArrayType case 1', () => {
        let type = new ty.ArrayType(ty.UnknownType.getInstance(), 2);
        assert.equal(SourceUtils.typeToString(type), "(any)[][]");
    })
    it('ArrayType case 2', () => {
        let type = new ty.ArrayType(ty.StringType.getInstance(), 1);
        assert.equal(SourceUtils.typeToString(type), "string[]");
    })

    it('VoidType case', () => {
        let type = new ty.VoidType();
        assert.equal(SourceUtils.typeToString(type), "void");
    })
})


describe("SourceUtils.typeArrayToString Test", () => {

    it('normal case', () => {
        let types = [ty.VoidType.getInstance(), ty.StringType.getInstance()];
        assert.equal(SourceUtils.typeArrayToString(types), "void,string");
    })
    it('normal case', () => {
        let types = [ty.UnknownType.getInstance(), ty.StringType.getInstance()];
        assert.equal(SourceUtils.typeArrayToString(types, "@"), "any@string");
    })
})