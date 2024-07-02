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

import { Local } from '../base/Local';
import { ArkClass } from '../model/ArkClass';
import { ArkFile } from '../model/ArkFile';
import { ArkMethod } from '../model/ArkMethod';
import { ArkNamespace } from '../model/ArkNamespace';
import { ClassSignature, MethodSignature, NamespaceSignature } from '../model/ArkSignature';
import { TypeSignature } from '../model/ArkExport';

export class ModelUtils {
    public static getMethodSignatureFromArkClass(arkClass: ArkClass, methodName: string): MethodSignature | null {
        for (const arkMethod of arkClass.getMethods()) {
            if (arkMethod.getName() == methodName) {
                return arkMethod.getSignature();
            }
        }
        return null;
    }

    public static getClassWithNameInNamespaceRecursively(className: string, ns: ArkNamespace): ArkClass | null {
        if (className == '') {
            return null;
        }
        let res: ArkClass | null = null;
        res = ns.getClassWithName(className);
        if (res == null) {
            let declaringNs = ns.getDeclaringArkNamespace();
            if (declaringNs != null) {
                res = this.getClassWithNameInNamespaceRecursively(className, declaringNs);
            } else {
                res = this.getClassInFileWithName(className, ns.getDeclaringArkFile());
            }
        }
        return res;
    }

    public static getClassWithNameFromClass(className: string, startFrom: ArkClass): ArkClass | null {
        if (!className.includes('.')) {
            let res: ArkClass | null = null;
            if (startFrom.getDeclaringArkNamespace() != null) {
                res = this.getClassWithNameInNamespaceRecursively(className, startFrom.getDeclaringArkNamespace());
            } else {
                res = this.getClassInFileWithName(className, startFrom.getDeclaringArkFile());
            }
            return res;
        } else {
            const names = className.split('.');
            let nameSpace = this.getNamespaceWithNameFromClass(names[0], startFrom);
            for (let i = 1; i < names.length - 1; i++) {
                if (nameSpace)
                    nameSpace = nameSpace.getNamespaceWithName(names[i]);
            }
            if (nameSpace) {
                return nameSpace.getClassWithName(names[names.length - 1]);
            }
        }
        return null;
    }

    /**
     *  search class within the file that contain the given method
     */
    public static getClassWithName(className: string, startFrom: ArkMethod): ArkClass | null {
        if (!className.includes('.')) {
            const thisClass = startFrom.getDeclaringArkClass();
            if (thisClass.getName() == className) {
                return thisClass;
            }
            const thisNamespace = thisClass.getDeclaringArkNamespace();
            let classSearched: ArkClass | null = null;
            if (thisNamespace) {
                classSearched = thisNamespace.getClassWithName(className);
                if (classSearched) {
                    return classSearched;
                }
            }
            const thisFile = thisClass.getDeclaringArkFile();
            classSearched = this.getClassInFileWithName(className, thisFile);
            return classSearched;
        } else {
            const names = className.split('.');
            let nameSpace = this.getNamespaceWithName(names[0], startFrom);
            for (let i = 1; i < names.length - 1; i++) {
                if (nameSpace)
                    nameSpace = nameSpace.getNamespaceWithName(names[i]);
            }
            if (nameSpace) {
                return nameSpace.getClassWithName(names[names.length - 1]);
            }
        }
        return null;
    }

    /** search class within the given file */
    public static getClassInFileWithName(className: string, arkFile: ArkFile): ArkClass | null {
        let classSearched = arkFile.getClassWithName(className);
        if (classSearched != null) {
            return classSearched;
        }
        return null;
    }

    public static getClassInImportInfoWithName(className: string, arkFile: ArkFile): ArkClass | null {
        let typeSignature = this.getTypeSignatureInImportInfoWithName(className, arkFile);
        if (typeSignature instanceof ClassSignature) {
            return arkFile.getScene().getClass(typeSignature);
        }
        return null;
    }

    /** search type within the given file import infos */
    public static getTypeSignatureInImportInfoWithName(name: string, arkFile: ArkFile): TypeSignature | undefined {
        return arkFile.getImportInfoBy(name)?.getLazyExportInfo()?.getTypeSignature();
    }

    /** search method within the file that contain the given method */
    public static getMethodWithName(methodName: string, startFrom: ArkMethod): ArkMethod | null {
        if (!methodName.includes('.')) {
            if (startFrom.getName() == methodName) {
                return startFrom;
            }

            const thisClass = startFrom.getDeclaringArkClass();
            let methodSearched: ArkMethod | null = thisClass.getMethodWithName(methodName);
            if (!methodSearched) {
                methodSearched = thisClass.getStaticMethodWithName(methodName);
            }
            return methodSearched;
        } else {
            const names = methodName.split('.');
            let nameSpace = this.getNamespaceWithName(names[0], startFrom);
            for (let i = 1; i < names.length - 1; i++) {
                if (nameSpace) {
                    nameSpace = nameSpace.getNamespaceWithName(names[i]);
                }
            }
            if (nameSpace) {
                return nameSpace.getDefaultClass().getMethodWithName(names[names.length - 1]);
            }
        }
        return null;
    }

    public static getNamespaceWithNameFromClass(namespaceName: string, startFrom: ArkClass): ArkNamespace | null {
        const thisNamespace = startFrom.getDeclaringArkNamespace();
        let namespaceSearched: ArkNamespace | null = null;
        if (thisNamespace) {
            namespaceSearched = thisNamespace.getNamespaceWithName(namespaceName);
            if (namespaceSearched) {
                return namespaceSearched;
            }
        }
        const thisFile = startFrom.getDeclaringArkFile();
        namespaceSearched = this.getNamespaceInFileWithName(namespaceName, thisFile);
        return namespaceSearched;
    }

    public static getNamespaceWithName(namespaceName: string, startFrom: ArkMethod): ArkNamespace | null {
        const thisClass = startFrom.getDeclaringArkClass();
        const thisNamespace = thisClass.getDeclaringArkNamespace();
        let namespaceSearched: ArkNamespace | null = null;
        if (thisNamespace) {
            namespaceSearched = thisNamespace.getNamespaceWithName(namespaceName);
            if (namespaceSearched) {
                return namespaceSearched;
            }
        }
        const thisFile = thisClass.getDeclaringArkFile();
        namespaceSearched = this.getNamespaceInFileWithName(namespaceName, thisFile);
        return namespaceSearched;
    }

    public static getNamespaceInFileWithName(namespaceName: string, arkFile: ArkFile): ArkNamespace | null {
        let namespaceSearched = arkFile.getNamespaceWithName(namespaceName);
        if (namespaceSearched) {
            return namespaceSearched;
        }

        return null;
    }

    public static getNamespaceInImportInfoWithName(namespaceName: string, arkFile: ArkFile): ArkNamespace | null {
        let typeSignature = this.getTypeSignatureInImportInfoWithName(namespaceName, arkFile);
        if (typeSignature) {
            return arkFile.getScene().getNamespace(typeSignature as NamespaceSignature);
        }
        return null;
    }

    public static getStaticMethodWithName(methodName: string, startFrom: ArkMethod): ArkMethod | null {
        const thisClass = startFrom.getDeclaringArkClass();
        const thisNamespace = thisClass.getDeclaringArkNamespace();
        if (thisNamespace) {
            const defaultClass = thisNamespace.getClassWithName('_DEFAULT_ARK_CLASS');
            if (defaultClass) {
                const method = defaultClass.getMethodWithName(methodName);
                if (method) {
                    return method;
                }
            }
        }
        return this.getStaticMethodInFileWithName(methodName, startFrom.getDeclaringArkFile());
    }

    public static getStaticMethodInFileWithName(methodName: string, arkFile: ArkFile): ArkMethod | null {
        const defaultClass = arkFile.getClasses().find(cls => cls.getName() == '_DEFAULT_ARK_CLASS') || null;
        if (defaultClass) {
            let method = defaultClass.getMethodWithName(methodName);
            if (method) {
                return method;
            }
        }
        return null;
    }

    public static getStaticMethodInImportInfoWithName(methodName: string, arkFile: ArkFile): ArkMethod | null {
        let typeSignature = this.getTypeSignatureInImportInfoWithName(methodName, arkFile);
        if (typeSignature) {
            return arkFile.getScene().getMethod(typeSignature as MethodSignature);
        }
        return null;
    }

    public static getLocalInImportInfoWithName(localName: string, arkFile: ArkFile): Local | null {
        let typeSignature = this.getTypeSignatureInImportInfoWithName(localName, arkFile);
        if (typeSignature) {
            return typeSignature as Local;
        }
        return null;
    }

    /* get nested namespaces in a file */
    public static getAllNamespacesInFile(arkFile: ArkFile): ArkNamespace[] {
        const arkNamespaces: ArkNamespace[] = arkFile.getNamespaces();
        for (const arkNamespace of arkFile.getNamespaces()) {
            this.getAllNamespacesInNamespace(arkNamespace, arkNamespaces);
        }
        return arkNamespaces;
    }

    /* get nested namespaces in a namespace */
    public static getAllNamespacesInNamespace(arkNamespace: ArkNamespace, allNamespaces: ArkNamespace[]): void {
        allNamespaces.push(...arkNamespace.getNamespaces());
        for (const nestedNamespace of arkNamespace.getNamespaces()) {
            this.getAllNamespacesInNamespace(nestedNamespace, allNamespaces);
        }
    }

    public static getAllClassesInFile(arkFile: ArkFile): ArkClass[] {
        const allClasses = arkFile.getClasses();
        this.getAllNamespacesInFile(arkFile).forEach((namespace) => {
            allClasses.push(...namespace.getClasses());
        });
        return allClasses;
    }

    public static getAllMethodsInFile(arkFile: ArkFile): ArkMethod[] {
        const allMethods: ArkMethod[] = [];
        this.getAllClassesInFile(arkFile).forEach((cls) => {
            allMethods.push(...cls.getMethods());
        });
        return allMethods;
    }

    public static isArkUIBuilderMethod(arkMethod: ArkMethod): boolean {
        let isArkUIBuilderMethod = arkMethod.hasBuilderDecorator();

        if (!isArkUIBuilderMethod && arkMethod.getName() == 'build') {
            const fileName = arkMethod.getDeclaringArkClass().getDeclaringArkFile().getName();
            if (fileName.endsWith('.ets')) {
                isArkUIBuilderMethod = true;
            }
        }
        return isArkUIBuilderMethod;
    }

}
