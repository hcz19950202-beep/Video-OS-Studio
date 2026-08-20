import { describe, expect, it } from "vitest";
import fixture from "@/tests/fixtures/sample-project.json";
import { ProjectRelativePathSchema } from "@/schemas/asset";
import { ProjectIdSchema, ProjectSchema } from "@/schemas/project";


describe("ProjectSchema", () => {
  it("accepts the sample frame-based project fixture", () => {
    const project = ProjectSchema.parse(fixture);
    expect(project.canvas.fps).toBe(30);
    expect(project.tracks[0]?.clips[0]?.startFrame).toBe(0);
  });

  it("rejects a clip on the wrong track type", () => {
    const invalid = structuredClone(fixture);
    invalid.tracks[1]!.clips = [structuredClone(invalid.tracks[0]!.clips[0]!) as never];
    expect(() => ProjectSchema.parse(invalid)).toThrow();
  });
});

describe("ProjectIdSchema", () => {
  it.each(["project-01", "Project_2026", "p1"])("accepts safe project ID %s", (id) => {
    expect(ProjectIdSchema.parse(id)).toBe(id);
  });

  it.each(["../escape", "project/child", "project\\child", "E:drive", ".hidden"])(
    "rejects unsafe project ID %s",
    (id) => expect(() => ProjectIdSchema.parse(id)).toThrow(),
  );
});

describe("ProjectRelativePathSchema", () => {
  it("accepts portable project-relative paths", () => {
    expect(ProjectRelativePathSchema.parse("input/talking-head.mp4")).toBe("input/talking-head.mp4");
  });

  it.each(["E:\\Video-OS-Data\\raw\\a.mp4", "/tmp/a.mp4", "../a.mp4", "input\\a.mp4"])(
    "rejects machine-specific or unsafe path %s",
    (path) => expect(() => ProjectRelativePathSchema.parse(path)).toThrow(),
  );
});
