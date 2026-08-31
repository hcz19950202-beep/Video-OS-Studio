import {describe,expect,it} from "vitest";
import {C5_CREATE_EDIT_PROPOSAL_TOOL_ID} from "@/lib/ai/tools/shared-proposal-tools";
import {getLocalMcpControlledToolCatalog} from "@/lib/server/mcp-runtime";

describe("V2.5 C5 Permission Center catalog",()=>{
  it("reports the same controlled MCP authority that the bridge exposes",()=>{
    const catalog=getLocalMcpControlledToolCatalog();
    const proposal=catalog.find(tool=>tool.id===C5_CREATE_EDIT_PROPOSAL_TOOL_ID);

    expect(proposal).toMatchObject({
      riskClass:"R1",
      authority:"proposal-only",
      approval:{defaultMode:"auto",allowSessionOverride:false},
      revisionPolicy:"snapshot",
      idempotency:"proposal-only",
    });
    expect(proposal?.requiredScopes).toContain("project:propose");
    expect(proposal?.requiredScopes).not.toContain("project:write");

    for(const tool of catalog){
      expect(["R0","R1"]).toContain(tool.riskClass);
      if(tool.riskClass==="R0")expect(tool.authority).toBe("direct-read");
      if(tool.riskClass==="R1"){
        expect(tool.authority).toBe("proposal-only");
        expect(tool.approval).toEqual({defaultMode:"auto",allowSessionOverride:false});
        expect(tool.requiredScopes).not.toContain("project:write");
      }
    }
  });
});
