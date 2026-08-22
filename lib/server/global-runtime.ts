type RuntimeRegistry=Map<string,unknown>;
const globalScope=globalThis as typeof globalThis & {__videoOsStudioRuntimeRegistry?:RuntimeRegistry};
const registry=globalScope.__videoOsStudioRuntimeRegistry??new Map<string,unknown>();
globalScope.__videoOsStudioRuntimeRegistry=registry;

export const getGlobalRuntime=<T>(key:string,factory:()=>T):T=>{
  const existing=registry.get(key);
  if(existing!==undefined)return existing as T;
  const value=factory();
  registry.set(key,value);
  return value;
};
