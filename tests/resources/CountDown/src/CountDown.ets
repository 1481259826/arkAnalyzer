// CountDown.ets - 父组件
import { Clock } from './Clock';

@Entry
@Component
export struct CountDown {
  @State currentHour: number = 12;
  @State currentMinute: number = 30;

  build() {
    Column() {
      Text('Countdown Timer')
        .fontSize(24)
        .margin(10)

      Clock({ hour: $currentHour, minute: $currentMinute })

      Button('Start')
        .onClick(() => {
          this.currentHour = 0;
          this.currentMinute = 0;
        })
    }
  }
}
