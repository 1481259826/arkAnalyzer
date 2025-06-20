import { ArkMethod } from '../core/model/ArkMethod';
import { Context, CtxArg } from './Context';
import { SceneCtx } from './ScenePassMgr';
import { ArkFile } from '../core/model/ArkFile';
import { ArkClass } from '../core/model/ArkClass';

// fallthrough actions
export const enum FallAction {
    Continue,
    Break,
}

export abstract class FilePass {
    abstract run(file: ArkFile, ctx: FileCtx): FallAction | void;
}

export class FileCtx extends Context<SceneCtx, CtxArg> {
    root(): SceneCtx {
        return this.upper.root();
    }
}

export abstract class ClassPass {
    abstract run(cls: ArkClass, ctx: ClassCtx): any;
}

export class ClassCtx extends Context<FileCtx, CtxArg> {
    root(): SceneCtx {
        return this.upper.root();
    }
}

export abstract class MethodPass {
    abstract run(method: ArkMethod, ctx: MethodCtx): any;
}

export class MethodCtx extends Context<ClassCtx, CtxArg> {
    root(): SceneCtx {
        return this.upper.root();
    }
}