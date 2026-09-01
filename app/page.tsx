import {StudioWorkspaceV21} from "@/components/studio/StudioWorkspaceV21";
import {ProductionMissionIdSchema} from "@/lib/production/mission/schema";
import {projectRepository} from "@/lib/server/runtime";
import type {ProjectSummary} from "@/lib/project/repository";
import {ProjectIdSchema} from "@/schemas/project";

export const dynamic="force-dynamic";
type SearchParams=Promise<Record<string,string|string[]|undefined>>;
const scalar=(value:string|string[]|undefined)=>typeof value==="string"?value:undefined;

export default async function Home({searchParams}:{searchParams:SearchParams}){
  let initialProjects:ProjectSummary[]=[];
  try{initialProjects=await projectRepository.listRecent();}catch{initialProjects=[];}
  const query=await searchParams;
  const projectId=ProjectIdSchema.safeParse(scalar(query.projectId));
  const missionId=ProductionMissionIdSchema.safeParse(scalar(query.missionId));
  const validHandoff=projectId.success&&missionId.success;
  return <StudioWorkspaceV21
    initialProjects={initialProjects}
    initialOpenProjectId={validHandoff?projectId.data:undefined}
    initialOpenMissionId={validHandoff?missionId.data:undefined}
  />;
}
