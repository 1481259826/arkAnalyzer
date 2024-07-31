namespace instance_field {
    class A {
        b: B;
    
        longAP(): void {
            const a = new A();
            a.b = new B();
            a.b.c = new C();
            a.b.c.d = new D();
            const x: D = a.b.c.d;
        }
    
        cycle(): void {
            const a = new A();
            const b = new B();
            b.a = a;
            a.b = b;
            const x: A = b.a.b.a;
        }
    
        callField(): void {
            const a = new A();
            const b = new B();
            a.b = b;
            const c: C = a.b.foo();
        }
    }
    
    class B {
        a: A;
        c: C;
    
        foo(): C {
            const x = new C();
            return x;
        }
    }
    
    class C {
        d: D;
    }
    
    class D {
    }
    
    // Mimicking the Java 'main' method
    function main(): void {
        const a = new A();
        a.longAP();
        a.cycle();
        a.callField();
    }
}