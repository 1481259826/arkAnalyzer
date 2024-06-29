import { Local } from "../../core/base/Local"
import { Value } from "../../core/base/Value"
import { FieldSignature, MethodSignature } from "../../core/model/ArkSignature"


export let CONTEXT_SENSITIVE_DEPTH = 1

export function ModifyCallSiteDepth(depth: number) {
    CONTEXT_SENSITIVE_DEPTH = depth
}

export abstract class Context {
    private location: string

    constructor(localtion: string) {
        this.location = localtion
    }

    public getLocation() {
        return this.location
    }

    abstract equal(targetContext: Context): boolean
    abstract toString(): string
}

export class InsensitiveContext extends Context {
    constructor(sourceMethod: MethodSignature, position: number) {
        super(sourceMethod.toString()+":"+position)
    }

    toString(): string {
        return this.getLocation()
    }

    equal(targetContext: Context): boolean {
        if (targetContext instanceof InsensitiveContext) {
            return this.getLocation() === targetContext.getLocation()
        }
        return false
    }
}

export class CallSiteSensitiveContext extends Context {
    private callSiteChain: CallSite[]

    constructor(sourceContext: CallSiteSensitiveContext | undefined, sourceMethod: MethodSignature, position: number) {
        super(sourceMethod.toString()+":"+position)
        let newCallSite = new CallSite(sourceMethod,position)
        this.callSiteChain = sourceContext ? [...sourceContext.getCallSiteChain(), newCallSite] : [newCallSite]
    }

    public getCallSiteChain() {
        return this.callSiteChain
    }

    equal(targetContext: Context): boolean {
        if (targetContext instanceof CallSiteSensitiveContext) {
            const firstChain = this.getCallSiteChain();
            const secondChain = targetContext.getCallSiteChain();
            const firstChainLength = firstChain.length
            const secondChainLength = secondChain.length
            
            if ((firstChainLength < CONTEXT_SENSITIVE_DEPTH && secondChainLength >= CONTEXT_SENSITIVE_DEPTH) 
                || (firstChainLength >= CONTEXT_SENSITIVE_DEPTH && secondChainLength < CONTEXT_SENSITIVE_DEPTH)) {
                // contexts that has different part length
                return false
            } else if (firstChainLength < CONTEXT_SENSITIVE_DEPTH && secondChainLength < CONTEXT_SENSITIVE_DEPTH) {
                // contexts that has both shorter length than setting
                return firstChainLength == secondChainLength && firstChain.every((value, index) => value.equals(secondChain[index]))
            } else {
                // contexts that has both longer length than setting
                for (let i = 1; i <= CONTEXT_SENSITIVE_DEPTH; i++) {
                    if (!firstChain[firstChain.length - i].equals(secondChain[secondChain.length - i])) {
                        return false;
                    }
                }
                return true;
            }
        }
        return false
    }

    toString(): string {// WIP
        return this.getLocation()
    }
}

class CallSite {
    private methodSignature: MethodSignature
    private position: number

    constructor(method: MethodSignature, position: number) {
        this.methodSignature = method
        this.position = position
    }

    public getMethod(): MethodSignature {
        return this.methodSignature
    }

    public getPosition(): number {
        return this.position
    }

    public equals(newCallSite: CallSite): Boolean {
        if (this.methodSignature.toString() == newCallSite.getMethod().toString()
             && this.position == newCallSite.getPosition()) {
            return true
        }
        return false
    }
}

export class ValueWithContext {
    private value: Value
    private context: Context

    constructor(value: Value, context: Context) {
        this.value = value
        this.context = context
    }

    public getValue(): Value {
        return this.value
    }

    public getContext(): Context {
        return this.context
    }
}

export class MethodWithContext {
    private methodSignature: MethodSignature
    private context: Context

    constructor(method: MethodSignature, context: Context) {
        this.methodSignature = method
        this.context = context
    }

    public getMethodSignature(): MethodSignature {
        return this.methodSignature
    }

    public getContext(): Context {
        return this.context
    }
}

export class FieldWithContext {
    private fieldSignature: FieldSignature
    private context: Context

    constructor(field: FieldSignature, context: Context) {
        this.fieldSignature = field
        this.context = context
    }

    public getFieldSignature(): FieldSignature {
        return this.fieldSignature
    }

    public getContext(): Context {
        return this.context
    }
}