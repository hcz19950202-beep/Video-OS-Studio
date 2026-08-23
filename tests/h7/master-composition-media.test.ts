import {describe,expect,it} from "vitest";
import {brollMediaKind,brollRenderRank} from "@/remotion/MasterComposition";

describe("H7 B-roll media routing",()=>{
  it("routes image Assets to a still-image renderer instead of video playback",()=>{
    expect(brollMediaKind("image")).toBe("image");
  });

  it("keeps video Assets on the video renderer",()=>{
    expect(brollMediaKind("video")).toBe("video");
  });

  it("keeps image B-roll above same-layer video B-roll in the final composition",()=>{
    expect(brollRenderRank("video")).toBeLessThan(brollRenderRank("image"));
  });
});
