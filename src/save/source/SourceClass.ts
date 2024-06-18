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

import { ArkClass } from "../../core/model/ArkClass";
import { SourceBase } from "./SourceBase";
import { SourceMethod } from "./SourceMethod";
import { SourceUtils } from "./SourceUtils";

/**
 * @category save
 */
export class SourceClass extends SourceBase{
    cls: ArkClass;

    public constructor(indent: string, cls: ArkClass) {
        super(indent);
        this.cls = cls;
    }

    public getLine(): number {
        return this.cls.getLine();
    }

    public dump(): string {
        this.printer.clear();
        // print export class name<> + extends c0 implements x1, x2 {
        this.printer.writeIndent().writeSpace(this.modifiersToString(this.cls.getModifiers()))
            .write(`${this.cls.getOriginType().toLowerCase()} ${this.cls.getName()}`);
        if (this.cls.getTypeParameter().length > 0) {
            this.printer.write(`<${SourceUtils.typeArrayToString(this.cls.getTypeParameter())}>`);
        }
        if (this.cls.getSuperClassName()) {
            this.printer.write(` extends ${this.cls.getSuperClassName()} `);
        }
        if (this.cls.getImplementedInterfaceNames().length > 0) {
            this.printer.write(` implements ${this.cls.getImplementedInterfaceNames().join(',')}`);
        }
        this.printer.writeLine('{');
        this.printer.incIndent();

        this.printFields();
        this.printMethods();
        
        this.printer.decIndent();
        this.printer.writeIndent().writeLine('}');
        return this.printer.toString();
    }

    public dumpOriginal(): string {
        return this.cls.getCode() + '\n';
    }

    protected printMethods(): void {
        let items: SourceBase[] = [];
        for (let method of this.cls.getMethods()) {
            items.push(new SourceMethod(this.printer.getIndent(), method));
        }
        items.sort((a, b) => a.getLine() - b.getLine());
        items.forEach((v):void => {
            this.printer.write(v.dump());
        });
    }

    private printFields(): void {
        for (let field of this.cls.getFields()) {
            this.printer.writeIndent()
                .writeSpace(this.modifiersToString(field.getModifiers()))
                .write(field.getName());
            if (field.getQuestionToken()) {
                this.printer.write('?');
            }

            // property.getInitializer() PropertyAccessExpression ArrowFunction ClassExpression FirstLiteralToken StringLiteral 
            // TODO: Initializer not ready
            if (field.getType()) {
                this.printer.write(':' + SourceUtils.typeToString(field.getType()));
            }
            if (field.getFieldType() == 'EnumMember') {
                this.printer.writeLine(',');
            } else {
                this.printer.writeLine(';');
            }
        }
    }
}

export class SourceDefaultClass extends SourceClass {
    public constructor(indent: string, cls: ArkClass) {
        super(indent, cls);
    }

    public getLine(): number {
        return this.cls.getLine();
    }

    public dump(): string {
        this.printMethods();
        return this.printer.toString();
    }

    public dumpOriginal(): string {
        for (let method of this.cls.getMethods()) {
            if (method.isDefaultArkMethod()) {
                for (let stmt of method.getBody().getOriginalCfg().getStmts()) {
                    let code = stmt.toString();
                    if (!code.startsWith('import') && code !== 'return;') {
                        this.printer.writeLine(code);
                    }
                }
            } else {
                this.printer.writeLine(method.getCode());
            }
        }
        return this.printer.toString();
    }
}