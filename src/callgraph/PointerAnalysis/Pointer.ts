/*
 * Copyright (c) 2024 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Stmt } from "../../core/base/Stmt";
import { Type } from "../../core/base/Type";
import { Value } from "../../core/base/Value";
import { FieldSignature, MethodSignature } from "../../core/model/ArkSignature";
import { PointerAnalysisOptions } from "../VariablePointerAnalysisAlgorithm";
import { CallSiteSensitiveContext, Context, FieldWithContext, InsensitiveContext, ValueWithContext } from "./Context";

export class PointerTarget {
    private type: Type
    private context: Context

    constructor(type: Type, sourceMethod: MethodSignature, sourceContext: Context, position: number, options: PointerAnalysisOptions) {
        this.type = type
        if (options.strategy == 'insensitive') {
            this.context = new InsensitiveContext(sourceMethod, position)
        } else if (options.strategy == 'callSite' && sourceContext instanceof CallSiteSensitiveContext) {
            this.context = new CallSiteSensitiveContext(sourceContext, sourceMethod, position)
        }
    }

    public getType(): Type {
        return this.type
    }

    public getContext() {
        return this.context
    }

    public static genLocation(method: MethodSignature, stmt: Stmt): string {
        return method.toString() + stmt.getOriginPositionInfo()
    }
}

export abstract class Pointer {
    private pointerTargetSet: Set<PointerTarget>

    constructor() {
        this.pointerTargetSet = new Set()
    }

    public addPointerTarget(newPointerTarget: PointerTarget) {
        for (let pointerTarget of this.pointerTargetSet) {
            if (pointerTarget.getContext().equal(newPointerTarget.getContext())) {
                return
            }
        }
        this.pointerTargetSet.add(newPointerTarget)
    }

    public getPointerTarget(specificPointerTarget: PointerTarget): PointerTarget | null {
        for (let pointerTarget of this.pointerTargetSet) {
            if (pointerTarget == specificPointerTarget) {
                return pointerTarget
            }
        }
        return null
    }

    public getAllPointerTargets(): PointerTarget[] {
        let results: PointerTarget[] = []
        for (let pointerTarget of this.pointerTargetSet) {
            results.push(pointerTarget)
        }
        return results
    }

    public abstract toString(): string
}

export class LocalPointer extends Pointer {
    private identifier: ValueWithContext // 用于表示指针集的唯一归属

    constructor(identifier: Value, context: Context) {
        super()
        this.identifier = new ValueWithContext(identifier, context)
    }

    public getValueWithContext(): ValueWithContext {
        return this.identifier
    }

    public toString() {
        let resultString = "[LocalPointer] "
        resultString += this.getValueWithContext().toString() + " pointer: {"
        const pointerTargets = this.getAllPointerTargets()
        for (let pointerTarget of pointerTargets) {
            resultString += " " + pointerTarget.getType() + "." + pointerTarget.getContext().toString()
        }
        return resultString + "}"
    }
}


export class InstanceFieldPointer extends Pointer {
    private basePointerTarget: PointerTarget
    private fieldSignature: FieldWithContext

    constructor(basePointerTarget: PointerTarget, field: FieldSignature, context: Context) {
        super()
        this.basePointerTarget = basePointerTarget
        this.fieldSignature = new FieldWithContext(field, context)
    }

    public getBasePointerTarget() {
        return this.basePointerTarget
    }

    public getFieldWithContext() {
        return this.fieldSignature
    }

    public toString() {
        let resultString = "[InstanceFieldPointer] "
        resultString += this.getBasePointerTarget().getType()
            + "." + this.fieldSignature.getFieldSignature().getFieldName() + " pointer: {"
        const pointerTargets = this.getAllPointerTargets()
        for (let pointerTarget of pointerTargets) {
            resultString += " " + pointerTarget.getType() + "." + pointerTarget.getContext().toString()
        }
        return resultString + "}"
    }
}

export class StaticFieldPointer extends Pointer {
    private fieldSignature: FieldWithContext

    constructor(field: FieldSignature, context: Context) {
        super()
        this.fieldSignature = new FieldWithContext(field, context)
    }

    public getFieldWithContext() {
        return this.fieldSignature
    }

    public toString() {
        let resultString = "[StaticFieldPointer] "
        resultString += this.fieldSignature.getFieldSignature().getDeclaringClassSignature().getClassName() + "."
            + this.fieldSignature.getFieldSignature().getFieldName() + " pointer: {"
        const pointerTargets = this.getAllPointerTargets()
        for (let pointerTarget of pointerTargets) {
            resultString += " " + pointerTarget.getType() + "." + pointerTarget.getContext().toString()
        }
        return resultString + "}"
    }
}

export class PointerTargetPair {
    private pointer: Pointer
    private pointerTarget: PointerTarget

    constructor(pointer: Pointer, pointerTarget: PointerTarget) {
        this.pointer = pointer
        this.pointerTarget = pointerTarget
    }

    public getPointer() {
        return this.pointer
    }

    public getPointerTarget() {
        return this.pointerTarget
    }
}