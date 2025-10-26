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

// 共享的应用状态数据
@Observed
class AppData {
    userName: string = '';
    userAge: number = 0;
    loginTime: number = 0;
}

// 子组件 - 使用 @ObjectLink 接收数据
@Component
struct UserProfile {
    @ObjectLink appData: AppData;
    @Link parentCounter: number;
    @State localStatus: string = 'Active';

    aboutToAppear(): void {
        console.info('UserProfile aboutToAppear');
        this.localStatus = 'Initialized';
    }

    build() {
        Column() {
            Text(`User: ${this.appData.userName}`)
                .fontSize(18)
                .margin(5)
            Text(`Age: ${this.appData.userAge}`)
                .fontSize(16)
                .margin(5)
            Text(`Status: ${this.localStatus}`)
                .fontSize(14)
                .fontColor('#666')
                .margin(5)
            Text(`Parent Counter: ${this.parentCounter}`)
                .fontSize(14)
                .margin(5)

            Button('Update Local Status')
                .onClick(() => {
                    this.localStatus = 'Updated';
                })
                .margin(5)
        }
        .width('90%')
        .padding(10)
        .backgroundColor('#E8F5E9')
        .borderRadius(8)
        .margin(10)
    }

    onDidBuild(): void {
        console.info('UserProfile onDidBuild');
    }

    aboutToDisappear(): void {
        console.info('UserProfile aboutToDisappear');
    }
}

// 主页面组件 - 包含完整生命周期和数据流
@Entry
@Component
struct Page {
    // @State: 组件内部状态,变化时触发UI刷新
    @State message: string = 'Hello ArkUI';
    @State counter: number = 0;
    @State isVisible: boolean = true;

    // @Provide/@Consume: 跨组件层级传递数据
    @Provide('sharedCount') sharedCount: number = 0;

    // @StorageLink: 与应用全局状态同步
    @StorageLink('globalTheme') theme: string = 'light';

    // @LocalStorageLink: 与页面级存储同步
    @LocalStorageLink('pageData') pageData: string = 'default';

    // 复杂对象状态
    @State appData: AppData = new AppData();

    private timerId: number = -1;

    /**
     * 生命周期:组件即将出现
     * 用于初始化数据、订阅事件、启动定时器等
     */
    aboutToAppear(): void {
        console.info('=== Page aboutToAppear START ===');

        // 初始化数据
        this.message = 'Component Loading...';
        this.counter = 0;
        this.sharedCount = 100;

        // 初始化复杂对象
        this.appData.userName = 'Zhang San';
        this.appData.userAge = 25;
        this.appData.loginTime = Date.now();

        // 模拟异步数据加载
        setTimeout(() => {
            this.message = 'Data Loaded Successfully';
            this.appData.userName = 'Li Si';
            console.info('Async data loaded');
        }, 1000);

        // 启动定时器更新数据
        this.timerId = setInterval(() => {
            this.counter++;
            this.sharedCount++;
        }, 2000);

        // 初始化全局存储
        AppStorage.setOrCreate('globalTheme', 'dark');

        console.info('=== Page aboutToAppear END ===');
    }

    /**
     * 生命周期:构建UI
     * 必须实现的函数,描述组件UI结构
     */
    build() {
        Column() {
            // 标题区域
            Text(this.message)
                .fontSize(24)
                .fontWeight(FontWeight.Bold)
                .margin({ top: 20, bottom: 10 })

            // 数据展示区域
            Text(`Counter: ${this.counter}`)
                .fontSize(18)
                .margin(5)

            Text(`Shared Count: ${this.sharedCount}`)
                .fontSize(18)
                .margin(5)

            Text(`Theme: ${this.theme}`)
                .fontSize(16)
                .margin(5)

            Text(`Page Data: ${this.pageData}`)
                .fontSize(16)
                .margin(5)

            // 操作按钮区域
            Row() {
                Button('Increment')
                    .onClick(() => {
                        this.counter++;
                        this.sharedCount++;
                    })
                    .margin(5)

                Button('Update User')
                    .onClick(() => {
                        this.appData.userName = 'Wang Wu';
                        this.appData.userAge++;
                    })
                    .margin(5)

                Button('Toggle Child')
                    .onClick(() => {
                        this.isVisible = !this.isVisible;
                    })
                    .margin(5)
            }
            .margin({ top: 10, bottom: 10 })

            Button('Change Theme')
                .onClick(() => {
                    this.theme = this.theme === 'light' ? 'dark' : 'light';
                    AppStorage.set('globalTheme', this.theme);
                })
                .margin(5)

            Divider()
                .margin({ top: 15, bottom: 15 })

            // 条件渲染子组件 - 演示数据流传递
            if (this.isVisible) {
                UserProfile({
                    appData: this.appData,
                    parentCounter: this.counter
                })
            }

            Divider()
                .margin({ top: 15, bottom: 15 })

            // 嵌套子组件 - 使用 @Consume 接收数据
            ConsumerChild()

            Divider()
                .margin({ top: 15, bottom: 15 })

            // 外部导入的组件
            City()
            Rename()
        }
        .width('100%')
        .height('100%')
        .padding(20)
        .backgroundColor(this.theme === 'light' ? '#F5F5F5' : '#303030')
    }

    /**
     * 生命周期:UI构建完成
     * 在build执行完成后调用,此时UI已渲染完成
     */
    onDidBuild(): void {
        console.info('=== Page onDidBuild ===');
        console.info(`Current message: ${this.message}`);
        console.info(`Current counter: ${this.counter}`);
        console.info(`User info: ${this.appData.userName}, ${this.appData.userAge}`);
        console.info(`Theme: ${this.theme}`);
        console.info(`Child visible: ${this.isVisible}`);
    }

    /**
     * 生命周期:组件即将销毁
     * 用于清理资源、取消订阅、清除定时器等
     */
    aboutToDisappear(): void {
        console.info('=== Page aboutToDisappear START ===');

        // 清理定时器
        if (this.timerId !== -1) {
            clearInterval(this.timerId);
            this.timerId = -1;
            console.info('Timer cleared');
        }

        // 保存数据到存储
        AppStorage.set('lastCounter', this.counter);

        // 清理资源
        this.counter = 0;
        this.sharedCount = 0;
        this.appData = new AppData();

        console.info('=== Page aboutToDisappear END ===');
    }
}

// 使用 @Consume 接收祖先组件的数据
@Component
struct ConsumerChild {
    @Consume('sharedCount') sharedCount: number;
    @State localMessage: string = '';

    aboutToAppear(): void {
        console.info('ConsumerChild aboutToAppear');
        this.localMessage = `Received shared count: ${this.sharedCount}`;
    }

    build() {
        Column() {
            Text('Consumer Child Component')
                .fontSize(16)
                .fontWeight(FontWeight.Bold)
                .margin(5)

            Text(this.localMessage)
                .fontSize(14)
                .margin(5)

            Text(`Current Shared Count: ${this.sharedCount}`)
                .fontSize(14)
                .margin(5)

            Button('Update Message')
                .onClick(() => {
                    this.localMessage = `Updated at: ${Date.now()}`;
                })
                .margin(5)
        }
        .width('90%')
        .padding(10)
        .backgroundColor('#FFF3E0')
        .borderRadius(8)
        .margin(10)
    }

    onDidBuild(): void {
        console.info('ConsumerChild onDidBuild');
    }

    aboutToDisappear(): void {
        console.info('ConsumerChild aboutToDisappear');
    }
}
