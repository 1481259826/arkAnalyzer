/*
 * Copyright (c) 2024-2025 Huawei Device Co., Ltd.
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

import { ScenePassMgr } from './ScenePassMgr';
import { Scene } from '../Scene';
import { Dispatch, Dispatcher, StmtInit, StmtTy, ValueInit, ValueTy } from './Dispatcher';
import { ClassCtx, ClassPass, FallAction, FileCtx, FilePass, MethodCtx, MethodPass } from './Pass';
import { ArkFile } from '../core/model/ArkFile';
import { ArkClass } from '../core/model/ArkClass';
import { ArkMethod } from '../core/model/ArkMethod';
import { Value } from '../core/base/Value';
import { Stmt } from '../core/base/Stmt';
import Logger, { LOG_MODULE_TYPE } from '../utils/logger';

const logger = Logger.getLogger(LOG_MODULE_TYPE.ARKANALYZER, 'Validator');

export const enum SummaryLevel {
    info,
    warn,
    error,
}

/**
 * Abstract class representing a statement validator.
 * Provides a mechanism to validate statements of a specific type within a given context.
 * Implementations must define the `validate` method to perform custom validation logic.
 */
export abstract class StmtValidator<S extends StmtTy> {
    /**
     * Validates the given input using the provided context and reports the results.
     *
     * @param s The input value to be validated.
     * @param ctx The context used for validation, which includes reporting mechanisms.
     * @return The result of the validation process.
     */
    abstract validate(s: S, ctx: SummaryReporter): void;

    run(s: S, ctx: MethodCtx, mtd: ArkMethod) {
        let submit = (msg: SummaryMsg) => {
            let summary = MethodSummary.getOrNew(ctx, mtd);
            summary.submitStmt(s, msg);
        };
        this.validate(s, {
            info: (msg) => submit(new SummaryMsg(SummaryLevel.info, msg)),
            warn: (msg) => submit(new SummaryMsg(SummaryLevel.warn, msg)),
            error: (msg) => submit(new SummaryMsg(SummaryLevel.error, msg)),
        });
    }

    static register(init: StmtInit) {
        ArkValidatorRegistry.stmt(init);
    }
}


/**
 * Abstract class representing a validator for values of a specific type.
 * Provides a mechanism to validate values and report the results through a summary reporter.
 * The validation logic is defined by implementing the `validate` method in derived classes.
 */
export abstract class ValueValidator<S extends ValueTy> {
    /**
     * Validates the given input against specific criteria and reports the validation status.
     *
     * @param s The input value to be validated. This can be of any type depending on the implementation.
     * @param ctx The context object used for reporting validation results or summaries.
     * @return The result of the validation process.
     */
    abstract validate(s: S, ctx: SummaryReporter): void;

    run(s: S, ctx: MethodCtx, mtd: ArkMethod) {
        let submit = (msg: SummaryMsg) => {
            let summary = MethodSummary.getOrNew(ctx, mtd);
            summary.submitValue(s, msg);
        };
        this.validate(s, {
            info: (msg) => submit(new SummaryMsg(SummaryLevel.info, msg)),
            warn: (msg) => submit(new SummaryMsg(SummaryLevel.warn, msg)),
            error: (msg) => submit(new SummaryMsg(SummaryLevel.error, msg)),
        });
    }

    static register(init: ValueInit) {
        ArkValidatorRegistry.value(init);
    }
}


/**
 * The ArkValidatorRegistry class is responsible for managing and registering statement and value initializers
 * used in validation processes. It extends the Dispatcher class and provides mechanisms to dynamically
 * register and invalidate dispatch configurations.
 */
export class ArkValidatorRegistry extends Dispatcher {
    private static readonly stmtsHolder: StmtInit[] = [];
    private static readonly valuesHolder: ValueInit[] = [];
    private static dispatchHolder?: Dispatch;

    constructor(ctx: MethodCtx) {
        super(ctx, ArkValidatorRegistry.getDispatch());
        this.fallAction = FallAction.Continue;
    }

    static getDispatch(): Dispatch {
        if (ArkValidatorRegistry.dispatchHolder) {
            return ArkValidatorRegistry.dispatchHolder;
        }
        ArkValidatorRegistry.dispatchHolder = new Dispatch(this.stmtsHolder, this.valuesHolder);
        return ArkValidatorRegistry.dispatchHolder;
    }

    static stmt(init: StmtInit) {
        this.stmtsHolder.push(init);
        // invalidate holder
        ArkValidatorRegistry.dispatchHolder = undefined;
    }

    static value(init: ValueInit) {
        this.valuesHolder.push(init);
        // invalidate holder
        ArkValidatorRegistry.dispatchHolder = undefined;
    }
}


/**
 * Interface representing a summary reporter for logging messages with different severity levels.
 * Provides methods to log informational, warning, and error messages.
 * The `info` method is used to log general informational messages.
 * The `warn` method is used to log warning messages that indicate potential issues.
 * The `error` method is used to log error messages that represent critical problems.
 */
export interface SummaryReporter {
    info(msg: string): void;

    warn(msg: string): void;

    error(msg: string): void;
}


/**
 * An abstract class that extends FilePass and provides a framework for validating files.
 * The FileValidator class is designed to be subclassed with specific validation logic
 * implemented in the `validate` method. It provides a default implementation of the `run`
 * method, which processes a file and submits validation results (info, warning, or error)
 * to a summary object associated with the file context.
 */
export abstract class FileValidator extends FilePass {
    /**
     * Validates the given file and reports the results through the provided context.
     *
     * @param file The file to be validated, represented as an ArkFile object.
     * @param ctx The context used for reporting validation results, implemented as a SummaryReporter.
     * @return The result of the validation process.
     */
    abstract validate(file: ArkFile, ctx: SummaryReporter): void;

    run(file: ArkFile, ctx: FileCtx): void {
        let submit = (msg: SummaryMsg) => {
            let summary = FileSummary.getOrNew(ctx, file);
            summary.submit(msg);
        };
        this.validate(file, {
            info: (msg) => submit(new SummaryMsg(SummaryLevel.info, msg)),
            warn: (msg) => submit(new SummaryMsg(SummaryLevel.warn, msg)),
            error: (msg) => submit(new SummaryMsg(SummaryLevel.error, msg)),
        });
    }
}

export abstract class ClassValidator extends ClassPass {
    /**
     * Validates the given class and reports any issues found during validation.
     *
     * @param cls The class to be validated. This should be an instance of ArkClass.
     * @param ctx The context used for reporting validation results or issues. This should be an instance of SummaryReporter.
     * @return This method does not return any value.
     */
    abstract validate(cls: ArkClass, ctx: SummaryReporter): void;

    run(cls: ArkClass, ctx: ClassCtx): FallAction | void {
        let submit = (msg: SummaryMsg) => {
            let summary = ClassSummary.getOrNew(ctx, cls);
            summary.submit(msg);
        };
        this.validate(cls, {
            info: (msg) => submit(new SummaryMsg(SummaryLevel.info, msg)),
            warn: (msg) => submit(new SummaryMsg(SummaryLevel.warn, msg)),
            error: (msg) => submit(new SummaryMsg(SummaryLevel.error, msg)),
        });
    }
}

export abstract class MethodValidator extends MethodPass {
    /**
     * Validates the given method and reports any issues found.
     *
     * @param mtd The method to be validated. This is an instance of ArkMethod.
     * @param ctx The context for reporting validation results or issues. This is an instance of SummaryReporter.
     * @return This method does not return a value.
     */
    abstract validate(mtd: ArkMethod, ctx: SummaryReporter): void;

    run(mtd: ArkMethod, ctx: MethodCtx): FallAction | void {
        let submit = (msg: SummaryMsg) => {
            let summary = MethodSummary.getOrNew(ctx, mtd);
            summary.submit(msg);
        };
        this.validate(mtd, {
            info: (msg) => submit(new SummaryMsg(SummaryLevel.info, msg)),
            warn: (msg) => submit(new SummaryMsg(SummaryLevel.warn, msg)),
            error: (msg) => submit(new SummaryMsg(SummaryLevel.error, msg)),
        });
    }
}


/**
 * Represents a summary of a scene, containing metadata and associated file summaries.
 * The name property provides a default identifier for the scene summary.
 * The files property maintains a mapping of ArkFile instances to their corresponding FileSummary objects.
 * This class is used to encapsulate and manage information about a scene and its related files.
 */
export class SceneSummary {
    name: string = 'validate summary';
    files: Map<ArkFile, FileSummary> = new Map();
}

/**
 * Represents a summary of a file containing information about classes and messages.
 * Provides methods to manage and retrieve file summaries within a given context.
 * The class maintains a collection of messages and a mapping of classes to their summaries.
 * It supports operations to submit new messages and retrieve or create summaries for files.
 */
export class FileSummary {
    name: string = 'file summary';
    classes: Map<ArkClass, ClassSummary> = new Map();
    msgList: SummaryMsg[] = [];

    constructor() {
    }

    submit(msg: SummaryMsg) {
        this.msgList.push(msg);
    }


    /**
     * Retrieves an existing FileSummary instance from the given context or creates a new one if it does not exist.
     *
     * @param ctx The context object that holds the FileSummary instance. It is used to check if a FileSummary already exists.
     * @param file The ArkFile object for which the FileSummary is being retrieved or created.
     * @return The existing or newly created FileSummary instance associated with the provided file.
     */
    static getOrNew(ctx: FileCtx, file: ArkFile): FileSummary {
        if (ctx.get(FileSummary)) {
            return ctx.get(FileSummary)!;
        }
        let validate = ctx.upper.get(SceneSummary)!;
        if (!validate.files.get(file)) {
            validate.files.set(file, new FileSummary());
        }
        let summary = validate.files.get(file)!;
        ctx.set(FileSummary, summary);
        return summary;
    }
}


/**
 * Represents a summary of a class, containing its name, associated methods, and messages.
 * Provides functionality to submit messages and retrieve or create a ClassSummary instance.
 * The class maintains a collection of method summaries and tracks messages related to the class.
 * It is designed to be used in the context of a larger system that processes class information.
 */
export class ClassSummary {
    name: string = 'class summary';
    methods: Map<ArkMethod, MethodSummary> = new Map();
    msgList: SummaryMsg[] = [];

    constructor() {
    }

    submit(msg: SummaryMsg) {
        this.msgList.push(msg);
    }


    /**
     * Retrieves an existing ClassSummary instance from the given context or creates a new one if it does not exist.
     * If the ClassSummary is not found in the context, it attempts to retrieve or create a FileSummary for the declaring file of the class.
     * Ensures that the ClassSummary is associated with the provided class and context before returning it.
     *
     * @param ctx The context in which to search for or store the ClassSummary instance.
     * @param cls The class for which the ClassSummary is being retrieved or created.
     * @return The existing or newly created ClassSummary instance associated with the provided class and context.
     */
    static getOrNew(ctx: ClassCtx, cls: ArkClass): ClassSummary {
        if (ctx.get(ClassSummary)) {
            return ctx.get(ClassSummary)!;
        }
        let file = FileSummary.getOrNew(ctx.upper, cls.getDeclaringArkFile());
        if (!file.classes.get(cls)) {
            file.classes.set(cls, new ClassSummary());
        }
        let summary = file.classes.get(cls)!;
        ctx.set(ClassSummary, summary);
        return summary;
    }
}


/**
 * Represents a summary message with an associated level and content.
 * The SummaryMsg class is used to encapsulate messages that have a specific severity or importance level.
 * It provides a way to associate a textual message with a defined level, making it suitable for logging, notifications, or summaries.
 * The constructor initializes the message and its level, ensuring both are explicitly defined at creation.
 */
export class SummaryMsg {
    level: SummaryLevel;
    msg: string;

    constructor(level: SummaryLevel, msg: string) {
        this.level = level;
        this.msg = msg;
    }
}


/**
 * Represents a summary of a method, capturing various messages and associations with values and statements.
 * This class provides methods to submit messages and associate them with specific values or statements.
 * It also supports retrieving or creating a method summary within a given context.
 */
export class MethodSummary {
    name: string = 'method summary';
    values: Map<Value, SummaryMsg[]> = new Map();
    stmts: Map<Stmt, SummaryMsg[]> = new Map();
    msgList: SummaryMsg[] = [];

    constructor() {
    }

    submit(msg: SummaryMsg) {
        this.msgList.push(msg);
    }

    submitValue(value: Value, msg: SummaryMsg) {
        if (!this.values.get(value)) {
            this.values.set(value, []);
        }
        this.values.get(value)!.push(msg);
    }

    submitStmt(stmt: Stmt, msg: SummaryMsg) {
        if (this.stmts.get(stmt) === undefined) {
            this.stmts.set(stmt, []);
        }
        logger.info(`submit ${JSON.stringify(msg)}`);
        this.stmts.get(stmt)!.push(msg);
    }


    /**
     * Retrieves an existing MethodSummary from the context or creates a new one if it does not exist.
     *
     * @param ctx The method context in which the MethodSummary is stored or will be created.
     * @param mtd The ArkMethod for which the MethodSummary is being retrieved or created.
     * @return The existing or newly created MethodSummary associated with the provided context and method.
     */
    static getOrNew(ctx: MethodCtx, mtd: ArkMethod): MethodSummary {
        if (ctx.get(MethodSummary)) {
            return ctx.get(MethodSummary)!;
        }
        let cls = ClassSummary.getOrNew(ctx.upper, mtd.getDeclaringArkClass());
        if (!cls.methods.get(mtd)) {
            cls.methods.set(mtd, new MethodSummary());
        }
        let summary = cls.methods.get(mtd)!;
        ctx.set(MethodSummary, summary);
        return summary;
    }
}


/**
 * The SceneValidator class is responsible for validating a given scene by leveraging the ScenePassMgr.
 * It sets up a context for validation, executes the validation process, and retrieves the summary of the validation.
 *
 * The validate method initializes a new SceneSummary instance, associates it with the current scene context,
 * runs the validation process using the configured manager, and finally returns the generated summary.
 *
 * This class ensures that the validation logic is encapsulated and provides a clean interface for processing scenes.
 */
export class SceneValidator {
    private mgr: ScenePassMgr = new ScenePassMgr({ dispatcher: ArkValidatorRegistry });

    validate(scene: Scene): SceneSummary {
        let summary = new SceneSummary();
        this.mgr.sceneContext().set(SceneSummary, summary);
        this.mgr.run(scene);
        return this.mgr.sceneContext().remove(SceneSummary)!;
    }
}