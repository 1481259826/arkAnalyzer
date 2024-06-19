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

@Entry
@Component
struct Parent {
@State simpleList: Array<string> = ['one', 'two', 'three'];

    build() {
        Row() {
            Column() {
                Repeat<string>(this.simpleList)
                    .each((obj: RepeatItem<string>)=>{
                        ChildItem({ item: obj.item })
                    })
                    .key((item: string) => item)
            }
        .width('100%')
                .height('100%')
        }
    .height('100%')
            .backgroundColor(0xF1F3F5)
    }
}

@Component
struct ChildItem {
@Prop item: string;

    build() {
        Text(this.item)
            .fontSize(50)
    }
}