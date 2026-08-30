import {describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import {ProjectRepository} from "@/lib/project/repository";

describe("V2.4 final audit Project create integrity",()=>{
  it("never replaces an existing Project when create reuses the same ID",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const repository=new ProjectRepository(fs,"/data");
    const first=await repository.create({
      id:"duplicate-project-audit",
      name:"Original project",
      now:"2026-08-31T00:00:00.000Z",
    });

    let thrown:unknown;
    try{
      await repository.create({
        id:"duplicate-project-audit",
        name:"Replacement project",
        now:"2026-08-31T00:01:00.000Z",
      });
    }catch(error){thrown=error;}

    expect(thrown).toBeInstanceOf(Error);
    const persisted=await repository.load(first.project.id);
    expect(persisted.project.name).toBe("Original project");
    expect(persisted.project.createdAt).toBe("2026-08-31T00:00:00.000Z");
  });
});
