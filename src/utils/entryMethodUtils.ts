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
import { Scene } from '../Scene';
import { ArkClass } from '../core/model/ArkClass';

export const LifecycleMethods: string[] = ['onCreate', 'onDestroy', 'onWindowStageCreate', 'onWindowStageDestroy', 'onForeground', 'onBackground', 'onBackup', 'onRestore'];

export interface AbilityMessage {
    srcEntry: string;
    name: string;
}

export function getAbilities(abilities: AbilityMessage[], modulePath: string, scene: Scene): ArkClass[] {
    const abilitiyClasses: ArkClass[] = [];
    for (const ablility of abilities) {
        const filePath = path.join(modulePath, 'src', 'main', ablility.srcEntry);
        for (const file of scene.getFiles()) {
            if (file.getFilePath() == filePath) {
                for (const arkClass of file.getClasses()) {
                    if (arkClass.getName() == ablility.name && arkClass.isExported()) {
                        abilitiyClasses.push(arkClass);
                        break;
                    }
                }
                break;
            }
        }
    }
    return abilitiyClasses;
}