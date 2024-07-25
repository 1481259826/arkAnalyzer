// ts源码
class A {
    num: Number = 1;
    cat: Cat = new Cat('kitty');
    dog: Dog = foo()
    num1: Number = 1 + 2 + 3
}


// arkanalyzer表示
// class A{

//     cat {initialzer：temp0}
//     num {initialzer: 1}

//     // 实例属性初始化
//     private $instance_init() {
//         temp0 = new Cat
//         invoke constructor("kitty")
//         cat = temp0
//         this.num = 1
//         dog = invoke foo()
//     }

//     // 静态属性初始化
//     private $static_init(){

//     }

//     constructor() {
//         invoke $instance_init()
//         num = 2;
//     }
// }