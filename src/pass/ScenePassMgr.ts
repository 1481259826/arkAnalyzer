import { Scene } from '../Scene';
import { CtxArg, AnyKey, Context, UpperRoot } from './Context';
import Logger, { LOG_MODULE_TYPE } from '../utils/logger';
import { Dispatcher } from './Dispatcher';
import { ClassCtx, ClassPass, FileCtx, FilePass, MethodCtx, MethodPass } from './Pass';
import { ArkFile } from '../core/model/ArkFile';
import { ArkClass } from '../core/model/ArkClass';
import { ArkMethod } from '../core/model/ArkMethod';

const logger = Logger.getLogger(LOG_MODULE_TYPE.ARKANALYZER, 'SceneMgr');

export class SceneCtx extends Context<UpperRoot, CtxArg> {
    constructor() {
        super(UpperRoot.getInstance());
    }

    root(): SceneCtx {
        return this;
    }
}

export interface PassProps {
    file: AnyKey<FilePass>[];
    klass: AnyKey<ClassPass>[],
    method: AnyKey<MethodPass>[]
}

export interface SelectorProps {
    file?: (s: Scene) => ArkFile[],
    klass?: (s: ArkFile) => ArkClass[],
    method?: (s: ArkClass) => ArkMethod[]
}

export interface SceneProps {
    passes?: PassProps;
    selectors?: SelectorProps;
    dispatcher?: typeof Dispatcher;
}

export class ScenePassMgr {
    private passes: PassProps = {
        file: [],
        klass: [],
        method: [],
    };
    private selectors?: SelectorProps = undefined;
    private dispatcher?: typeof Dispatcher = Dispatcher;
    private sctx: SceneCtx = new SceneCtx();

    constructor(props: SceneProps) {
        if (props.passes) {
            this.passes = props.passes;
        }
        if (props.selectors) {
            this.selectors = props.selectors;
        }
        if (props.dispatcher) {
            this.dispatcher = props.dispatcher;
        }
    }

    sceneContext() {
        return this.sctx;
    }

    run(scene: Scene) {
        logger.info('run scene');
        let files;
        if (this.selectors?.file) {
            files = this.selectors.file(scene);
        } else {
            files = scene.getFiles();
        }
        for (let file of files) {
            this.iterFile(file);
        }
    }

    private iterFile(file: ArkFile) {
        let fctx: FileCtx = new FileCtx(this.sctx);
        for (let P of this.passes.file) {
            let p = new P();
            if (p.run(file, fctx)) {

            }
        }
        let classes;
        if (this.selectors?.klass) {
            classes = this.selectors.klass(file);
        } else {
            classes = file.getClasses();
        }
        for (let cls of classes) {
            this.iterClass(cls, fctx);
        }
    }

    private iterClass(cls: ArkClass, fctx: FileCtx) {
        let cctx: ClassCtx = new ClassCtx(fctx);
        for (let P of this.passes.klass) {
            let p = new P();
            p.run(cls, cctx);
        }
        let methods;
        if (this.selectors?.method) {
            methods = this.selectors.method(cls);
        } else {
            methods = cls.getMethods();
        }
        for (let mtd of methods) {
            this.iterMethod(mtd, cctx);
        }
    }

    private iterMethod(mtd: ArkMethod, cctx: ClassCtx) {
        let mctx: MethodCtx = new MethodCtx(cctx);
        for (let P of this.passes.method) {
            let p = new P();
            p.run(mtd, mctx);
        }
        if (this.dispatcher) {
            let stmts = mtd.getCfg()?.getStmts() || [];
            let dispatcher = new this.dispatcher(mctx);
            for (let s of stmts) {
                dispatcher.dispatchStmt(mtd, s);
            }
        }
    }
}