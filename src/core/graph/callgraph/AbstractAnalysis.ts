import { Scene } from "../../../Scene";
import { AbstractInvokeExpr } from "../../base/Expr";
import { ModelUtils } from "../../common/ModelUtils";
import { ArkMethod } from "../../model/ArkMethod";

export abstract class AbstractAnalysis {
    private scene: Scene
    constructor(s: Scene) {
        this.scene = s
    }

    public getScene(): Scene {
        return this.scene
    }

    public resolveInvokeExpr(invokeExpr: AbstractInvokeExpr): ArkMethod | undefined {
        const method = this.scene.getMethod(invokeExpr.getMethodSignature())
        if (method != null) {
            return method
        }

        const methodSignature = invokeExpr.getMethodSignature()
        const sdkFiles = this.scene.getSdkArkFilesMap().values()
        for (let sdkFile of sdkFiles) {
            if (methodSignature.getDeclaringClassSignature().getDeclaringFileSignature().toString() == 
            sdkFile.getFileSignature().toString()) {
                const methods = ModelUtils.getAllMethodsInFile(sdkFile);
                for (let methodUnderFile of methods) {
                    if (methodSignature.toString() == methodUnderFile.getSignature().toString()) {
                        return methodUnderFile;
                    }
                }
            }
        }
    }

    public abstract buildAnalysis(): void

}