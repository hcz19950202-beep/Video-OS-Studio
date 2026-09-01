import {z} from "zod";
import {ProjectCommandSchema,applyProjectCommand,type ProjectCommand} from "@/lib/project/commands";
import {ProjectSchema,type Project} from "@/schemas/project";

export const ProjectCommandTransactionSchema=z.object({
  id:z.string().min(1),
  label:z.string().min(1),
  commands:z.array(ProjectCommandSchema).min(1),
});

export type ProjectCommandTransaction=z.infer<typeof ProjectCommandTransactionSchema>;

export type ProjectHistoryEntry={
  transaction:ProjectCommandTransaction;
  before:Project;
  after:Project;
};

export const ProjectHistoryTransactionSchema=z.object({
  operationId:z.string().min(1),
  label:z.string().min(1),
  beforeRevision:z.number().int().nonnegative(),
  appliedRevision:z.number().int().positive(),
  forward:z.array(ProjectCommandSchema).min(1),
  backward:z.array(ProjectCommandSchema).min(1),
}).strict();
export type ProjectHistoryTransaction=z.infer<typeof ProjectHistoryTransactionSchema>;

const applyValidatedTransaction=(original:Project,transaction:ProjectCommandTransaction,now:string):Project=>{
  let working=structuredClone(original) as Project;
  for(const command of transaction.commands as ProjectCommand[])working=applyProjectCommand(working,command,{now,skipRevision:true,validatedTransactionStep:true});
  working.project.revision=original.project.revision+1;
  working.project.updatedAt=now;
  return ProjectSchema.parse(working);
};

export const applyProjectCommandTransaction=(projectInput:Project,transactionInput:ProjectCommandTransaction,{now=new Date().toISOString()}:{now?:string}={}):Project=>{
  const original=ProjectSchema.parse(projectInput);
  const transaction=ProjectCommandTransactionSchema.parse(transactionInput);
  return applyValidatedTransaction(original,transaction,now);
};

export const createProjectHistoryEntry=(before:Project,transaction:ProjectCommandTransaction,options?:{now?:string}):ProjectHistoryEntry=>{
  const parsedBefore=ProjectSchema.parse(before);
  const parsedTransaction=ProjectCommandTransactionSchema.parse(transaction);
  const after=applyValidatedTransaction(parsedBefore,parsedTransaction,options?.now??new Date().toISOString());
  return{transaction:parsedTransaction,before:parsedBefore,after};
};

export const createDurableProjectHistoryTransaction=(input:{
  before:Project;
  transaction:ProjectCommandTransaction;
  appliedRevision:number;
}):ProjectHistoryTransaction=>{
  const before=ProjectSchema.parse(input.before);
  const transaction=ProjectCommandTransactionSchema.parse(input.transaction);
  if(input.appliedRevision!==before.project.revision+1){
    throw new Error(`History transaction must advance revision exactly once (${before.project.revision} → ${before.project.revision+1}).`);
  }
  return ProjectHistoryTransactionSchema.parse({
    operationId:transaction.id,
    label:transaction.label,
    beforeRevision:before.project.revision,
    appliedRevision:input.appliedRevision,
    forward:transaction.commands,
    backward:[{type:"restore-project-snapshot",snapshot:before}],
  });
};
