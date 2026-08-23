import { join } from "node:path";
import {z} from "zod";
import type { FileSystemAdapter } from "@/adapters/contracts";
import { createProject, type CreateProjectInput } from "@/lib/project/factory";
import { deserializeProject, serializeProject } from "@/lib/project/serialization";
import { ProjectRelativePathSchema } from "@/schemas/asset";
import { ProjectIdSchema, type Project } from "@/schemas/project";

const ProjectSummarySchema=z.object({id:ProjectIdSchema,name:z.string().min(1),updatedAt:z.string().datetime(),revision:z.number().int().nonnegative()});
export type ProjectSummary=z.infer<typeof ProjectSummarySchema>;

export class ProjectRepository {
  constructor(
    private readonly fs: FileSystemAdapter,
    private readonly dataRoot: string,
  ) {}

  private projectsRoot(): string {
    return join(this.dataRoot, "projects");
  }

  private projectDir(projectId: string): string {
    return join(this.projectsRoot(), ProjectIdSchema.parse(projectId));
  }

  private projectPath(projectId: string): string {
    return join(this.projectDir(projectId), "project.json");
  }

  private backupPath(projectId: string): string {
    return join(this.projectDir(projectId), "project.backup.json");
  }

  private summaryPath(projectId:string):string{return join(this.projectDir(projectId),"project.summary.json");}
  private summaryOf(project:Project):ProjectSummary{return{id:project.project.id,name:project.project.name,updatedAt:project.project.updatedAt,revision:project.project.revision};}
  private async writeSummary(project:Project):Promise<void>{await this.fs.writeTextAtomic(this.summaryPath(project.project.id),JSON.stringify(this.summaryOf(project)));}
  private referencedProjectFiles(project:Project):Set<string>{const paths=new Set<string>();for(const asset of project.assets){paths.add(asset.relativePath);if(asset.originalRelativePath)paths.add(asset.originalRelativePath);}return paths;}

  resolveProjectFile(projectId: string, relativePath: string): string {
    const safeRelativePath = ProjectRelativePathSchema.parse(relativePath);
    return join(this.projectDir(projectId), ...safeRelativePath.split("/"));
  }

  async create(input: CreateProjectInput): Promise<Project> {
    const project = createProject(input);
    await this.fs.ensureDir(this.projectDir(project.project.id));
    await this.fs.writeTextAtomic(this.projectPath(project.project.id), serializeProject(project));
    await this.writeSummary(project).catch(()=>undefined);
    return project;
  }

  async load(projectId: string): Promise<Project> {
    const text = await this.fs.readText(this.projectPath(projectId));
    return deserializeProject(text);
  }

  async save(project: Project): Promise<void> {
    // Summary is a rebuildable cache, never a second Project truth. Removing the
    // old summary before durable Project save guarantees a crash cannot leave a
    // stale summary that looks current.
    await this.fs.removeFile(this.summaryPath(project.project.id));
    await this.fs.writeTextAtomic(
      this.projectPath(project.project.id),
      serializeProject(project),
      this.backupPath(project.project.id),
    );
    await this.writeSummary(project).catch(()=>undefined);
  }

  async cleanupUnreferencedProjectFiles(projectId:string,candidateRelativePaths:string[]):Promise<string[]>{
    const latest=await this.load(projectId);
    const referenced=this.referencedProjectFiles(latest);
    const removed:string[]=[];
    for(const rawPath of new Set(candidateRelativePaths)){
      const relativePath=ProjectRelativePathSchema.parse(rawPath);
      if(referenced.has(relativePath))continue;
      const absolutePath=this.resolveProjectFile(projectId,relativePath);
      if(await this.fs.exists(absolutePath)){await this.fs.removeFile(absolutePath);removed.push(relativePath);}
    }
    return removed;
  }

  private async readOrRepairSummary(projectId:string):Promise<ProjectSummary|null>{
    if(!(await this.fs.exists(this.projectPath(projectId)))){
      await this.fs.removeFile(this.summaryPath(projectId)).catch(()=>undefined);
      return null;
    }
    try{
      const parsed=ProjectSummarySchema.parse(JSON.parse(await this.fs.readText(this.summaryPath(projectId))));
      if(parsed.id!==projectId)throw new Error("Project summary id mismatch");
      return parsed;
    }catch{
      try{
        const project=await this.load(projectId);
        await this.writeSummary(project).catch(()=>undefined);
        return this.summaryOf(project);
      }catch{return null;}
    }
  }

  async listRecent(limit = 12): Promise<ProjectSummary[]> {
    const ids = await this.fs.listDirectories(this.projectsRoot());
    const projects = await Promise.all(ids.map(id=>this.readOrRepairSummary(id)));
    return projects
      .filter((project): project is ProjectSummary => project !== null)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, limit);
  }
}
