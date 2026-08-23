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
