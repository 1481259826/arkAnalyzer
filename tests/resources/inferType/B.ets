import { mySpace } from './Target';

export function funcB() {
    mySpace.funcTarget();
}

export class ClassB {
    public methodB() {
        let b = new mySpace.ClassTarget();
        b.methodTarget();
        let d = b.funcTarget();
    }
}