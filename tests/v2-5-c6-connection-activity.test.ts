import {afterEach,describe,expect,it,vi} from "vitest";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {loadConnectionProjectActivity} from "@/lib/client/connection-project-activity";

const read=(path:string)=>readFileSync(resolve(process.cwd(),path),"utf8");
const sessionId="11111111-1111-4111-8111-111111111111";
const proposalId="22222222-2222-4222-8222-222222222222";
const jobId="33333333-3333-4333-8333-333333333333";

afterEach(()=>vi.unstubAllGlobals());

describe("V2.5 C6 connection and activity visibility",()=>{
  it("aggregates only external MCP proposals/audits and durable Project Jobs without bridge state",async()=>{
    const fetchMock=vi.fn(async(input:RequestInfo|URL)=>{
      const url=String(input);
      if(url.includes("/agent/sessions"))return Response.json({sessions:[
        {
          id:sessionId,
          projectId:"project-a",
          providerId:"local-mcp",
          status:"active",
          createdAt:"2026-09-01T00:00:00.000Z",
          updatedAt:"2026-09-01T00:03:00.000Z",
          messages:[],
          turns:[],
          proposals:[{
            id:proposalId,
            sessionId,
            projectId:"project-a",
            baseProjectRevision:7,
            title:"External trim proposal",
            summary:"Trim one clip.",
            rationale:[],
            operations:[{id:"trim-1",kind:"clip-changes",summary:"Trim clip",payload:{}}],
            warnings:[],
            createdAt:"2026-09-01T00:01:00.000Z",
            status:"applied",
          }],
          approvedOperations:[],
          operationClaims:[],
          operationAudit:[{
            id:"audit-1",
            source:"local-mcp",
            action:"proposal-applied",
            outcome:"success",
            proposalId,
            operationId:"apply-1",
            createdAt:"2026-09-01T00:02:00.000Z",
          }],
        },
        {
          id:"44444444-4444-4444-8444-444444444444",
          projectId:"project-a",
          providerId:"builtin-agent",
          status:"active",
          createdAt:"2026-09-01T00:00:00.000Z",
          updatedAt:"2026-09-01T00:00:00.000Z",
          messages:[],turns:[],proposals:[],approvedOperations:[],operationClaims:[],operationAudit:[],
        },
      ]});
      if(url.includes("/api/jobs?"))return Response.json({jobs:[{
        id:jobId,
        type:"render-final",
        projectId:"project-a",
        status:"running",
        stage:"rendering",
        progress:.42,
        attempt:1,
        input:{},
        createdAt:"2026-09-01T00:02:00.000Z",
        updatedAt:"2026-09-01T00:04:00.000Z",
      }]});
      return new Response(null,{status:404});
    });
    vi.stubGlobal("fetch",fetchMock);

    const activity=await loadConnectionProjectActivity("project-a");

    expect(activity.externalSessionCount).toBe(1);
    expect(activity.proposals).toEqual([expect.objectContaining({proposalId,status:"applied",baseProjectRevision:7})]);
    expect(activity.approvals).toEqual([expect.objectContaining({proposalId,action:"proposal-applied",outcome:"success",operationId:"apply-1"})]);
    expect(activity.jobs).toEqual([expect.objectContaining({id:jobId,status:"running",progress:.42})]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.map(call=>String(call[0]))).not.toEqual(expect.arrayContaining([expect.stringContaining("mcp-bridge")]));
  });

  it("keeps Connection Center read-only while exposing external approval and durable Job activity",()=>{
    const surface=read("components/studio/ConnectionCenter.tsx");
    expect(surface).toContain("loadConnectionProjectActivity");
    expect(surface).toContain('data-testid="external-approval-audit"');
    expect(surface).toContain('data-testid="connection-durable-jobs"');
    expect(surface).toContain("remains visible after the external client disconnects");
    expect(surface).toContain("projectActivity?.projectId===projectId");
    expect(surface).not.toContain('action:"apply"');
  });

  it("does not duplicate Mission or QA truth into the Project schema",()=>{
    const projectSchema=read("schemas/project.ts");
    expect(projectSchema).not.toContain("missionId:");
    expect(projectSchema).not.toContain("qaReport");
    expect(projectSchema).not.toContain("campaignId:");
  });
});
