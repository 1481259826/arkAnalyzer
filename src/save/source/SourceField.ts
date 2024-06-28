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

import { ArkField } from '../../core/model/ArkField';
import { SourceBase } from './SourceBase';
import { SourceTransformer } from './SourceTransformer';

/**
 * @category save
 */
export class SourceField extends SourceBase {
    private field: ArkField;
    private transformer: SourceTransformer;

    public constructor(field: ArkField, indent: string = '') {
        super(field.getDeclaringClass().getDeclaringArkFile(), indent);
        this.field = field;
        this.transformer = new SourceTransformer(this);
    }

    public getLine(): number {
        return this.field.getOriginPosition().getLineNo();
    }
    public dump(): string {
        this.printer.clear();
        this.printDecorator(this.field.getModifiers());
        this.printer
            .writeIndent()
            .writeSpace(this.modifiersToString(this.field.getModifiers()))
            .write(this.field.getName());
        if (this.field.getQuestionToken()) {
            this.printer.write('?');
        }
        if (this.field.getExclamationToken()) {
            this.printer.write('!');
        }

        // property.getInitializer() PropertyAccessExpression ArrowFunction ClassExpression FirstLiteralToken StringLiteral
        if (this.field.getType()) {
            this.printer.write(
                `: ${this.transformer.typeToString(this.field.getType())}`
            );
        }

        let initializer = this.field.getInitializer();
        if (initializer) {
            this.printer.write(
                ` = ${this.transformer.valueToString(initializer)}`
            );
        }

        if (this.field.getFieldType() == 'EnumMember') {
            this.printer.writeLine(',');
        } else {
            this.printer.writeLine(';');
        }
        return this.printer.toString();
    }
    public dumpOriginal(): string {
        return this.field.getCode() + '\n';
    }
}
