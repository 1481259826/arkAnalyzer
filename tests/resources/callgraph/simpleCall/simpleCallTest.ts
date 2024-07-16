class Eye {
}

class Animal{
    eye: Eye;
}

function getMe(input: Animal): Animal {
    let ret = input;
    return ret; 
}

function foo(): void {
    let cat = new Animal();
    let e = new Eye();
    cat.eye = e;
    let catAlias = getMe(cat);

    //let dog = new Animal();
    //let dogAlias = getMe(dog);
}
