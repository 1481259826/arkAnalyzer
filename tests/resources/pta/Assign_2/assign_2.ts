namespace assign_2 {
    function main() {
        new A().cycle();
    }
    
    class A {
        cycle(): void {
            let a1: A = new A();
            let a2: A = new A();
            let a3: A = new A();
            a1 = a2;
            a2 = a3;
            a3 = a1;
        }
    }
}