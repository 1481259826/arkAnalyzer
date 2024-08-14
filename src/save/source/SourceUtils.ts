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

import { Constant } from '../../core/base/Constant';
import { ArkInstanceInvokeExpr, ArkStaticInvokeExpr } from '../../core/base/Expr';
import { Local } from '../../core/base/Local';
import { ArkAssignStmt } from '../../core/base/Stmt';
import {
    COMPONENT_BRANCH_FUNCTION,
    COMPONENT_CREATE_FUNCTION,
    COMPONENT_IF,
    COMPONENT_POP_FUNCTION,
    SPECIAL_CONTAINER_COMPONENT,
    isEtsSystemComponent,
} from '../../core/common/EtsConst';
import { ArkClass } from '../../core/model/ArkClass';
import Logger from '../../utils/logger';
import { ANONYMOUS_CLASS_PREFIX, DEFAULT_ARK_CLASS_NAME } from '../../core/common/Const';

const logger = Logger.getLogger();

export const Origin_TypeLiteral = 'TypeLiteral';
export const Origin_Object = 'Object';
export const Origin_Component = 'Component';

export class SourceUtils {
    public static isAnonymousClass(name: string): boolean {
        return name.startsWith(ANONYMOUS_CLASS_PREFIX);
    }

    public static isDefaultClass(name: string): boolean {
        return name == DEFAULT_ARK_CLASS_NAME;
    }

    public static isAnonymousMethod(name: string): boolean {
        return name.startsWith('AnonymousMethod-');
    }

    public static isConstructorMethod(name: string): boolean {
        return name == 'constructor';
    }

    public static isTemp(name: string): boolean {
        return name.startsWith('$temp');
    }

    public static getOriginType(cls: ArkClass): string {
        if (cls.hasComponentDecorator()) {
            return Origin_Component;
        }
        return cls.getOriginType();
    }

    public static flipOperator(operator: string): string {
        let newOperater = operator;
        switch (operator) {
            case '<':
                newOperater = '>=';
                break;
            case '<=':
                newOperater = '>';
                break;
            case '>':
                newOperater = '<=';
                break;
            case '>=':
                newOperater = '<';
                break;
            case '==':
                newOperater = '!=';
                break;
            case '===':
                newOperater = '!==';
                break;
            case '!=':
                newOperater = '==';
                break;
            case '!==':
                newOperater = '===';
                break;
            default:
                break;
        }
        return newOperater;
    }

    public static isComponentPop(invokeExpr: ArkStaticInvokeExpr): boolean {
        let className = invokeExpr.getMethodSignature().getDeclaringClassSignature().getClassName();
        let methodName = invokeExpr.getMethodSignature().getMethodSubSignature().getMethodName();

        if (
            methodName == COMPONENT_POP_FUNCTION &&
            (isEtsSystemComponent(className) || SPECIAL_CONTAINER_COMPONENT.has(className))
        ) {
            return true;
        }

        return false;
    }

    public static isComponentCreate(invokeExpr: ArkStaticInvokeExpr): boolean {
        let className = invokeExpr.getMethodSignature().getDeclaringClassSignature().getClassName();
        let methodName = invokeExpr.getMethodSignature().getMethodSubSignature().getMethodName();

        if (
            methodName == COMPONENT_CREATE_FUNCTION &&
            (isEtsSystemComponent(className) || SPECIAL_CONTAINER_COMPONENT.has(className))
        ) {
            return true;
        }

        return false;
    }

    public static isComponentAttributeInvoke(invokeExpr: ArkInstanceInvokeExpr, visitor: Set<ArkInstanceInvokeExpr> = new Set()): boolean {
        if (visitor.has(invokeExpr)) {
            return false;
        }
        visitor.add(invokeExpr);
        let base = invokeExpr.getBase();
        if (!(base instanceof Local)) {
            logger.error(`SourceUtils->isComponentAttributeInvoke illegal invoke expr ${invokeExpr}`);
            return false;
        }
        let stmt = base.getDeclaringStmt();
        if (!stmt || !(stmt instanceof ArkAssignStmt)) {
            return false;
        }

        let rightOp = stmt.getRightOp();
        if (rightOp instanceof ArkInstanceInvokeExpr) {
            return SourceUtils.isComponentAttributeInvoke(rightOp, visitor);
        }

        if (rightOp instanceof ArkStaticInvokeExpr) {
            return SourceUtils.isComponentCreate(rightOp);
        }

        return false;
    }

    public static isComponentIfBranchInvoke(invokeExpr: ArkStaticInvokeExpr): boolean {
        let className = invokeExpr.getMethodSignature().getDeclaringClassSignature().getClassName();
        let methodName = invokeExpr.getMethodSignature().getMethodSubSignature().getMethodName();

        if (className == COMPONENT_IF && methodName == COMPONENT_BRANCH_FUNCTION) {
            return true;
        }
        return false;
    }

    public static isComponentIfElseInvoke(invokeExpr: ArkStaticInvokeExpr): boolean {
        let className = invokeExpr.getMethodSignature().getDeclaringClassSignature().getClassName();
        let methodName = invokeExpr.getMethodSignature().getMethodSubSignature().getMethodName();

        if (className == COMPONENT_IF && methodName == COMPONENT_BRANCH_FUNCTION) {
            let arg0 = invokeExpr.getArg(0) as Constant;
            if (arg0.getValue() == '1') {
                return true;
            }
        }
        return false;
    }
}
