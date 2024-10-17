class Color { };
class Animal {
  color: Color;

  constructor(color: Color) {
    this.color = color;
  }

  makeSound() {
  }
}

class Dog extends Animal {
  constructor(color: Color) {
    super(color);
  }

  getColor(): Color {
    return this.color;
  }
}

class Cat extends Animal {
  constructor(color: Color) {
    super(color)
  }
}

function main() {
    const c = new Color();
    const dog = new Dog(c);
    let dc = dog.getColor();
}