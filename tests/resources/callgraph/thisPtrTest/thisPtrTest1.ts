class Dummy {}

class Sharp {
    d: Dummy;

    constructor(input: Dummy) {
        this.d = input;
    }

    setD(input: Dummy) {
        this.d = input;
    }

    getD(): Dummy {
        return this.d;
    }
}

function main() {
    let d1 = new Dummy();
    let d2 = new Dummy();

    let s1 = new Sharp(d1);
    s1.setD(d2);
    let s2 = s1

    let d3 = s1.getD();
//    let d4 = s2.getD();
}
