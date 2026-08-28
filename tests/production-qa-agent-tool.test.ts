import {describe,expect,it} from "vitest";
import type {AgentContextSnapshot} from "@/lib/ai/context";
import {INSPECT_LATEST_QA_REPORT_TOOL_ID,createQAReportReadTool} from "@/lib/ai/tools/qa-tools";
import {AgentToolRegistry} from "@/lib/ai/tools/registry";
import type {QAReport} from "@/lib/production/qa/schema";

const MISSION_ID="11111111-1111-4111-8111-111111111111";
const REPORT_ID="33333333-3333-4333-8333-333333333333";
const JOB_ID="22222222-2222-4222-8222-222222222222";
const context={sessionId:"session-1",context:{projectId:"project-current",baseProjectRevision:9} as unknown as AgentContextSnapshot};
const report:QAReport={id:REPORT_ID,projectId:"project-current",missionId:MISSION_ID,renderJobId:JOB_ID,projectRevision:9,renderSourceProjectRevision:9,status:"pass",expectations:{hookTerms:[],ctaTerms:[],evidenceTerms:[],hookWindowSeconds:5},technicalEvidence:{renderArtifactId:"render-output",durationSeconds:45,width:1080,height:1920,fps:30,hasAudio:true},findings:[{id:"technical-output-exists",category:"technical",status:"pass",severity:"info",message:"Trusted output exists.",evidence:[]}],createdAt:"2026-08-28T12:00:00.000Z"};

describe("V2.4 B4 QA Agent tool",()=>{
  it("registers latest QA inspection as read-only",()=>{
    const registry=new AgentToolRegistry([createQAReportReadTool({latest:async()=>null})]);
    expect(registry.getDefinition(INSPECT_LATEST_QA_REPORT_TOOL_ID)).toMatchObject({risk:"read",revisionPolicy:"none",idempotency:"read-only",requiresConfirmation:false});
  });

  it("forces Project scope from current Agent context and allows optional Mission scope only",async()=>{
    const calls:Array<{projectId:string;missionId?:string}>=[];
    const registry=new AgentToolRegistry([createQAReportReadTool({latest:async(projectId,missionId)=>{calls.push({projectId,missionId});return report;}})]);
    const invalid=await registry.execute({id:"invalid",toolId:INSPECT_LATEST_QA_REPORT_TOOL_ID,arguments:{projectId:"project-other"}},context);
    expect(invalid).toMatchObject({status:"error",error:{code:"invalid_tool_arguments"}});
    const response=await registry.execute({id:"read",toolId:INSPECT_LATEST_QA_REPORT_TOOL_ID,arguments:{missionId:MISSION_ID}},context);
    expect(response).toMatchObject({status:"success",output:{report:{id:REPORT_ID,projectId:"project-current"}}});
    expect(calls).toEqual([{projectId:"project-current",missionId:MISSION_ID}]);
  });
});
