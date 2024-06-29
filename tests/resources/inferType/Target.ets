export namespace mySpace {

    export function funcTarget() {
        console.log('funcTarget');
    }

    export class ClassTarget {
        public fieldA = '111';
        static staticField = 123;

        public methodTarget() {
            let a = this.fieldA;
        }

        static staticFunc() {
            let b = ClassTarget.staticField;
            console.log('123');
        }

        public funcTarget() {
            console.log('ClassTarget.funcTarget')
        }
    }
}

export class ClassTarget {
    public fieldA = '1111';
    static staticField = 1234;

    public methodTarget() {
        let a = this.fieldA;
    }

    static staticFunc() {
        let b = ClassTarget.staticField;
        console.log('1234');
    }

    public funcTarget() {
        console.log('ClassTarget.funcTargetC')
    }
}