import {describe,expect,it,vi} from "vitest";
import {canPublishProject,publishProjectIfActive} from "@/lib/client/project-mutations";
import type {Project} from "@/schemas/project";

const project=(id:string,revision:number)=>({project:{id,revision}}) as Project;

describe("active Project publication",()=>{
  it("rejects a response from a Project that is no longer active",()=>{
    expect(canPublishProject(project("project-b",3),"project-a",project("project-a",4))).toBe(false);
  });

  it("rejects an older response for the still-active Project",()=>{
    expect(canPublishProject(project("project-a",5),"project-a",project("project-a",4))).toBe(false);
  });

  it("publishes only a current, non-regressing candidate",()=>{
    let current:Project|null=project("project-a",4);
    const publish=vi.fn((candidate:Project)=>{current=candidate;});
    expect(publishProjectIfActive("project-a",project("project-a",5),()=>current,publish)).toBe(true);
    expect(publish).toHaveBeenCalledTimes(1);
    expect((current as Project).project.revision).toBe(5);
  });
});
