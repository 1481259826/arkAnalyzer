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

import { City } from '@hmos/worldclock';
import Rename from '@hmos/worldclock/src/main/ets/RenameTest';

@Entry
@Component
struct Page {
    @State message: string = 'Hello';
    @State counter: number = 0;
    private timerId: number = -1;

    aboutToAppear(): void {
        console.info('Page aboutToAppear');
        this.message = 'Component Loaded';
        this.counter = 0;

        this.timerId = setInterval(() => {
            this.counter++;
        }, 1000);
    }

    build() {
        Column() {
            Text(this.message)
                .fontSize(20)
                .margin(10)

            Text(`Counter: ${this.counter}`)
                .fontSize(18)
                .margin(10)

            Button('Click Me')
                .onClick(() => {
                    this.counter++;
                })
                .margin(10)

            City()
            Rename()
        }
        .width('100%')
    }

    onDidBuild(): void {
        console.info('Page onDidBuild');
        console.info(`Message: ${this.message}, Counter: ${this.counter}`);
    }

    aboutToDisappear(): void {
        console.info('Page aboutToDisappear');
        if (this.timerId !== -1) {
            clearInterval(this.timerId);
        }
    }
}
