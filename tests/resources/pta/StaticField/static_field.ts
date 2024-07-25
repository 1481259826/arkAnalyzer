namespace static_field {
    class B {
    }
    
    class A {
        static b: B;  // 在 TypeScript 中明确指定静态字段的类型
    }
    
    function main(): void {
        A.b = new B();  // 给 A 类的静态字段 b 赋一个新的 B 实例
        const b: B = A.b;  // 从 A 类获取静态字段 b 并存储到局部变量 b
    }    
}