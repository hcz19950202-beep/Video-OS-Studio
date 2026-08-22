import {randomUUID} from "node:crypto";
import {describe,expect,it} from "vitest";
import {getGlobalRuntime} from "@/lib/server/global-runtime";

describe("H3 global server runtime registry",()=>{
  it("reuses one runtime value per data root across route module evaluation",()=>{
    const root=`h3-global-${randomUUID()}`;
    let created=0;
    const first=getGlobalRuntime(root,()=>({id:++created}));
    const second=getGlobalRuntime(root,()=>({id:++created}));
    const other=getGlobalRuntime(`${root}-other`,()=>({id:++created}));
    expect(second).toBe(first);
    expect(first.id).toBe(1);
    expect(other.id).toBe(2);
    expect(created).toBe(2);
  });
});
