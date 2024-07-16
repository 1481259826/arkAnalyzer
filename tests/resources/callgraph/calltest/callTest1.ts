class Dummy{}                                                                                                                                                                                               

function log(): void {
    console.log("Drawing a shape.");
}

// Define the abstract class 'Shape' with an abstract draw method.
abstract class Shape {
    public abstract draw(d:Dummy): void;
}

// Define 'Circle' class that implements 'Shape'.
class Circle extends Shape {
    obj: Dummy;
    draw(d: Dummy): void {
        log();
        this.obj = d;
    }   
}

// Define 'Rectangle' class that implements 'Shape'.
class Rectangle extends Shape {
    draw(d: Dummy): void {
    }   
}

// Identity function that returns the input Shape.
function id(t: Shape): Shape {
    return t;
}

function main () {
    let d = new Dummy();
    const c = new Circle();
    c.draw(d);
    const b1 = id(c);
    b1.draw(d);
}
