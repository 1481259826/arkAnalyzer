namespace static_call {
    class StaticCall {
        static foo(n: number, o: Object): Object {
            if (n < 0) {
                return StaticCall.bar(n, o);
            }
            return o;
        }
    
        static bar(n: number, o: Object): Object {
            return StaticCall.foo(n - 1, o); // 注意，这里使用 n - 1 而不是 n-- 来避免可能的递归调用中的副作用
        }
    }
    
    function main(): void {
        const o = StaticCall.foo(100, new Object());
    }
}