import { describe, expect, it } from "vitest";
import { createProject } from "@/lib/project/factory";
import {
  migrateProject,
  registerProjectMigration,
  UnsupportedProjectVersionError,
} from "@/lib/project/migrations";


describe("project migrations", () => {
  it("loads the current version without migration", () => {
    const project = createProject({
      id: "current",
      name: "Current",
      now: "2026-08-19T00:00:00.000Z",
    });
    expect(migrateProject(project).version).toBe("1.0.0");
  });

  it("supports explicit registered migrations", () => {
    registerProjectMigration("0.9.0", () =>
      createProject({
        id: "migrated",
        name: "Migrated",
        now: "2026-08-19T00:00:00.000Z",
      }),
    );

    const migrated = migrateProject({ version: "0.9.0", legacy: true });
    expect(migrated.project.id).toBe("migrated");
  });

  it("fails explicitly for unknown versions", () => {
    expect(() => migrateProject({ version: "99.0.0" })).toThrow(UnsupportedProjectVersionError);
  });
});
