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
namespace loadTest1 {
    class Dummy {

    }

    class Line {
        obj: Dummy
    }
    class Circle {
        line: Line
    }

    function main() {
        let d = new Dummy();
        let e = new Line();
        let c = new Circle();
        const c2 = new Circle();
        c = c2;
        c.line = e;
        let f = c.line
    }
}