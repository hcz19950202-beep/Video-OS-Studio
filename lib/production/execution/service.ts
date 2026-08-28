import type {ReviewProductionExecutionInput} from "@/lib/production/execution/schema";
import {ProductionMissionExecutor} from "@/lib/production/execution/executor";

export class ProductionExecutionService{
  constructor(readonly executor:ProductionMissionExecutor){}
  inspect(projectId:string,missionId:string){return this.executor.inspect(projectId,missionId);}
  advance(projectId:string,missionId:string){return this.executor.advance(projectId,missionId);}
  review(projectId:string,missionId:string,input:ReviewProductionExecutionInput){
    return this.executor.review(projectId,missionId,input);
  }
  cancel(projectId:string,missionId:string){return this.executor.cancel(projectId,missionId);}
}
