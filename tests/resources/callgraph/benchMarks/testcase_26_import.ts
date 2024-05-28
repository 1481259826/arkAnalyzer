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

/**
 * 6/6
 * 2/2
 * testcase_26_import.ts
 */

import { DataProcessor } from "./lib/d";

// 导入库文件中的类

// 创建 DataProcessor 类的实例
const processor = new DataProcessor();

// 使用 DataProcessor 实例调用 processData 方法
const result = processor.processData("Hello", 5);
