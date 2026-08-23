"use client";

import {useCallback,useRef,useState} from "react";
import {toClientErrorState,type ClientErrorState} from "@/lib/client/api";
import {importProjectMedia,type MediaImportReport} from "@/lib/client/media";
import {ProjectRequestError,postProjectCommand} from "@/lib/client/project-mutations";
import {createStudioProject,listRecentProjects,loadStudioProject,type CreateStudioProjectInput} from "@/lib/client/projects";
import type {StudioLocale,StudioMessageKey} from "@/lib/i18n/studio";
import type {ProjectCommand} from "@/lib/project/commands";
import type {ProjectSummary} from "@/lib/project/repository";
import type {Project} from "@/schemas/project";
import {useHistoryStore} from "@/store/history-store";
import {useProjectStore} from "@/store/project-store";

export type WorkspaceImportStatus={
  fileName:string;
  phase:"uploading"|"preparing"|"ready";
  normalized?:boolean;
  workingFileName?:string;
};

type Translator=(key:StudioMessageKey,variables?:Record<string,string|number>)=>string;

type WorkspaceProjectRuntimeInput={
  initialProjects:ProjectSummary[];
  project:Project|null;
  locale:StudioLocale;
  t:Translator;
  matchSourceCanvas:boolean;
  setMatchSourceCanvas:(value:boolean)=>void;
  onProjectCreated:()=>void;
};

export const useWorkspaceProjectRuntime=({initialProjects,project,locale,t,matchSourceCanvas,setMatchSourceCanvas,onProjectCreated}:WorkspaceProjectRuntimeInput)=>{
  const setProject=useProjectStore(state=>state.setProject);
  const pushHistory=useHistoryStore(state=>state.push);
  const[projects,setProjects]=useState(initialProjects);
  const[busy,setBusy]=useState<string|null>(null);
  const[notice,setNotice]=useState("V2.1 Universal Workspace");
  const[error,setError]=useState<ClientErrorState|null>(null);
  const[lastUpload,setLastUpload]=useState<File|null>(null);
  const[importStatus,setImportStatus]=useState<WorkspaceImportStatus|null>(null);
  const mutationChainRef=useRef<Promise<void>>(Promise.resolve());
  const zh=locale==="zh-CN";

  const refreshRecent=useCallback(async()=>{setProjects(await listRecentProjects());},[]);
  const run=async(label:string,op:()=>Promise<void>)=>{setBusy(label);setError(null);try{await op();}catch(caught){setError(toClientErrorState(caught));}finally{setBusy(null);}};
  const enqueueMutation=(op:()=>Promise<void>)=>{const next=mutationChainRef.current.catch(()=>undefined).then(op);mutationChainRef.current=next.catch(()=>undefined);return next;};
  const postCommand=async(base:Project,command:ProjectCommand,message:string)=>{const data=await postProjectCommand(base,command);setProject(data.project);setNotice(message);await refreshRecent();if(base.project.revision!==data.project.project.revision)pushHistory({projectId:base.project.id,label:message,before:base,after:data.project});return data.project;};

  const persistCommand=(command:ProjectCommand,message:string)=>{
    if(!project)return Promise.resolve();
    return run(t("status.saving"),()=>enqueueMutation(async()=>{
      const base=useProjectStore.getState().project??project;
      try{await postCommand(base,command,message);}catch(caught){
        if(caught instanceof ProjectRequestError&&caught.code==="PROJECT_REVISION_CONFLICT")setProject(await loadStudioProject(base.project.id));
        throw caught;
      }
    }));
  };

  const createNewProject=(input:CreateStudioProjectInput)=>run(t("status.creating"),async()=>{
    const created=await createStudioProject(input);
    setProject(created);
    setNotice(matchSourceCanvas?(zh?"项目已创建；导入首个视频后将匹配源尺寸":"Project created; the first imported video will set the canvas size"):t("status.projectCreated"));
    onProjectCreated();
    await refreshRecent();
  });

  const openProject=(id:string)=>run(t("status.opening"),async()=>{
    await mutationChainRef.current.catch(()=>undefined);
    setProject(await loadStudioProject(id));
    setNotice(t("status.projectRestored"));
    setMatchSourceCanvas(false);
  });

  const saveProject=()=>{
    if(!project)return Promise.resolve();
    return run(t("status.saving"),async()=>{
      await mutationChainRef.current.catch(()=>undefined);
      const current=useProjectStore.getState().project??project;
      setProject(await loadStudioProject(current.project.id));
      setNotice(t("status.projectSaved"));
      await refreshRecent();
    });
  };

  const renameProject=(name?:string)=>!project||!name||name===project.project.name?Promise.resolve():persistCommand({type:"rename-project",name},t("status.projectRenamed"));

  const uploadFile=(file:File)=>{
    if(!project)return Promise.resolve();
    setLastUpload(file);
    setImportStatus({fileName:file.name,phase:"uploading"});
    return run(`${t("status.importing")} ${file.name}`,async()=>{
      const base=useProjectStore.getState().project??project;
      setImportStatus({fileName:file.name,phase:"preparing"});
      const data=await importProjectMedia(base,file);
      let next=data.project;
      const report:MediaImportReport|undefined=data.import;
      if(matchSourceCanvas&&report?.kind==="video"&&report.assetId){
        const asset=next.assets.find(item=>item.id===report.assetId);
        if(asset?.width&&asset?.height&&(asset.width!==next.canvas.width||asset.height!==next.canvas.height))next=await postCommand(next,{type:"set-canvas",width:asset.width,height:asset.height},zh?`画布已匹配源视频 ${asset.width}×${asset.height}`:`Canvas matched source video ${asset.width}×${asset.height}`);
        setMatchSourceCanvas(false);
      }else setProject(next);
      setImportStatus({fileName:file.name,phase:"ready",normalized:report?.normalized,workingFileName:report?.workingFileName});
      setNotice(report?.normalized?(zh?`原始 ${file.name} 已保留；正在使用 ${report.workingFileName??"内部 MP4"}`:`Original ${file.name} preserved; using ${report.workingFileName??"internal MP4"}`):(zh?`${file.name} 已导入`:`Imported ${file.name}`));
      await refreshRecent();
    });
  };

  return{projects,busy,notice,error,lastUpload,importStatus,refreshRecent,persistCommand,createNewProject,openProject,saveProject,renameProject,uploadFile};
};
