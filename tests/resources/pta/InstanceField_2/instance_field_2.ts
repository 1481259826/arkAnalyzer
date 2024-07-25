namespace instance_field_2 {
    class InstanceField2 {
        private field: Object;
    
        constructor() {
            this.field = {};
        }
    
        static main(): void {
            InstanceField2.entry1();
            InstanceField2.entry2();
        }
    
        static entry1(): void {
            new InstanceField2().f();
        }
    
        static entry2(): void {
            new InstanceField2().f();
        }
    
        private f(): void {
            this.field = new Object();
            this.g();
        }
    
        private g(): void {
            const local: Object = this.field;
        }
    }

    function main() {
        InstanceField2.main();
    }

}