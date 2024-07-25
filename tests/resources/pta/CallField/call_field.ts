namespace call_field {
    function main() {
        let a: A = new A();
        a.setget();
        a.modifyParam();
    }
    
    class A {
        setget(): void {
            let b: B = new B();
            b.set(new C());
            let c: C = b.get();
        }

        modifyParam(): void {
            let b1: B = new B();
            let b2: B = new B();
            b1.setC(b2);
            let c: C = b2.c;
        }
    }
    
    class B {
        c: C;
    
        set(c: C): void {
            this.c = c;
        }
    
        get(): C {
            return this.c;
        }
    
        setC(b: B): void {
            b.c = new C();
        }
    }
    
    class C {
    }
}