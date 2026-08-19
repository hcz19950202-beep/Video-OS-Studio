import { join } from "node:path";
import type { FileSystemAdapter } from "@/adapters/contracts";
import { createProject, type CreateProjectInput } from "@/lib/project/factory";
import { deserializeProject, serializeProject } from "@/lib/project/serialization";
import { ProjectRelativePathSchema } from "@/schemas/asset";
import { ProjectIdSchema, type Project } from "@/schemas/project";

export type ProjectSummary = {
  id: string;
  name: string;
  updatedAt: string;
  revision: number;
};

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

  resolveProjectFile(projectId: string, relativePath: string): string {
    const safeRelativePath = ProjectRelativePathSchema.parse(relativePath);
    return join(this.projectDir(projectId), ...safeRelativePath.split("/"));
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

  async listRecent(limit = 12): Promise<ProjectSummary[]> {
    const ids = await this.fs.listDirectories(this.projectsRoot());
    const projects = await Promise.all(
      ids.map(async (id) => {
        try {
          return await this.load(id);
        } catch {
          return null;
        }
      }),
    );
    return projects
      .filter((project): project is Project => project !== null)
      .sort((a, b) => b.project.updatedAt.localeCompare(a.project.updatedAt))
      .slice(0, limit)
      .map((project) => ({
        id: project.project.id,
        name: project.project.name,
        updatedAt: project.project.updatedAt,
        revision: project.project.revision,
      }));
  }
}
