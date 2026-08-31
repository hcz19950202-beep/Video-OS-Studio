import type {ContextReference} from "@/lib/ai/context-reference";

export type ContextSelectionTarget=ContextReference extends infer Reference
  ?Reference extends ContextReference
    ?Pick<Reference,"kind"|"label"|"target">
    :never
  :never;

export type ContextReferenceIdentityFactory={
  now?:()=>string;
  makeId?:()=>string;
};

const fallbackId=()=>`context-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;

export function attachContextSelection(input:{
  selection:ContextSelectionTarget;
  projectId:string;
  baseProjectRevision:number;
  identity?:ContextReferenceIdentityFactory;
}):ContextReference {
  return{
    ...input.selection,
    id:input.identity?.makeId?.()??fallbackId(),
    projectId:input.projectId,
    baseProjectRevision:input.baseProjectRevision,
    createdAt:input.identity?.now?.()??new Date().toISOString(),
  } as ContextReference;
}

export const contextSelectionKey=(selection:ContextSelectionTarget)=>JSON.stringify({kind:selection.kind,target:selection.target});
export const contextReferenceKey=(reference:ContextReference)=>JSON.stringify({kind:reference.kind,target:reference.target});
