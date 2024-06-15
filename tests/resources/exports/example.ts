
import {cc} from "./test";
import DfsNew, {something, some as alias} from "./else";

export * as z from './test'; //kind 278


export let blah = 'test';

const a = 1
const b = 'a';
export {a, b};


export function testing() {
    something();
    cc();
}

export {testing as testing2}

export const c = '';


export interface MyInterface {

}
type s = object;

export type MyType = string;

export namespace MyNameSpace {

    export function doa() {

    }
}

export class d {

    public dos(){

    }

}

let l = 2.1;

export default l;

