namespace FnPtrTest1 {
    function foo(f: (x: number) => number): void {
        f(2);
    }

    function main() {
        const c = (x: number): number => x * 2;

        foo(c);
    }
}