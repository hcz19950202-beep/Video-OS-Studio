import { migrateProject } from "@/lib/project/migrations";
import { ProjectSchema, type Project } from "@/schemas/project";

export const serializeProject = (project: Project): string =>
  `${JSON.stringify(ProjectSchema.parse(project), null, 2)}\n`;

export const deserializeProject = (text: string): Project => {
  const parsed: unknown = JSON.parse(text);
  return migrateProject(parsed);
};
