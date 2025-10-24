// ===== 文件: models/Book.ts =====

export class Book {
    private id: number;
    private title: string;
    private author: string;
    private isbn: string;
    private price: number;
    private stock: number;
    private readonly createdAt: Date;

    constructor(id: number, title: string, author: string, isbn: string, price: number) {
        this.id = id;
        this.title = title;
        this.author = author;
        this.isbn = isbn;
        this.price = price;
        this.stock = 0;
        this.createdAt = new Date();
    }

    public getId(): number {
        return this.id;
    }

    public getTitle(): string {
        return this.title;
    }

    public getAuthor(): string {
        return this.author;
    }

    public getPrice(): number {
        return this.price;
    }

    public getStock(): number {
        return this.stock;
    }

    public setStock(stock: number): void {
        this.stock = stock;
    }

    public isAvailable(): boolean {
        return this.stock > 0;
    }

    public static createFromData(data: any): Book {
        return new Book(data.id, data.title, data.author, data.isbn, data.price);
    }
}

export class User {
    private id: number;
    private username: string;
    private email: string;
    private role: string;

    constructor(id: number, username: string, email: string) {
        this.id = id;
        this.username = username;
        this.email = email;
        this.role = 'member';
    }

    public getId(): number {
        return this.id;
    }

    public getUsername(): string {
        return this.username;
    }

    public isAdmin(): boolean {
        return this.role === 'admin';
    }

    public setRole(role: string): void {
        this.role = role;
    }
}
