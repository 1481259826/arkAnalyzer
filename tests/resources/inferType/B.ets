import { MySpace } from './Target';

export function funcB() {
    mySpace.funcTarget();
}

export class ClassB {
    public methodB() {
        let b = new MySpace.ClassTarget();
        b.methodTarget();
        let d = b.funcTarget();
    }
}