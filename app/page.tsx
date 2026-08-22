import {StudioWorkspaceV21} from "@/components/studio/StudioWorkspaceV21";
import {projectRepository} from "@/lib/server/runtime";
import type {ProjectSummary} from "@/lib/project/repository";

export const dynamic="force-dynamic";

export default async function Home(){
  let initialProjects:ProjectSummary[]=[];
  try{initialProjects=await projectRepository.listRecent();}catch{initialProjects=[];}
  return <StudioWorkspaceV21 initialProjects={initialProjects}/>;
}
