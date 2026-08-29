import {describe,expect,it} from "vitest";
import {ProductionCampaignSharedReferencesSchema} from "@/lib/production/campaign/schema";

describe("B7 Campaign shared references",()=>{
  it("defaults brand references for previously persisted Campaign shapes",()=>{
    const parsed=ProductionCampaignSharedReferencesSchema.parse({
      assetIds:["asset.hero"],
      policyIds:[],
      skillIds:["skill.proof"],
      exportTemplateIds:[],
    });
    expect(parsed.brandIds).toEqual([]);
    expect(parsed.assetIds).toEqual(["asset.hero"]);
  });

  it("accepts logical Brand IDs and rejects filesystem-like Brand references",()=>{
    expect(ProductionCampaignSharedReferencesSchema.parse({
      brandIds:["brand.modular-au"],
      assetIds:[],
      policyIds:[],
      skillIds:[],
      exportTemplateIds:[],
    }).brandIds).toEqual(["brand.modular-au"]);
    expect(()=>ProductionCampaignSharedReferencesSchema.parse({
      brandIds:["C:\\brands\\secret.json"],
      assetIds:[],
      policyIds:[],
      skillIds:[],
      exportTemplateIds:[],
    })).toThrow(/logical IDs/);
  });
});
