// Clock.ets - 子组件
@Component
export struct Clock {
  @Link hour: number;
  @Prop minute: number;

  build() {
    Row() {
      Text(`${this.hour}:${this.minute}`)
        .fontSize(20)
    }
  }
}
