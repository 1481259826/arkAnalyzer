namespace assign {
    class A {

    }

    class B extends A {

    }

    function main() {
        let a1: A = new A();
        let a2: A = a1;
        let a3: A = a1;
        let b: B = new B();
        a1 = b;
    }
}