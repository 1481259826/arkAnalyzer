import { Scene } from "../../../Scene";
import { CallGraph } from "../CallGraph";

export abstract class AbstractAnalysis {
    private scene: Scene
    constructor(s: Scene) {
        this.scene = s
    }

    public abstract buildAnalysis(): void

}