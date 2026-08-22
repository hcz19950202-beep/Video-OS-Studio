import {describe,expect,it} from "vitest";
import {SAFE_AREA_PROFILES,normalizeSafeArea,safeAreaProfileById,safeAreaRect} from "@/lib/canvas/safe-area";
import {evaluateEffectCompatibility,getEffectCapability} from "@/shared/effects/capabilities";
import {EFFECT_CATALOG_BY_ID} from "@/shared/effects/catalog";

describe("V2.1 Rev.2 completion foundation",()=>{
  it("provides normalized platform safe-area profiles without changing canvas dimensions",()=>{
    expect(SAFE_AREA_PROFILES.map(profile=>profile.id)).toEqual(expect.arrayContaining(["generic","youtube","tiktok","instagram-reels","instagram-feed","facebook","custom"]));
    const tiktok=safeAreaProfileById("tiktok");
    const rect=safeAreaRect(1920,1080,tiktok.insets);
    expect(rect.x).toBeGreaterThan(0);
    expect(rect.y).toBeGreaterThan(0);
    expect(rect.width).toBeLessThan(1920);
    expect(rect.height).toBeLessThan(1080);
    expect(normalizeSafeArea({top:2,right:-1,bottom:.2,left:.1})).toEqual({top:.45,right:0,bottom:.2,left:.1});
  });

  it("keeps custom safe areas normalized",()=>{
    const custom=safeAreaProfileById("custom",{top:.12,right:.11,bottom:.2,left:.09});
    expect(custom.insets).toEqual({top:.12,right:.11,bottom:.2,left:.09});
  });

  it("attaches explicit layout/aspect capability metadata to every Remotion effect",()=>{
    for(const effect of Object.values(EFFECT_CATALOG_BY_ID)){
      expect(effect.capability.layoutMode).toMatch(/relative|responsive|fixed/);
      expect(effect.capability.recommendedAspects.length).toBeGreaterThan(0);
      expect(effect.capability.unsupportedAspects).toBeDefined();
      expect(effect.capability).toEqual(getEffectCapability(effect.id));
    }
  });

  it("evaluates compatibility against arbitrary project canvases",()=>{
    expect(evaluateEffectCompatibility("big-number",1920,1080)).toMatchObject({family:"landscape",status:"recommended"});
    expect(evaluateEffectCompatibility("keyword-impact",2560,1080)).toMatchObject({family:"ultrawide",status:"recommended"});
    expect(evaluateEffectCompatibility("lower-third",900,1800)).toMatchObject({family:"tall",status:"supported"});
  });
});
