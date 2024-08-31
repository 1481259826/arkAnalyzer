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

import { Value } from '../../core/base/Value';
import {
    InstanceFieldPointer,
    LocalPointer,
    Pointer,
    PointerTarget,
    PointerTargetPair,
    StaticFieldPointer,
} from './Pointer';
import Logger, { LOG_MODULE_TYPE } from '../../utils/logger';
import { FieldSignature } from '../../core/model/ArkSignature';

const logger = Logger.getLogger(LOG_MODULE_TYPE.ARKANALYZER, 'PointerFlowGraph');

export class PointerFlowGraph {
    private pointerSet: Set<Pointer>
    private pointerFlowEdges: Map<Pointer, Pointer[]>

    constructor() {
        this.pointerFlowEdges = new Map()
        this.pointerSet = new Set()
    }

    /**
     * 指针的传播过程
     */
    public proPagate(pointer: Pointer, pointerTarget: PointerTarget): PointerTargetPair[] {
        const newWorkList: PointerTargetPair[] = []
        const initialPointerSetOfIdentifier = pointer
        // merge pointer into identifier pointerSet
        this.addPointerSetElement(initialPointerSetOfIdentifier, pointerTarget)

        const pointerFlowEdgesTargets = this.getPointerFlowEdges(initialPointerSetOfIdentifier)
        for (let pointerFlowEdge of pointerFlowEdgesTargets) {
            newWorkList.push(new PointerTargetPair(pointerFlowEdge, pointerTarget))
        }
        return newWorkList
    }

    public getPointerSet(): Set<Pointer> {
        return this.pointerSet;
    }

    public getPointerSetElement(
        identifier: Value | null, 
        pointerTarget: PointerTarget | null, 
        fieldSignature: FieldSignature | null): Pointer {
        const pointerSet = this.getPointerSet()
        for (let set of pointerSet) {
            if (fieldSignature != null) {
                if (pointerTarget != null && set instanceof InstanceFieldPointer) {
                    if (set.getBasePointerTarget() === pointerTarget && 
                        set.getFieldSignature().toString() === fieldSignature.toString()) {
                        return set
                    }
                } else if (set instanceof StaticFieldPointer) {
                    if (set.getFieldSignature().toString() === fieldSignature.toString()) {
                        return set
                    }
                }
            } else if (identifier != null && set instanceof LocalPointer) {
                if (set.getIdentifier() === identifier) {
                    return set
                }
            }
        }
        let newPointer: Pointer | null = null
        if (fieldSignature != null) {
            if (pointerTarget == null) {
                newPointer = new StaticFieldPointer(fieldSignature)
            } else {
                newPointer = new InstanceFieldPointer(pointerTarget, fieldSignature)
            }
        } else {
            newPointer = new LocalPointer(identifier!)
        }
        this.pointerSet.add(newPointer)
        return newPointer
    }

    public addPointerSetElement(pointerSet: Pointer, pointer: PointerTarget) {
        pointerSet.addPointerTarget(pointer)
    }

    public getPointerFlowEdges(sourcePointer: Pointer): Pointer[] {
        return this.pointerFlowEdges.get(sourcePointer) || [];
    }

    public addPointerFlowEdge(sourcePointer: Pointer, targetPointer: Pointer): PointerTargetPair[] {
        let newWorkList: PointerTargetPair[] = []
        if (!this.hasPointerFlowEdge(sourcePointer, targetPointer)) {
            const targets = this.pointerFlowEdges.get(sourcePointer) || [];
            targets.push(targetPointer);
            this.pointerFlowEdges.set(sourcePointer, targets);

            let pointers = sourcePointer.getAllPointerTargets()
            for (let point of pointers) {
                newWorkList.push(new PointerTargetPair(
                    targetPointer, point
                ))
            }
        }
        return newWorkList
    }

    public hasPointerFlowEdge(sourcePointer: Pointer, targetPointer: Pointer): boolean {
        if (this.pointerFlowEdges.has(sourcePointer)) {
            // If it does, check if the targetPointer is in the array of targets
            const targets = this.pointerFlowEdges.get(sourcePointer);
            return targets ? targets.includes(targetPointer) : false;
        }
        return false;
    }

    public printPointerFlowGraph() {
        logger.info("PointerFlowGraph Elements: ")
        for (let element of this.getPointerSet()) {
            logger.info("\t"+element.toString())
        }
        logger.info("PointerFlowGraph Edges: ") 
        for (let element of this.pointerFlowEdges.keys()) {
            logger.info("\t"+element.toString())
            for (let values of this.getPointerFlowEdges(element)) {
                logger.info("\t\t"+values.toString())
            }
        }

    }
}