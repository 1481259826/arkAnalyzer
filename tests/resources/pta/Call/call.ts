namespace call {
    function main() {
        let a: A = new A();
        let b: B = new B();
        let c: C = new C();
        let x: C = a.foo(b, c);
        // PTAAssert.calls("<A: C foo(B,C)>")
        // PTAAssert.equals(x, c);
    }
    
    class A {
        foo(b: B, c: C): C {
            return c;
        }
    }
    
    class B {
    }
    
    class C {
    }
    
}