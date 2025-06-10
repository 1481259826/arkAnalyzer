/**
 * A ContextItem represents a unique context in the program.
 */
export interface ContextItem {
    readonly id: number;
    getSignature(): string;
}

export class CallsiteContextItem implements ContextItem {
    readonly id: number;
    readonly callSiteId: number;
    readonly calleeFuncId: number;

    constructor(id: number, callSiteId: number, calleeFuncId: number) {
        this.id = id;
        this.callSiteId = callSiteId;
        this.calleeFuncId = calleeFuncId;
    }

    getSignature(): string {
        return `CS:${this.callSiteId}-${this.calleeFuncId}`;
    }
}

export class ObjectContextItem implements ContextItem {
    readonly id: number;
    readonly nodeID: number;

    constructor(id: number, allocationSiteId: number) {
        this.id = id;
        this.nodeID = allocationSiteId;
    }

    getSignature(): string {
        return `OBJ:${this.nodeID}`;
    }
}

/**
 * Manages the creation and unique identification of all ContextItems.
 * This ensures that each unique item (based on its signature) has one and only one ID.
 */
export class ContextItemManager {
    private itemToIdMap: Map<string, number> = new Map();
    private idToItemMap: Map<number, ContextItem> = new Map();
    private nextItemId: number = 0;

    public getOrCreateCallSiteItem(callSiteId: number, calleeFuncID: number): CallsiteContextItem {
        const signature = `CS:${callSiteId}-${calleeFuncID}`;
        if (this.itemToIdMap.has(signature)) {
            const id = this.itemToIdMap.get(signature)!;
            return this.idToItemMap.get(id) as CallsiteContextItem;
        }

        const id = this.nextItemId++;
        const item = new CallsiteContextItem(id, callSiteId, calleeFuncID);
        this.itemToIdMap.set(signature, id);
        this.idToItemMap.set(id, item);
        return item;
    }
    
    public getOrCreateObjectItem(allocationSiteId: number): ObjectContextItem {
        const signature = `OBJ:${allocationSiteId}`;
        if (this.itemToIdMap.has(signature)) {
            const id = this.itemToIdMap.get(signature)!;
            return this.idToItemMap.get(id) as ObjectContextItem;
        }
        
        const id = this.nextItemId++;
        const item = new ObjectContextItem(id, allocationSiteId);
        this.itemToIdMap.set(signature, id);
        this.idToItemMap.set(id, item);
        return item;
    }

    public getItem(id: number): ContextItem | undefined {
        return this.idToItemMap.get(id);
    }
}