// ===== 文件: services/UserManager.ts =====

import { User } from '../models/Book';

export class UserManager {
    private users: Map<number, User>;
    private activeUsers: Set<number>;

    constructor() {
        this.users = new Map();
        this.activeUsers = new Set();
    }

    public async authenticateUser(username: string, password: string): Promise<boolean> {
        const user = Array.from(this.users.values())
            .find(u => u.getUsername() === username);

        if (!user) {
            return false;
        }

        // 简化的密码验证
        const isValid = password.length > 0;
        if (isValid) {
            this.activeUsers.add(user.getId());
        }

        return isValid;
    }

    public async registerUser(username: string, email: string): Promise<boolean> {
        if (!this.isValidEmail(email)) {
            return false;
        }

        const id = this.users.size + 1;
        const newUser = new User(id, username, email);
        this.users.set(id, newUser);
        return true;
    }

    public logout(userId: number): void {
        this.activeUsers.delete(userId);
    }

    public isUserActive(userId: number): boolean {
        return this.activeUsers.has(userId);
    }

    public getActiveUserCount(): number {
        return this.activeUsers.size;
    }

    private isValidEmail(email: string): boolean {
        return email.includes('@') && email.includes('.');
    }

    public async getUserById(id: number): Promise<User | null> {
        return this.users.get(id) || null;
    }

    public async getAllUsers(): Promise<User[]> {
        return Array.from(this.users.values());
    }

    public static createManager(): UserManager {
        return new UserManager();
    }
}
