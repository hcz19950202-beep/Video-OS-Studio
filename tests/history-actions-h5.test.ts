import {describe,expect,it} from "vitest";
import {ProjectRequestError} from "@/lib/client/project-mutations";
import {runHistoryAction} from "@/components/timeline/useTimelineProjectActions";

describe("H5 timeline history action boundary",()=>{
  it("consumes an expected stale revision conflict after the action reloads latest state",async()=>{
    await expect(runHistoryAction(async()=>{
      throw new ProjectRequestError("Project changed",409,"PROJECT_REVISION_CONFLICT");
    })).resolves.toBe(false);
  });

  it("still exposes unexpected history failures to the caller",async()=>{
    await expect(runHistoryAction(async()=>{throw new Error("network failure");})).rejects.toThrow("network failure");
  });
});
