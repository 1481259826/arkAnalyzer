// ===== 文件: services/OrderService.ts =====

import { BookService } from './BookService';

export class OrderService {
    private orders: Map<number, Order>;
    private bookService: BookService;

    constructor(bookService: BookService) {
        this.orders = new Map();
        this.bookService = bookService;
    }

    public async createOrder(userId: number, items: OrderItem[]): Promise<number> {
        const orderId = this.orders.size + 1;
        const order = new Order(orderId, userId, items);
        this.orders.set(orderId, order);
        return orderId;
    }

    public async getOrderById(id: number): Promise<Order | null> {
        return this.orders.get(id) || null;
    }

    public async getOrdersByUser(userId: number): Promise<Order[]> {
        return Array.from(this.orders.values())
            .filter(order => order.userId === userId);
    }

    public async cancelOrder(orderId: number): Promise<boolean> {
        const order = this.orders.get(orderId);
        if (!order) {
            return false;
        }
        order.status = 'cancelled';
        return true;
    }

    public async calculateTotal(orderId: number): Promise<number> {
        const order = this.orders.get(orderId);
        if (!order) {
            return 0;
        }
        return order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    }

    private async validateStock(items: OrderItem[]): Promise<boolean> {
        for (const item of items) {
            const book = await this.bookService.getBookById(item.bookId);
            if (!book || book.getStock() < item.quantity) {
                return false;
            }
        }
        return true;
    }
}

export class Order {
    public id: number;
    public userId: number;
    public items: OrderItem[];
    public status: string;

    constructor(id: number, userId: number, items: OrderItem[]) {
        this.id = id;
        this.userId = userId;
        this.items = items;
        this.status = 'pending';
    }
}

export class OrderItem {
    public bookId: number;
    public quantity: number;
    public price: number;

    constructor(bookId: number, quantity: number, price: number) {
        this.bookId = bookId;
        this.quantity = quantity;
        this.price = price;
    }
}
