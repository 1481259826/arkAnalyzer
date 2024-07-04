import { MySpace } from './Target';

export function funcB() {
    MySpace.funcTarget();
}

export class ClassB extends MySpace.ClassTarget {
    public methodB() {
        let b = new MySpace.ClassTarget();
        b.methodTarget();
        let d = b.funcTarget();
    }
}