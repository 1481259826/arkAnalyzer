class Test {
    obj: Test;
 }

function main() {
    let a = new Test();
    let b: Test = new Test();

    let c = new Test();
    a.obj = c;
    b = a.obj;

    swap(a, b);
    swap(b,a);
}

function swap(in1: Test, in2: Test) {
    let t = in1;
    in1 = in2;
    in2 = t;
}