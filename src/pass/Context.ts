export type AnyKey<T> = { new(): T };

export interface CtxArg {
    readonly name: string;
}

// uniq map for uniq type as key
export type UniMap<T> = Map<AnyKey<T>, T>;

interface Upper {
    readonly upper: Upper;
    readonly unreachable: boolean;
}

export class UpperRoot implements Upper {
    readonly upper: any;
    readonly unreachable = true;
    private static INSTANCE = new UpperRoot();

    static getInstance(): UpperRoot {
        return UpperRoot.INSTANCE;
    }
}

export class Context<U extends Upper, T> implements Upper {
    unreachable: boolean = false;
    upper: U;
    args: UniMap<T>;

    constructor(upper: U) {
        this.upper = upper;
        this.args = new Map();
    }

    get<K extends T>(k: AnyKey<K>): K | undefined {
        return this.args.get(k) as K;
    }

    set<K extends T>(k: AnyKey<K>, v: K) {
        return this.args.set(k, v);
    }

    remove<K extends T>(k: AnyKey<K>): K | undefined {
        const v = this.get(k);
        this.args.delete(k);
        return v;
    }

    root(): Upper {
        let up: Upper = this;
        // upper is root,
        while (!up.upper.unreachable) {
            up = up.upper;
        }
        return up;
    }
}