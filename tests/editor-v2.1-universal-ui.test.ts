import {describe,expect,it} from "vitest";
import {CANVAS_PRESETS,describeCanvas,fitCanvasInside,getAspectLabel,getCanvasOrientation,normalizeCanvasSize} from "@/lib/canvas/aspect";

describe("V2.1 universal canvas contract",()=>{
  it("classifies landscape portrait square ultrawide and tall canvases without a portrait-first assumption",()=>{
    expect(getCanvasOrientation(1920,1080)).toBe("landscape");
    expect(getCanvasOrientation(1080,1920)).toBe("portrait");
    expect(getCanvasOrientation(1080,1080)).toBe("square");
    expect(getCanvasOrientation(2560,1080)).toBe("ultrawide");
    expect(getCanvasOrientation(900,1800)).toBe("tall");
  });

  it("keeps custom canvas sizes first class",()=>{
    expect(normalizeCanvasSize(1600,900)).toEqual({width:1600,height:900});
    expect(normalizeCanvasSize(900,1600)).toEqual({width:900,height:1600});
    expect(describeCanvas(1600,900)).toMatchObject({width:1600,height:900,orientation:"landscape",preset:"custom"});
    expect(describeCanvas(900,1600)).toMatchObject({width:900,height:1600,orientation:"portrait",preset:"custom"});
  });

  it("exposes common ratios as shortcuts rather than a supported-format whitelist",()=>{
    expect(CANVAS_PRESETS.map(preset=>preset.label)).toEqual(expect.arrayContaining(["16:9","9:16","1:1","4:5","3:4","4:3","21:9"]));
    expect(getAspectLabel(1920,1080)).toBe("16:9");
    expect(getAspectLabel(1080,1920)).toBe("9:16");
    expect(getAspectLabel(1000,777)).toBe("1000×777");
  });

  it("fits any canvas into the same available viewer region",()=>{
    const landscape=fitCanvasInside(1000,700,1920,1080,20);
    const portrait=fitCanvasInside(1000,700,1080,1920,20);
    const square=fitCanvasInside(1000,700,1080,1080,20);
    const ultrawide=fitCanvasInside(1000,700,2560,1080,20);
    for(const result of[landscape,portrait,square,ultrawide]){
      expect(result.width).toBeLessThanOrEqual(960);
      expect(result.height).toBeLessThanOrEqual(660);
      expect(result.scale).toBeGreaterThan(0);
    }
    expect(landscape.width).toBeGreaterThan(portrait.width);
    expect(portrait.height).toBeGreaterThan(landscape.height);
  });
});
