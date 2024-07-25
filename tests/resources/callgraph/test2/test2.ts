namespace test2 {
    class Number {

    }

    class One extends Number {

    }

    class Two extends Number {

    }

    class X {
        f: Number
    }

    function newX(p: Number): X {
        let x: X = new X()
        x.f = p
        return x
    }

    function main() {
        let n1 = new One()
        let n2 = new Two()
        let x1 = newX(n1)
        let x2 = newX(n2)
        let n = x1.f
    }
}