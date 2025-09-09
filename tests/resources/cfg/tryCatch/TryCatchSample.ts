function case1(): void {
    let i = 0;
    try {
        if (i !== 0) {
            let y = 10 / i;
        }
    } catch (e) {
        console.log("i === 0");
    }
}