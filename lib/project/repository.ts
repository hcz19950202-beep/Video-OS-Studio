import { join } from "node:path";
import type { FileSystemAdapter } from "@/adapters/contracts";
import { createProject, type CreateProjectInput } from "@/lib/project/factory";
import { deserializeProject, serializeProject } from "@/lib/project/serialization";
import { ProjectIdSchema, type Project } from "@/schemas/project";

export class ProjectRepository {
  constructor(
    private readonly fs: FileSystemAdapter,
    private readonly dataRoot: string,
  ) {}

  private projectDir(projectId: string): string {
    return join(this.dataRoot, "projects", ProjectIdSchema.parse(projectId));
  }

  private projectPath(projectId: string): string {
    return join(this.projectDir(projectId), "project.json");
  }

  private backupPath(projectId: string): string {
    return join(this.projectDir(projectId), "project.backup.json");
  }

  async create(input: CreateProjectInput): Promise<Project> {
    const project = createProject(input);
    await this.fs.ensureDir(this.projectDir(project.project.id));
    await this.fs.writeTextAtomic(this.projectPath(project.project.id), serializeProject(project));
    return project;
  }

  async load(projectId: string): Promise<Project> {
    const text = await this.fs.readText(this.projectPath(projectId));
    return deserializeProject(text);
  }

  async save(project: Project): Promise<void> {
    await this.fs.writeTextAtomic(
      this.projectPath(project.project.id),
      serializeProject(project),
      this.backupPath(project.project.id),
    );
  }
}
