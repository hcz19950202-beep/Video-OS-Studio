import {randomUUID} from "node:crypto";
import {ProductionExecutionCheckpointIdSchema,ProductionExecutionCheckpointSchema,type ProductionExecutionCheckpoint} from "@/lib/production/execution/schema";
import type {ProductionPlanStep} from "@/lib/production/plan/schema";

export interface ProductionExecutionCheckpointOptions{
  now?:()=>string;
  createId?:()=>string;
}

export const createProductionExecutionCheckpoint=(step:ProductionPlanStep,reason:string,options:ProductionExecutionCheckpointOptions={}):ProductionExecutionCheckpoint=>ProductionExecutionCheckpointSchema.parse({
  id:ProductionExecutionCheckpointIdSchema.parse((options.createId??randomUUID)()),
  stepId:step.id,
  reason,
  status:"pending",
  createdAt:(options.now??(()=>new Date().toISOString()))(),
});
