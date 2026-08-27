import {describe,expect,it} from "vitest";
import {workflowErrorResponse} from "@/lib/workflows/http";

describe("V2.3.1 H0 Workflow HTTP error boundary",()=>{
  it("maps unknown internal failures to a sanitized retryable 500",async()=>{
    const secret="C:\\Users\\private\\provider-secret.txt";
    const response=workflowErrorResponse(new Error(secret));
    const body=await response.json() as {code:string;message:string;retryable:boolean};

    expect(response.status).toBe(500);
    expect(body).toEqual({
      code:"WORKFLOW_INTERNAL",
      message:"The workflow request failed because of an internal server error.",
      retryable:true,
    });
    expect(JSON.stringify(body)).not.toContain("private");
    expect(JSON.stringify(body)).not.toContain("provider-secret");
  });
});
