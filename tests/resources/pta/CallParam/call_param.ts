namespace call_param {
    function main() {
        let a: A = new A();
        a.param();
        let b: B = a.id(new B());
    }
    
    class A {
        param(): void {
            let b1: B = new B();
            let b2: B = new B();
            this.foo(b1, b2);
            this.bar(b2, b1);
        }
    
        foo(p1: B, p2: B): void {
        }
    
        bar(p1: B, p2: B): void {
        }
    
        id(b: B): B {
            return b;
        }
    }
    
    class B {
    }
}