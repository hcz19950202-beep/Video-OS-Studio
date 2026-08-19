import type {ComponentType} from "react";import type {z} from "zod";
export type EffectComponentProps={props:Record<string,unknown>};export type EffectCategory="number"|"data"|"text"|"brand";
export type EffectField={key:string;label:string;type:"text"|"number"|"color"|"select"|"switch"|"slider";min?:number;max?:number;step?:number;options?:Array<{label:string;value:string}>};
export type EffectDefinition={id:string;name:string;engine:"remotion";category:EffectCategory;tags:string[];thumbnail:string;defaultDurationInFrames:number;schema:z.ZodType<Record<string,unknown>>;defaults:Record<string,unknown>;fields:EffectField[];component:ComponentType<EffectComponentProps>};
