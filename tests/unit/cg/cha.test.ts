import { assert, describe, it } from "vitest";
import { SceneConfig, Scene, CallGraph, CallGraphBuilder, CallGraphNode } from "../../../src";

describe("CHA test", () => {
    let config: SceneConfig = new SceneConfig();
    config.buildFromProjectDir('./tests/resources/callgraph/cha_rta_test');
    let scene = new Scene();
    scene.buildSceneFromProjectDir(config);
    scene.inferTypes();

    let cg = new CallGraph(scene);
    let cgBuilder = new CallGraphBuilder(cg, scene);
    const mainMethod = scene.getMethods().find(m => m.getName() === 'main')!;
    cgBuilder.buildClassHierarchyCallGraph([mainMethod.getSignature()]);

    it('case1: inheritance test', () => {
        const makeSoundMethod = scene.getMethods().find(m => m.getName() === 'makeSound')!;
        const cgNode = cg.getCallGraphNodeByMethod(makeSoundMethod.getSignature());
        const calleeNodes = cgNode.getOutgoingEdges();
        
        // 定义预期的四个函数签名或名称
        const expectedCallees = [
            scene.getClasses().find(c => c.getName() === 'Animal')!.getMethods().find(m => m.getName() === 'sound')!.getSignature(),
            scene.getClasses().find(c => c.getName() === 'Dog')!.getMethods().find(m => m.getName() === 'sound')!.getSignature(),
            scene.getClasses().find(c => c.getName() === 'Cat')!.getMethods().find(m => m.getName() === 'sound')!.getSignature(), 
            scene.getClasses().find(c => c.getName() === 'Pig')!.getMethods().find(m => m.getName() === 'sound')!.getSignature(),
        ];
        
        // 方法1: 如果你要比较函数签名
        const actualCalleeSignatures = Array.from(calleeNodes).map(node => 
            (node.getDstNode() as CallGraphNode).getMethod()
        );
        
        expectedCallees.forEach(expectedSignature => {
            assert(
                actualCalleeSignatures.includes(expectedSignature),
                `Expected callee ${expectedSignature} not found in actual callees: ${actualCalleeSignatures.join(', ')}`
            );
        });
    });

    it('case2: super test', () => {
        const makeSoundMethod = scene.getClasses().find(c => c.getName() === 'Dog')!.getMethods().find(m => m.getName() === 'sound')!;
        const cgNode = cg.getCallGraphNodeByMethod(makeSoundMethod.getSignature());
        const calleeNodes = cgNode.getOutgoingEdges();
        
        // 定义预期的四个函数签名或名称
        const expectedCallees = [
            scene.getClasses().find(c => c.getName() === 'Animal')!.getMethods().find(m => m.getName() === 'sound')!.getSignature(),
        ];
        
        // 方法1: 如果你要比较函数签名
        const actualCalleeSignatures = Array.from(calleeNodes).map(node => 
            (node.getDstNode() as CallGraphNode).getMethod()
        );
        
        expectedCallees.forEach(expectedSignature => {
            assert(
                actualCalleeSignatures.includes(expectedSignature),
                `Expected callee ${expectedSignature} not found in actual callees: ${actualCalleeSignatures.join(', ')}`
            );
        });
    });
})