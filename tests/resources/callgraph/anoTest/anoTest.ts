namespace AnoTest {

    class Fru { }

    class Foo {
        fmap: Set<Fru> = new Set();

        fooFun() {
            this.fmap.forEach(elem => {
                gfun(elem);
            })
        }
    }

    function gfun(fru: Fru) {
        return fru;
    }

    function main() {
        let foo = new Foo();

        foo.fooFun();
    }
}
