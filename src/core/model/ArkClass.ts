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

import { ClassType, GenericType } from '../base/Type';
import { ViewTree } from '../graph/ViewTree';
import { ArkField } from './ArkField';
import { ArkFile } from './ArkFile';
import { ArkMethod } from './ArkMethod';
import { ArkNamespace } from './ArkNamespace';
import { ClassSignature, FieldSignature, FileSignature, MethodSignature, NamespaceSignature } from './ArkSignature';
import { Local } from '../base/Local';
import { Decorator } from '../base/Decorator';
import { COMPONENT_DECORATOR, ENTRY_DECORATOR } from '../common/EtsConst';
import { ArkExport, ExportType } from './ArkExport';
import { TypeInference } from '../common/TypeInference';
import { ANONYMOUS_CLASS_PREFIX, DEFAULT_ARK_CLASS_NAME } from '../common/Const';

export enum ClassCategory {
    CLASS = 0,
    STRUCT = 1,
    INTERFACE = 2,
    ENUM = 3,
    TYPE_LITERAL = 4,
    OBJECT = 5,
}

/**
 * @category core/model
 */
export class ArkClass implements ArkExport {
    private category!: ClassCategory;
    private code?: string;
    private line: number = -1;
    private column: number = -1;

    private declaringArkFile!: ArkFile;
    private declaringArkNamespace: ArkNamespace | undefined;
    private classSignature!: ClassSignature;

    private superClassName: string = '';
    private superClass?: ArkClass | null;
    private implementedInterfaceNames: string[] = [];
    private modifiers: Set<string | Decorator> = new Set<string | Decorator>();
    private genericsTypes?: GenericType[];

    private defaultMethod: ArkMethod | null = null;

    // name to model
    private methods: Map<string, ArkMethod> = new Map<string, ArkMethod>();
    private fields: Map<string, ArkField> = new Map<string, ArkField>();
    private extendedClasses: Map<string, ArkClass> = new Map<string, ArkClass>();
    private staticMethods: Map<string, ArkMethod> = new Map<string, ArkMethod>();
    private staticFields: Map<string, ArkField> = new Map<string, ArkField>();

    private instanceInitMethod: ArkMethod = new ArkMethod();
    private staticInitMethod: ArkMethod = new ArkMethod();

    private anonymousMethodNumber: number = 0;
    private indexSignatureNumber: number = 0;

    private viewTree?: ViewTree;

    constructor() {
    }

    public getName() {
        return this.classSignature.getClassName();
    }

    public getCode() {
        return this.code;
    }

    public setCode(code: string) {
        this.code = code;
    }

    public getLine() {
        return this.line;
    }

    public setLine(line: number) {
        this.line = line;
    }

    public getColumn() {
        return this.column;
    }

    public setColumn(column: number) {
        this.column = column;
    }

    public getCategory(): ClassCategory {
        return this.category;
    }

    public setCategory(category: ClassCategory): void {
        this.category = category;
    }

    public getDeclaringArkFile() {
        return this.declaringArkFile;
    }

    public setDeclaringArkFile(declaringArkFile: ArkFile) {
        this.declaringArkFile = declaringArkFile;
    }

    public getDeclaringArkNamespace(): ArkNamespace | undefined {
        return this.declaringArkNamespace;
    }

    public setDeclaringArkNamespace(declaringArkNamespace: ArkNamespace | undefined) {
        this.declaringArkNamespace = declaringArkNamespace;
    }

    public isExported(): boolean {
        return this.modifiers.has('ExportKeyword');
    }

    public isDefaultArkClass(): boolean {
        return this.getName() === DEFAULT_ARK_CLASS_NAME;
    }

    public isAnonymousClass(): boolean {
        return this.getName().startsWith(ANONYMOUS_CLASS_PREFIX);
    }

    public getSignature() {
        return this.classSignature;
    }

    public setSignature(classSig: ClassSignature) {
        this.classSignature = classSig;
    }

    public getSuperClassName() {
        return this.superClassName;
    }

    public setSuperClassName(superClassName: string) {
        this.superClassName = superClassName;
    }

    public getSuperClass(): ArkClass | null {
        if (this.superClass === undefined) {
            const type = TypeInference.inferUnclearReferenceType(this.superClassName, this);
            if (type instanceof ClassType) {
                let superClass = this.declaringArkFile.getScene().getClass(type.getClassSignature());
                if (superClass) {
                    superClass.addExtendedClass(this);
                    this.superClass = superClass;
                    return this.superClass;
                }
            }
            this.superClass = null;
        }
        return this.superClass;
    }

    public setSuperClass(superClass: ArkClass) {
        this.superClass = superClass;
    }

    public getExtendedClasses(): Map<string, ArkClass> {
        return this.extendedClasses;
    }

    public addExtendedClass(extendedClass: ArkClass) {
        this.extendedClasses.set(extendedClass.getName(), extendedClass);
    }

    public getImplementedInterfaceNames() {
        return this.implementedInterfaceNames;
    }

    public addImplementedInterfaceName(interfaceName: string) {
        this.implementedInterfaceNames.push(interfaceName);
    }

    public hasImplementedInterface(interfaceName: string) {
        return (this.implementedInterfaceNames.indexOf(interfaceName) > -1);
    }

    public getField(fieldSignature: FieldSignature): ArkField | null {
        const fieldName = fieldSignature.getFieldName();
        let fieldSearched: ArkField | null = this.getFieldWithName(fieldName);
        if (!fieldSearched) {
            fieldSearched = this.getStaticFieldWithName(fieldName);
        }
        return fieldSearched;
    }

    public getFieldWithName(fieldName: string): ArkField | null {
        return this.fields.get(fieldName) || null;
    }

    public getStaticFieldWithName(fieldName: string): ArkField | null {
        return this.staticFields.get(fieldName) || null;
    }

    public getFields(): ArkField[] {
        const allFields: ArkField[] = Array.from(this.fields.values());
        allFields.push(...this.staticFields.values());
        return allFields;
    }

    public addField(field: ArkField) {
        if (field.isStatic()) {
            this.staticFields.set(field.getName(), field);
        } else {
            this.fields.set(field.getName(), field);
        }
    }

    public addFields(fields: ArkField[]) {
        fields.forEach((field) => {
            this.addField(field);
        });
    }

    public getModifiers() {
        return this.modifiers;
    }

    public addModifier(name: string | Decorator) {
        this.modifiers.add(name);
    }

    public getGenericsTypes() {
        return this.genericsTypes;
    }

    public addGenericType(gType: GenericType) {
        if (!this.genericsTypes) {
            this.genericsTypes = [];
        }
        this.genericsTypes.push(gType);
    }

    public containsModifier(name: string) {
        return this.modifiers.has(name);
    }

    public isStatic(): boolean {
        if (this.modifiers.has('StaticKeyword')) {
            return true;
        }
        return false;
    }

    public getMethods(generated?: boolean): ArkMethod[] {
        const allMethods = Array.from(this.methods.values())
            .filter(f => !generated && !f.isGenerated() || generated);
        allMethods.push(...this.staticMethods.values());
        return allMethods;
    }

    public getMethod(methodSignature: MethodSignature): ArkMethod | null {
        const methodName = methodSignature.getMethodSubSignature().getMethodName();
        let methodSearched: ArkMethod | null = this.getMethodWithName(methodName);
        if (!methodSearched) {
            methodSearched = this.getStaticMethodWithName(methodName);
        }
        return methodSearched;
    }

    public getMethodWithName(methodName: string): ArkMethod | null {
        return this.methods.get(methodName) || null;
    }

    public getStaticMethodWithName(methodName: string): ArkMethod | null {
        return this.staticMethods.get(methodName) || null;
    }


    public addMethod(method: ArkMethod) {
        if (method.getModifiers().has('StaticKeyword')) {
            this.staticMethods.set(method.getName(), method);
        } else {
            this.methods.set(method.getName(), method);
        }
    }

    public setDefaultArkMethod(defaultMethod: ArkMethod) {
        this.defaultMethod = defaultMethod;
        this.addMethod(defaultMethod);
    }

    public getDefaultArkMethod(): ArkMethod | null {
        return this.defaultMethod;
    }

    public setViewTree(viewTree: ViewTree) {
        this.viewTree = viewTree;
    }

    public getViewTree(): ViewTree | undefined {
        return this.viewTree;
    }

    public hasViewTree(): boolean {
        return this.viewTree != undefined;
    }

    public getStaticFields(classMap: Map<FileSignature | NamespaceSignature, ArkClass[]>): ArkField[] {
        const fields: ArkField[] = [];
        let classes: ArkClass[] = [];
        if (this.declaringArkNamespace) {
            classes = classMap.get(this.declaringArkNamespace.getNamespaceSignature())!;
        } else {
            classes = classMap.get(this.declaringArkFile.getFileSignature())!;
        }
        for (const arkClass of classes) {
            for (const field of arkClass.getFields()) {
                if (field.isStatic()) {
                    fields.push(field);
                }
            }
        }
        return fields;
    }

    public getGlobalVariable(globalMap: Map<FileSignature | NamespaceSignature, Local[]>): Local[] {
        if (this.declaringArkNamespace) {
            return globalMap.get(this.declaringArkNamespace.getNamespaceSignature())!;
        }
        return globalMap.get(this.declaringArkFile.getFileSignature())!;
    }

    public getDecorators(): Decorator[] {
        return Array.from(this.modifiers).filter((item) => {
            return item instanceof Decorator;
        }) as Decorator[];
    }

    public hasEntryDecorator(): boolean {
        return this.hasDecorator(ENTRY_DECORATOR);
    }

    public hasComponentDecorator(): boolean {
        return this.hasDecorator(COMPONENT_DECORATOR);
    }

    private hasDecorator(kind: string | Set<string>): boolean {
        let decorators = this.getDecorators();
        return decorators.filter((value) => {
            if (kind instanceof Set) {
                return kind.has(value.getKind());
            }
            return value.getKind() == kind;
        }).length != 0;
    }

    public getAnonymousMethodNumber() {
        return this.anonymousMethodNumber++;
    }

    public getIndexSignatureNumber() {
        return this.indexSignatureNumber++;
    }

    getExportType(): ExportType {
        return ExportType.CLASS;
    }

    public getInstanceInitMethod(): ArkMethod {
        return this.instanceInitMethod;
    }

    public getStaticInitMethod(): ArkMethod {
        return this.staticInitMethod;
    }

    public setInstanceInitMethod(arkMethod: ArkMethod): void {
        this.instanceInitMethod = arkMethod;
    }

    public setStaticInitMethod(arkMethod: ArkMethod): void {
        this.staticInitMethod = arkMethod;
    }
}