import { ProjectSchema, CURRENT_PROJECT_VERSION, type Project } from "@/schemas/project";

export class UnsupportedProjectVersionError extends Error {
  constructor(public readonly version: unknown) {
    super(`Unsupported project version: ${String(version)}`);
    this.name = "UnsupportedProjectVersionError";
  }
}

export type ProjectMigration = (input: unknown) => unknown;

const migrations: Record<string, ProjectMigration> = {};

export const registerProjectMigration = (fromVersion: string, migration: ProjectMigration): void => {
  migrations[fromVersion] = migration;
};

export const migrateProject = (input: unknown): Project => {
  if (!input || typeof input !== "object") {
    throw new Error("Project payload must be an object");
  }

  const version = Reflect.get(input, "version");
  if (version === CURRENT_PROJECT_VERSION) return ProjectSchema.parse(input);

  if (typeof version === "string" && migrations[version]) {
    const migrated = migrations[version](input);
    return ProjectSchema.parse(migrated);
  }

  throw new UnsupportedProjectVersionError(version);
};
