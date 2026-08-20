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

export const applyProjectCommandTransaction=(projectInput:Project,transactionInput:ProjectCommandTransaction,{now=new Date().toISOString()}:{now?:string}={}):Project=>{
  const original=ProjectSchema.parse(projectInput);
  const transaction=ProjectCommandTransactionSchema.parse(transactionInput);
  let working=structuredClone(original) as Project;
  for(const command of transaction.commands as ProjectCommand[])working=applyProjectCommand(working,command,{now,skipRevision:true});
  const next=structuredClone(working) as Project;
  next.project.revision=original.project.revision+1;
  next.project.updatedAt=now;
  return ProjectSchema.parse(next);
};

export const createProjectHistoryEntry=(before:Project,transaction:ProjectCommandTransaction,options?:{now?:string}):ProjectHistoryEntry=>{
  const parsedBefore=ProjectSchema.parse(before);
  const parsedTransaction=ProjectCommandTransactionSchema.parse(transaction);
  const after=applyProjectCommandTransaction(parsedBefore,parsedTransaction,options);
  return{transaction:parsedTransaction,before:structuredClone(parsedBefore),after:structuredClone(after)};
};
