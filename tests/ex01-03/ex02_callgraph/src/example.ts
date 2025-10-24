abstract class Animal {
    sound(): void {}
}

class Dog extends Animal {
    sound(): void {
        console.log("Woof!");
    }
}

class Cat extends Animal {
    sound(): void {
        console.log("Meow!");
    }
}

function main() {
    makeSound(new Dog());
}

function makeSound(animal: Animal) {
    animal.sound();
}
