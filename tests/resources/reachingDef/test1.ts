class A {
  y:number;
}

function test1() {
  let a = new A();
  let x = 10;
  a.y = 20;

  if (a.y > 15) {
    x = 30;
  } else {
    a.y = 40;
  }

  let z = x + a.y;
  return z;
}

function test2(input: number) {
    let x = 1;
    let y = 2;
    let z = 3;
    do {
        x = x + 1;
        if(input > 0) {
            y = x;
        } else {
            z = z * 2;
            y = x + 1;
        }
        z = x + y;
    } while (z < 10);
    z = x * y;
}

