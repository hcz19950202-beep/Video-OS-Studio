import type {FileSystemAdapter} from "@/adapters/contracts";
import type {FileJobStore} from "@/lib/jobs/store";
import {isTerminalJobStatus} from "@/lib/jobs/schema";
import {ProjectRevisionConflictError} from "@/lib/project/mutation-coordinator";
import type {ProjectRepository} from "@/lib/project/repository";

const IMPORT_FOLDERS=["input","assets","original","captions"] as const;

export type OrphanMediaReport={
  projectId:string;
  projectRevision:number;
  orphanRelativePaths:string[];
  protectedProjectPaths:number;
  protectedJobArtifactPaths:number;
  activeJobIds:string[];
};

export class MediaDataMaintenanceService{
  constructor(private readonly fs:FileSystemAdapter,private readonly repository:ProjectRepository,private readonly jobs:Pick<FileJobStore,"list"|"getArtifacts">){}

  async inspectImportedMediaOrphans(projectId:string):Promise<OrphanMediaReport>{
    const project=await this.repository.load(projectId);
    const protectedProjectPaths=new Set<string>();
    for(const asset of project.assets){protectedProjectPaths.add(asset.relativePath);if(asset.originalRelativePath)protectedProjectPaths.add(asset.originalRelativePath);}

    const projectJobs=(await this.jobs.list()).filter(job=>job.projectId===projectId);
    const activeJobIds=projectJobs.filter(job=>!isTerminalJobStatus(job.status)).map(job=>job.id);
    const protectedJobPaths=new Set<string>();
    for(const job of projectJobs){for(const artifact of await this.jobs.getArtifacts(job.id))if(artifact.relativePath)protectedJobPaths.add(artifact.relativePath);}

    const candidates:string[]=[];
    for(const folder of IMPORT_FOLDERS){
      const folderPath=this.repository.resolveProjectFile(projectId,folder);
      for(const name of await this.fs.listFiles(folderPath)){
        if(!name.startsWith("media-"))continue;
        const relativePath=`${folder}/${name}`;
        if(!protectedProjectPaths.has(relativePath)&&!protectedJobPaths.has(relativePath))candidates.push(relativePath);
      }
    }

    return{
      projectId,
      projectRevision:project.project.revision,
      orphanRelativePaths:[...new Set(candidates)].sort(),
      protectedProjectPaths:protectedProjectPaths.size,
      protectedJobArtifactPaths:protectedJobPaths.size,
      activeJobIds,
    };
  }

  async cleanupImportedMediaOrphans(input:{projectId:string;expectedRevision:number;confirmProjectIdle:boolean}):Promise<OrphanMediaReport&{removedRelativePaths:string[]}>{
    if(!input.confirmProjectIdle)throw new Error("Orphan cleanup requires explicit confirmation that Project uploads/imports are idle.");
    const before=await this.repository.load(input.projectId);
    if(before.project.revision!==input.expectedRevision)throw new ProjectRevisionConflictError(input.expectedRevision,before.project.revision);
    const report=await this.inspectImportedMediaOrphans(input.projectId);
    if(report.activeJobIds.length)throw new Error(`Orphan cleanup is blocked while Project jobs are active: ${report.activeJobIds.join(", ")}`);
    const latest=await this.repository.load(input.projectId);
    if(latest.project.revision!==input.expectedRevision)throw new ProjectRevisionConflictError(input.expectedRevision,latest.project.revision);
    const removedRelativePaths=await this.repository.cleanupUnreferencedProjectFiles(input.projectId,report.orphanRelativePaths);
    return{...report,removedRelativePaths};
  }
}
