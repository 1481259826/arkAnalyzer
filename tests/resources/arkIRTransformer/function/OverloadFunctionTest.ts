function overloadedFunction1(x: number): string;
function overloadedFunction1(x: string): number;
function overloadedFunction1(x: any): any {
    if (typeof x === 'number') {
        return 'this is number';
    } else if (typeof x === 'string') {
        return 123;
    }
}

class overloadClass {
    public overloadedFunction2(x: number, y: number): string;
    public overloadedFunction2(x: string, y: string): number;
    public overloadedFunction2(x: string, y: string): string;
    public overloadedFunction2(x: number | string, y: number | string): string | number {
        if (typeof x === 'number' && typeof y === 'number') {
            return 'this is number';
        } else if (typeof x === 'string' && typeof y === 'string') {
            return 123;
        }
    }
}

namespace overloadNamespace {
    function overloadedFunction3(x: number): string;
    function overloadedFunction3(x: string): number;
    function overloadedFunction3(x: string): boolean;
}

function overloadedFunction4(x: string): number;