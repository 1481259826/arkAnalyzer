namespace FnPtrTest3 {
    interface Trait {
        f(): void;
        g(): void;
    }

    class MyStruct implements Trait{
        static foo() { }
        bar() { }
        gen<T>(t: T): T {
            return t;
        }

        f() {}
        g() {}
    }

    function times2(value: number): number {
        return 2 * value;
    }

    function id<T>(t: T): T {
        return t;
    }

    function main() {
        let fp1: (value: number) => number = times2;
        fp1(2);

        let fp2: (t: number) => number = id;
        fp2(2);

        let fp3: () => void = MyStruct.foo;
        fp3();

        let m = new MyStruct();
        let fp4: (instance: MyStruct) => void = MyStruct.prototype.bar;
        fp4.call(m);

        let fp5: (instance: MyStruct, t: number) => number = MyStruct.prototype.gen;
        fp5.call(m, 2);

        let fp6: (instance: MyStruct) => void = m.f;
        fp6.call(m);

    }
}