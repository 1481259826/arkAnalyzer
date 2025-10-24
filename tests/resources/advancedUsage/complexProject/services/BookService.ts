// ===== 文件: services/BookService.ts =====

import { Book } from '../models/Book';

export class BookService {
    private books: Map<number, Book>;
    private cache: Map<string, Book[]>;

    constructor() {
        this.books = new Map();
        this.cache = new Map();
    }

    public async getBookById(id: number): Promise<Book | null> {
        const book = this.books.get(id);
        return book || null;
    }

    public async getAllBooks(): Promise<Book[]> {
        return Array.from(this.books.values());
    }

    public async searchBooks(keyword: string): Promise<Book[]> {
        if (this.cache.has(keyword)) {
            return this.cache.get(keyword)!;
        }

        const allBooks = await this.getAllBooks();
        const results = allBooks.filter(book => {
            const titleMatch = book.getTitle().toLowerCase().includes(keyword.toLowerCase());
            const authorMatch = book.getAuthor().toLowerCase().includes(keyword.toLowerCase());
            return titleMatch || authorMatch;
        });

        this.cache.set(keyword, results);
        return results;
    }

    public async getBooksByAuthor(author: string): Promise<Book[]> {
        const allBooks = await this.getAllBooks();
        return allBooks.filter(book => book.getAuthor() === author);
    }

    public async addBook(book: Book): Promise<boolean> {
        this.books.set(book.getId(), book);
        this.clearCache();
        return true;
    }

    public async updateBook(book: Book): Promise<boolean> {
        if (!this.books.has(book.getId())) {
            return false;
        }
        this.books.set(book.getId(), book);
        this.clearCache();
        return true;
    }

    public async deleteBook(id: number): Promise<boolean> {
        const result = this.books.delete(id);
        this.clearCache();
        return result;
    }

    private clearCache(): void {
        this.cache.clear();
    }

    public async getLowStockBooks(threshold: number): Promise<Book[]> {
        const allBooks = await this.getAllBooks();
        return allBooks.filter(book => book.getStock() < threshold);
    }

    public static getInstance(): BookService {
        return new BookService();
    }
}
