import {describe,expect,it} from "vitest";
import {
  CreativeAssetArtifactSchema,
  CreativeAssetEngineSchema,
  CreativeAssetKindSchema,
  CreativeAssetManifestSchema,
  CreativeAssetParameterSchema,
  CreativeAssetProjectLinkSchema,
  CreativeAssetRelativePathSchema,
  CreativeAssetVersionSchema,
} from "@/lib/creative-assets/schema";
import {creativeAssetStorageKey,creativeAssetVersionStorageKey,normalizeCreativeAssetLogicalId} from "@/lib/creative-assets/ids";
import {createCreativeAssetRenderFingerprint,stableCreativeAssetSerialize} from "@/lib/creative-assets/fingerprints";
import {assertCreativeAssetVersionTransition,validateCreativeAssetParameterValues} from "@/lib/creative-assets/service-contracts";
import {ProjectSchema} from "@/schemas/project";

const now="2026-09-05T00:00:00.000Z";
const hashA="a".repeat(64);
const hashB="b".repeat(64);
const profile={id:"final-1080p",width:1920,height:1080,fps:30,durationInFrames:90,codec:"vp9",container:"webm"};
const readyArtifact={id:"artifact-1",creativeAssetId:"asset-1",versionId:"version-1",role:"final" as const,state:"ready" as const,profile,engine:"hyperframes" as const,engineVersion:"1.2.3",sourceFingerprint:hashA,relativePath:"render/final.webm",fingerprint:hashB,fingerprintScope:"creative-asset-render-v1" as const,createdAt:now,readyAt:now};
const readyVersion={id:"version-1",creativeAssetId:"asset-1",engine:"hyperframes" as const,engineVersion:"1.2.3",state:"READY" as const,lineage:{origin:"created" as const},parameterSchema:{version:1 as const,parameters:[{key:"text",type:"string" as const,required:true,maxLength:80,agentEditable:true}]},parameterValues:{text:"$49,900"},artifacts:[readyArtifact],versionFingerprint:hashB,createdAt:now,acceptedAt:now};
const asset={id:"asset-1",name:"Price Highlight",kind:"motion_graphic" as const,engine:"hyperframes" as const,editable:true,tags:["price","cta"],lifecycle:"active" as const,latestVersionId:"version-1",recommendedVersionId:"version-1",createdAt:now,updatedAt:now};

describe("V2.6 C0 Creative Asset contracts",()=>{
  it("accepts the frozen Creative Asset, version, artifact and manifest contract",()=>{
    expect(CreativeAssetVersionSchema.parse(readyVersion).state).toBe("READY");
    expect(CreativeAssetArtifactSchema.parse(readyArtifact).role).toBe("final");
    expect(CreativeAssetManifestSchema.parse({schemaVersion:1,asset,versions:[readyVersion]}).asset.id).toBe("asset-1");
  });

  it("uses explicit extension namespaces while rejecting unknown engines and kinds fail-safe",()=>{
    expect(()=>CreativeAssetEngineSchema.parse("after-effects")).toThrow();
    expect(()=>CreativeAssetKindSchema.parse("lower_third_unknown")).toThrow();
    expect(CreativeAssetEngineSchema.parse("ext:after-effects")).toBe("ext:after-effects");
    expect(CreativeAssetKindSchema.parse("custom:lower-third")).toBe("custom:lower-third");
  });

  it("keeps logical IDs separate from deterministic Windows-safe storage keys",()=>{
    expect(normalizeCreativeAssetLogicalId("  asset-1  ")).toBe("asset-1");
    expect(creativeAssetStorageKey("asset-1")).toMatch(/^[a-f0-9]{64}$/);
    expect(creativeAssetStorageKey(" asset-1 ")).toBe(creativeAssetStorageKey("asset-1"));
    expect(creativeAssetVersionStorageKey("asset-1","version-1")).not.toBe(creativeAssetStorageKey("version-1"));
    expect(()=>normalizeCreativeAssetLogicalId("C:\\Users\\me\\asset")).toThrow();
  });

  it("rejects absolute, traversal and Windows-path artifact identity leakage",()=>{
    expect(CreativeAssetRelativePathSchema.parse("render/final.webm")).toBe("render/final.webm");
    expect(()=>CreativeAssetRelativePathSchema.parse("C:\\tmp\\final.webm")).toThrow();
    expect(()=>CreativeAssetRelativePathSchema.parse("/tmp/final.webm")).toThrow();
    expect(()=>CreativeAssetRelativePathSchema.parse("render/../final.webm")).toThrow();
    expect(()=>CreativeAssetProjectLinkSchema.parse({schemaVersion:1,projectId:"project-1",projectAssetId:"C:\\tmp\\asset",creativeAssetId:"asset-1",creativeAssetVersionId:"version-1",artifactId:"artifact-1",materializedAt:now})).toThrow();
  });

  it("requires accepted READY versions to have deterministic final artifact evidence",()=>{
    expect(()=>CreativeAssetVersionSchema.parse({...readyVersion,acceptedAt:undefined})).toThrow();
    expect(()=>CreativeAssetVersionSchema.parse({...readyVersion,versionFingerprint:undefined})).toThrow();
    expect(()=>CreativeAssetVersionSchema.parse({...readyVersion,artifacts:[{...readyArtifact,state:"pending",relativePath:undefined,fingerprint:undefined,readyAt:undefined}]})).toThrow();
    expect(()=>CreativeAssetArtifactSchema.parse({...readyArtifact,state:"ready",relativePath:undefined})).toThrow();
  });

  it("validates clone lineage and preserves accepted versions as immutable snapshots",()=>{
    expect(()=>CreativeAssetVersionSchema.parse({...readyVersion,id:"version-2",state:"DRAFT",acceptedAt:undefined,versionFingerprint:undefined,artifacts:[],lineage:{origin:"cloned"}})).toThrow();
    expect(()=>CreativeAssetVersionSchema.parse({...readyVersion,id:"version-2",state:"DRAFT",acceptedAt:undefined,versionFingerprint:undefined,artifacts:[],lineage:{origin:"cloned",parentVersionId:"version-2"}})).toThrow();
    expect(()=>assertCreativeAssetVersionTransition(readyVersion,{...readyVersion,parameterValues:{text:"$59,900"}})).toThrow(/cannot change after acceptance/i);
    expect(assertCreativeAssetVersionTransition(readyVersion,{...readyVersion}).id).toBe("version-1");
  });

  it("enforces typed and bounded allow-listed parameter values",()=>{
    const schema=CreativeAssetParameterSchema.parse({version:1,parameters:[
      {key:"text",type:"string",required:true,minLength:1,maxLength:20},
      {key:"fontSize",type:"number",min:12,max:240,integer:true},
      {key:"variant",type:"enum",options:["primary","compact"]},
      {key:"accentColor",type:"color"},
    ]});
    expect(validateCreativeAssetParameterValues(schema,{text:"$49,900",fontSize:64,variant:"primary",accentColor:"#FFAA00"}).fontSize).toBe(64);
    expect(()=>validateCreativeAssetParameterValues(schema,{text:"$49,900",fontSize:300})).toThrow(/exceeds max/i);
    expect(()=>validateCreativeAssetParameterValues(schema,{text:"$49,900",unknown:"nope"})).toThrow(/allow-listed/i);
    expect(()=>CreativeAssetParameterSchema.parse({version:1,parameters:[{key:"fontSize",type:"number",min:240,max:12}]})).toThrow();
  });

  it("creates deterministic fingerprints from normalized sorted payloads and detects stale inputs",()=>{
    const first=createCreativeAssetRenderFingerprint({scope:"creative-asset-render-v1",sourceFingerprint:hashA,parameters:{text:"$49,900",fontSize:64},engine:"hyperframes",engineVersion:"1.2.3",role:"final",profile});
    const reordered=createCreativeAssetRenderFingerprint({scope:"creative-asset-render-v1",sourceFingerprint:hashA,parameters:{fontSize:64,text:"$49,900"},engine:"hyperframes",engineVersion:"1.2.3",role:"final",profile:{container:"webm",codec:"vp9",durationInFrames:90,fps:30,height:1080,width:1920,id:"final-1080p"}});
    const changed=createCreativeAssetRenderFingerprint({scope:"creative-asset-render-v1",sourceFingerprint:hashA,parameters:{text:"$49,900",fontSize:64},engine:"hyperframes",engineVersion:"1.2.3",role:"final",profile:{...profile,width:1280,height:720}});
    expect(first).toBe(reordered);
    expect(first).not.toBe(changed);
    expect(stableCreativeAssetSerialize({b:2,a:1})).toBe('{"a":1,"b":2}');
  });

  it("proves current Project Schema 2.0.0 already represents reusable placement needs",()=>{
    const project=ProjectSchema.parse({
      version:"2.0.0",
      project:{id:"project-1",name:"C0 mapping proof",revision:0,createdAt:now,updatedAt:now},
      canvas:{width:1920,height:1080,fps:30,durationInFrames:300},
      assets:[{id:"materialized-asset-1",kind:"overlay",relativePath:"assets/creative/price-highlight.webm",durationInFrames:90,width:1920,height:1080,sourceFps:30}],
      tracks:[{id:"motion-track-1",type:"motion",name:"Motion",clips:[{id:"motion-clip-1",type:"motion",engine:"hyperframes",effectId:"price-highlight",assetId:"materialized-asset-1",startFrame:30,durationInFrames:90,layer:3,props:{text:"$49,900",fontSize:64},transform:{x:120,y:80,scale:1.1,rotation:4,opacity:.9,anchor:"center"}}]}],
    });
    const clip=project.tracks[0]?.clips[0];
    expect(project.version).toBe("2.0.0");
    expect(clip?.type).toBe("motion");
    expect(clip&&"props" in clip?clip.props.text:undefined).toBe("$49,900");
    expect(clip?.startFrame).toBe(30);
    expect(clip?.layer).toBe(3);
  });

  it("requires project provenance to identify at least one materialized Project object",()=>{
    expect(CreativeAssetProjectLinkSchema.parse({schemaVersion:1,projectId:"project-1",clipId:"motion-clip-1",creativeAssetId:"asset-1",creativeAssetVersionId:"version-1",artifactId:"artifact-1",materializedAt:now}).clipId).toBe("motion-clip-1");
    expect(()=>CreativeAssetProjectLinkSchema.parse({schemaVersion:1,projectId:"project-1",creativeAssetId:"asset-1",creativeAssetVersionId:"version-1",artifactId:"artifact-1",materializedAt:now})).toThrow();
  });
});
