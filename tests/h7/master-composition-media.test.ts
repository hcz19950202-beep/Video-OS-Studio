import {describe,expect,it} from "vitest";
import {brollMediaKind} from "@/remotion/MasterComposition";

describe("H7 B-roll media routing",()=>{
  it("routes image Assets to a still-image renderer instead of video playback",()=>{
    expect(brollMediaKind("image")).toBe("image");
  });

  it("keeps video Assets on the video renderer",()=>{
    expect(brollMediaKind("video")).toBe("video");
  });
});
