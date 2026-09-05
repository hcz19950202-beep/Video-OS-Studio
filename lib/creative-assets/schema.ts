import {z} from "zod";
import {ProjectIdSchema} from "@/schemas/project";

const BuiltInCreativeAssetEngineSchema=z.enum(["hyperframes","remotion","static"]);
const ExtensionEngineSchema=z.string().trim().regex(/^ext:[a-z0-9][a-z0-9._-]{0,63}$/,"Extension engines must use ext:<slug>");
const BuiltInCreativeAssetKindSchema=z.enum(["motion_graphic","animated_title","cta","transition","subtitle_treatment","brand_element","data_callout","overlay","other"]);
const ExtensionKindSchema=z.string().trim().regex(/^custom:[a-z0-9][a-z0-9._-]{0,63}$/,"Extension kinds must use custom:<slug>");

export const CreativeAssetLogicalIdSchema=z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/,"Creative Asset IDs must be logical identifiers, not filesystem paths").refine(value=>!value.includes("..")&&!/^[A-Za-z]:/.test(value),"Creative Asset IDs must not contain filesystem path semantics");
export const CreativeAssetFingerprintSchema=z.string().regex(/^[a-f0-9]{64}$/,"Creative Asset fingerprints must be lowercase SHA-256 hex");
export const CreativeAssetRelativePathSchema=z.string().trim().min(1).max(1024).refine(value=>{
  if(value.startsWith("/")||value.startsWith("\\"))return false;
  if(/^[A-Za-z]:[\\/]/.test(value)||value.includes("\\"))return false;
  const segments=value.split("/");
  return !segments.some(segment=>segment===""||segment==="."||segment==="..")&&!value.includes(":");
},"Creative Asset paths must be portable relative POSIX-style paths without traversal or drive prefixes");
export const CreativeAssetTagSchema=z.string().trim().min(1).max(80).refine(value=>!/[\\/]/.test(value)&&!value.includes(".."),"Creative Asset tags must not contain filesystem paths");

export const CreativeAssetEngineSchema=z.union([BuiltInCreativeAssetEngineSchema,ExtensionEngineSchema]);
export type CreativeAssetEngine=z.infer<typeof CreativeAssetEngineSchema>;
export const isBuiltInCreativeAssetEngine=(engine:CreativeAssetEngine):engine is z.infer<typeof BuiltInCreativeAssetEngineSchema>=>BuiltInCreativeAssetEngineSchema.safeParse(engine).success;

export const CreativeAssetKindSchema=z.union([BuiltInCreativeAssetKindSchema,ExtensionKindSchema]);
export type CreativeAssetKind=z.infer<typeof CreativeAssetKindSchema>;

export const CreativeAssetLifecycleSchema=z.enum(["active","archived"]);
export const CreativeAssetVersionStateSchema=z.enum(["DRAFT","SOURCE_READY","VALIDATING","PREVIEW_RENDERING","PREVIEW_READY","FINAL_RENDERING","READY","FAILED","CANCELLED","ARCHIVED"]);
export type CreativeAssetVersionState=z.infer<typeof CreativeAssetVersionStateSchema>;
export const CreativeAssetArtifactRoleSchema=z.enum(["thumbnail","preview","proxy","final"]);
export type CreativeAssetArtifactRole=z.infer<typeof CreativeAssetArtifactRoleSchema>;
export const CreativeAssetArtifactStateSchema=z.enum(["pending","ready","failed","cancelled"]);
export const CreativeAssetLineageOriginSchema=z.enum(["created","cloned","imported"]);

export const CreativeAssetArtifactProfileSchema=z.object({
  id:z.string().trim().min(1).max(80).regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/),
  width:z.number().int().positive().optional(),
  height:z.number().int().positive().optional(),
  fps:z.number().finite().positive().optional(),
  durationInFrames:z.number().int().positive().optional(),
  codec:z.string().trim().min(1).max(80).optional(),
  container:z.string().trim().min(1).max(32).optional(),
}).strict().superRefine((profile,ctx)=>{
  if((profile.width===undefined)!==(profile.height===undefined))ctx.addIssue({code:"custom",path:["height"],message:"Artifact profile width and height must be declared together."});
});
export type CreativeAssetArtifactProfile=z.infer<typeof CreativeAssetArtifactProfileSchema>;

const ParameterKeySchema=z.string().trim().min(1).max(80).regex(/^[A-Za-z][A-Za-z0-9_.-]*$/);
const ParameterBaseShape={key:ParameterKeySchema,label:z.string().trim().min(1).max(120).optional(),description:z.string().trim().min(1).max(500).optional(),required:z.boolean().default(false),agentEditable:z.boolean().default(true)};

const StringParameterSchema=z.object({...ParameterBaseShape,type:z.literal("string"),minLength:z.number().int().nonnegative().optional(),maxLength:z.number().int().positive().optional(),default:z.string().optional()}).strict().superRefine((parameter,ctx)=>{
  if(parameter.minLength!==undefined&&parameter.maxLength!==undefined&&parameter.minLength>parameter.maxLength)ctx.addIssue({code:"custom",path:["maxLength"],message:"String parameter maxLength must be greater than or equal to minLength."});
  if(parameter.default!==undefined&&parameter.minLength!==undefined&&parameter.default.length<parameter.minLength)ctx.addIssue({code:"custom",path:["default"],message:"String parameter default is shorter than minLength."});
  if(parameter.default!==undefined&&parameter.maxLength!==undefined&&parameter.default.length>parameter.maxLength)ctx.addIssue({code:"custom",path:["default"],message:"String parameter default exceeds maxLength."});
});
const NumberParameterSchema=z.object({...ParameterBaseShape,type:z.literal("number"),min:z.number().finite().optional(),max:z.number().finite().optional(),step:z.number().finite().positive().optional(),integer:z.boolean().default(false),default:z.number().finite().optional()}).strict().superRefine((parameter,ctx)=>{
  if(parameter.min!==undefined&&parameter.max!==undefined&&parameter.min>parameter.max)ctx.addIssue({code:"custom",path:["max"],message:"Number parameter max must be greater than or equal to min."});
  if(parameter.default!==undefined&&parameter.min!==undefined&&parameter.default<parameter.min)ctx.addIssue({code:"custom",path:["default"],message:"Number parameter default is below min."});
  if(parameter.default!==undefined&&parameter.max!==undefined&&parameter.default>parameter.max)ctx.addIssue({code:"custom",path:["default"],message:"Number parameter default exceeds max."});
  if(parameter.default!==undefined&&parameter.integer&&!Number.isInteger(parameter.default))ctx.addIssue({code:"custom",path:["default"],message:"Integer parameter default must be an integer."});
});
const BooleanParameterSchema=z.object({...ParameterBaseShape,type:z.literal("boolean"),default:z.boolean().optional()}).strict();
const EnumParameterSchema=z.object({...ParameterBaseShape,type:z.literal("enum"),options:z.array(z.string().trim().min(1).max(120)).min(1).max(64),default:z.string().optional()}).strict().superRefine((parameter,ctx)=>{
  if(new Set(parameter.options).size!==parameter.options.length)ctx.addIssue({code:"custom",path:["options"],message:"Enum parameter options must be unique."});
  if(parameter.default!==undefined&&!parameter.options.includes(parameter.default))ctx.addIssue({code:"custom",path:["default"],message:"Enum parameter default must be one of its options."});
});
const ColorParameterSchema=z.object({...ParameterBaseShape,type:z.literal("color"),default:z.string().regex(/^#[0-9A-Fa-f]{6}(?:[0-9A-Fa-f]{2})?$/).optional()}).strict();

export const CreativeAssetParameterDefinitionSchema=z.discriminatedUnion("type",[StringParameterSchema,NumberParameterSchema,BooleanParameterSchema,EnumParameterSchema,ColorParameterSchema]);
export type CreativeAssetParameterDefinition=z.infer<typeof CreativeAssetParameterDefinitionSchema>;
export const CreativeAssetParameterSchema=z.object({
  version:z.literal(1),
  parameters:z.array(CreativeAssetParameterDefinitionSchema).max(128).default([]),
}).strict().superRefine((schema,ctx)=>{
  const seen=new Set<string>();
  for(const[index,parameter]of schema.parameters.entries()){
    if(seen.has(parameter.key))ctx.addIssue({code:"custom",path:["parameters",index,"key"],message:`Duplicate parameter key ${parameter.key}.`});
    seen.add(parameter.key);
  }
});
export type CreativeAssetParameterSchema=z.infer<typeof CreativeAssetParameterSchema>;

export const CreativeAssetParameterValueSchema=z.union([z.string(),z.number().finite(),z.boolean(),z.null()]);
export const CreativeAssetParameterValuesSchema=z.record(ParameterKeySchema,CreativeAssetParameterValueSchema);
export type CreativeAssetParameterValues=z.infer<typeof CreativeAssetParameterValuesSchema>;

export const CreativeAssetLineageSchema=z.object({
  origin:CreativeAssetLineageOriginSchema,
  parentVersionId:CreativeAssetLogicalIdSchema.optional(),
  rootVersionId:CreativeAssetLogicalIdSchema.optional(),
}).strict().superRefine((lineage,ctx)=>{
  if(lineage.origin==="cloned"&&!lineage.parentVersionId)ctx.addIssue({code:"custom",path:["parentVersionId"],message:"Cloned versions require parentVersionId."});
  if(lineage.origin!=="cloned"&&lineage.parentVersionId)ctx.addIssue({code:"custom",path:["parentVersionId"],message:"Only cloned versions may declare parentVersionId."});
});
export type CreativeAssetLineage=z.infer<typeof CreativeAssetLineageSchema>;

export const CreativeAssetSourcePackageSchema=z.object({
  id:CreativeAssetLogicalIdSchema,
  creativeAssetId:CreativeAssetLogicalIdSchema,
  versionId:CreativeAssetLogicalIdSchema,
  engine:CreativeAssetEngineSchema,
  format:z.string().trim().min(1).max(80).regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/),
  rootPath:CreativeAssetRelativePathSchema,
  entrypoint:CreativeAssetRelativePathSchema.optional(),
  fingerprint:CreativeAssetFingerprintSchema,
  createdAt:z.string().datetime(),
}).strict();
export type CreativeAssetSourcePackage=z.infer<typeof CreativeAssetSourcePackageSchema>;

export const CreativeAssetArtifactSchema=z.object({
  id:CreativeAssetLogicalIdSchema,
  creativeAssetId:CreativeAssetLogicalIdSchema,
  versionId:CreativeAssetLogicalIdSchema,
  role:CreativeAssetArtifactRoleSchema,
  state:CreativeAssetArtifactStateSchema,
  profile:CreativeAssetArtifactProfileSchema,
  engine:CreativeAssetEngineSchema,
  engineVersion:z.string().trim().min(1).max(128),
  sourceFingerprint:CreativeAssetFingerprintSchema,
  relativePath:CreativeAssetRelativePathSchema.optional(),
  fingerprint:CreativeAssetFingerprintSchema.optional(),
  fingerprintScope:z.literal("creative-asset-render-v1"),
  createdAt:z.string().datetime(),
  readyAt:z.string().datetime().optional(),
}).strict().superRefine((artifact,ctx)=>{
  if(artifact.state==="ready"){
    if(!artifact.relativePath)ctx.addIssue({code:"custom",path:["relativePath"],message:"Ready artifacts require an accepted relativePath."});
    if(!artifact.fingerprint)ctx.addIssue({code:"custom",path:["fingerprint"],message:"Ready artifacts require a fingerprint."});
    if(!artifact.readyAt)ctx.addIssue({code:"custom",path:["readyAt"],message:"Ready artifacts require readyAt."});
  }else if(artifact.readyAt){
    ctx.addIssue({code:"custom",path:["readyAt"],message:"Only ready artifacts may declare readyAt."});
  }
}).transform(artifact=>artifact);
export type CreativeAssetArtifact=z.infer<typeof CreativeAssetArtifactSchema>;

export const CreativeAssetSchema=z.object({
  id:CreativeAssetLogicalIdSchema,
  name:z.string().trim().min(1).max(200),
  kind:CreativeAssetKindSchema,
  engine:CreativeAssetEngineSchema,
  editable:z.boolean(),
  tags:z.array(CreativeAssetTagSchema).max(64).default([]),
  searchText:z.string().trim().min(1).max(2_000).optional(),
  lifecycle:CreativeAssetLifecycleSchema.default("active"),
  latestVersionId:CreativeAssetLogicalIdSchema.optional(),
  recommendedVersionId:CreativeAssetLogicalIdSchema.optional(),
  createdAt:z.string().datetime(),
  updatedAt:z.string().datetime(),
  archivedAt:z.string().datetime().optional(),
}).strict().superRefine((asset,ctx)=>{
  if(new Set(asset.tags.map(tag=>tag.toLocaleLowerCase())).size!==asset.tags.length)ctx.addIssue({code:"custom",path:["tags"],message:"Creative Asset tags must be unique ignoring case."});
  if(asset.lifecycle==="archived"&&!asset.archivedAt)ctx.addIssue({code:"custom",path:["archivedAt"],message:"Archived Creative Assets require archivedAt."});
  if(asset.lifecycle==="active"&&asset.archivedAt)ctx.addIssue({code:"custom",path:["archivedAt"],message:"Active Creative Assets must not declare archivedAt."});
});
export type CreativeAsset=z.infer<typeof CreativeAssetSchema>;

export const CreativeAssetVersionSchema=z.object({
  id:CreativeAssetLogicalIdSchema,
  creativeAssetId:CreativeAssetLogicalIdSchema,
  engine:CreativeAssetEngineSchema,
  engineVersion:z.string().trim().min(1).max(128),
  state:CreativeAssetVersionStateSchema,
  lineage:CreativeAssetLineageSchema,
  sourcePackage:CreativeAssetSourcePackageSchema.optional(),
  parameterSchema:CreativeAssetParameterSchema.optional(),
  parameterValues:CreativeAssetParameterValuesSchema.default({}),
  artifacts:z.array(CreativeAssetArtifactSchema).max(64).default([]),
  versionFingerprint:CreativeAssetFingerprintSchema.optional(),
  createdAt:z.string().datetime(),
  acceptedAt:z.string().datetime().optional(),
  failureCode:z.string().trim().min(1).max(120).optional(),
}).strict().superRefine((version,ctx)=>{
  if(version.lineage.parentVersionId===version.id)ctx.addIssue({code:"custom",path:["lineage","parentVersionId"],message:"A version cannot be its own parent."});
  if(version.lineage.rootVersionId===version.id&&version.lineage.origin==="cloned")ctx.addIssue({code:"custom",path:["lineage","rootVersionId"],message:"A cloned version root must reference an earlier version."});
  if(version.sourcePackage&&(version.sourcePackage.creativeAssetId!==version.creativeAssetId||version.sourcePackage.versionId!==version.id))ctx.addIssue({code:"custom",path:["sourcePackage"],message:"Source package identity must match its owning Creative Asset Version."});
  for(const[index,artifact]of version.artifacts.entries())if(artifact.creativeAssetId!==version.creativeAssetId||artifact.versionId!==version.id)ctx.addIssue({code:"custom",path:["artifacts",index],message:"Artifact identity must match its owning Creative Asset Version."});
  const artifactIds=version.artifacts.map(artifact=>artifact.id);
  if(new Set(artifactIds).size!==artifactIds.length)ctx.addIssue({code:"custom",path:["artifacts"],message:"Artifact IDs must be unique within a version."});
  if(version.state==="READY"){
    if(!version.acceptedAt)ctx.addIssue({code:"custom",path:["acceptedAt"],message:"READY versions require acceptedAt."});
    if(!version.versionFingerprint)ctx.addIssue({code:"custom",path:["versionFingerprint"],message:"READY versions require versionFingerprint."});
    if(!version.artifacts.some(artifact=>artifact.role==="final"&&artifact.state==="ready"))ctx.addIssue({code:"custom",path:["artifacts"],message:"READY versions require at least one ready final artifact."});
  }else if(version.acceptedAt){
    ctx.addIssue({code:"custom",path:["acceptedAt"],message:"Only READY versions may declare acceptedAt."});
  }
  if((version.state==="FAILED")!==Boolean(version.failureCode))ctx.addIssue({code:"custom",path:["failureCode"],message:"FAILED versions require failureCode and non-failed versions must not declare it."});
});
export type CreativeAssetVersion=z.infer<typeof CreativeAssetVersionSchema>;

export const CreativeAssetProjectLinkSchema=z.object({
  schemaVersion:z.literal(1),
  projectId:ProjectIdSchema,
  projectAssetId:z.string().trim().min(1).max(256).optional(),
  clipId:z.string().trim().min(1).max(256).optional(),
  creativeAssetId:CreativeAssetLogicalIdSchema,
  creativeAssetVersionId:CreativeAssetLogicalIdSchema,
  artifactId:CreativeAssetLogicalIdSchema,
  materializedAt:z.string().datetime(),
}).strict().superRefine((link,ctx)=>{
  if(!link.projectAssetId&&!link.clipId)ctx.addIssue({code:"custom",path:["projectAssetId"],message:"Project provenance requires projectAssetId or clipId."});
  for(const key of ["projectAssetId","clipId"] as const){
    const value=link[key];
    if(value&&(/[\\/]/.test(value)||value.includes("..")||/^[A-Za-z]:/.test(value)))ctx.addIssue({code:"custom",path:[key],message:"Project provenance uses logical IDs, not filesystem paths."});
  }
});
export type CreativeAssetProjectLink=z.infer<typeof CreativeAssetProjectLinkSchema>;

export const CreativeAssetRenderFingerprintInputSchema=z.object({
  scope:z.literal("creative-asset-render-v1"),
  sourceFingerprint:CreativeAssetFingerprintSchema,
  parameters:CreativeAssetParameterValuesSchema,
  engine:CreativeAssetEngineSchema,
  engineVersion:z.string().trim().min(1).max(128),
  role:CreativeAssetArtifactRoleSchema,
  profile:CreativeAssetArtifactProfileSchema,
}).strict();
export type CreativeAssetRenderFingerprintInput=z.infer<typeof CreativeAssetRenderFingerprintInputSchema>;

export const CreativeAssetManifestSchema=z.object({
  schemaVersion:z.literal(1),
  asset:CreativeAssetSchema,
  versions:z.array(CreativeAssetVersionSchema).max(10_000),
}).strict().superRefine((manifest,ctx)=>{
  const ids=new Set<string>();
  for(const[index,version]of manifest.versions.entries()){
    if(version.creativeAssetId!==manifest.asset.id)ctx.addIssue({code:"custom",path:["versions",index,"creativeAssetId"],message:"Manifest versions must belong to the manifest asset."});
    if(ids.has(version.id))ctx.addIssue({code:"custom",path:["versions",index,"id"],message:`Duplicate Creative Asset Version ${version.id}.`});
    ids.add(version.id);
  }
  if(manifest.asset.latestVersionId&&!ids.has(manifest.asset.latestVersionId))ctx.addIssue({code:"custom",path:["asset","latestVersionId"],message:"latestVersionId must reference a version in the manifest."});
  if(manifest.asset.recommendedVersionId&&!ids.has(manifest.asset.recommendedVersionId))ctx.addIssue({code:"custom",path:["asset","recommendedVersionId"],message:"recommendedVersionId must reference a version in the manifest."});
});
export type CreativeAssetManifest=z.infer<typeof CreativeAssetManifestSchema>;

export const CreativeAssetIndexEntrySchema=z.object({
  assetId:CreativeAssetLogicalIdSchema,
  name:z.string().trim().min(1).max(200),
  kind:CreativeAssetKindSchema,
  engine:CreativeAssetEngineSchema,
  editable:z.boolean(),
  tags:z.array(CreativeAssetTagSchema).max(64),
  lifecycle:CreativeAssetLifecycleSchema,
  latestVersionId:CreativeAssetLogicalIdSchema.optional(),
  recommendedVersionId:CreativeAssetLogicalIdSchema.optional(),
  updatedAt:z.string().datetime(),
}).strict();
export const CreativeAssetIndexSchema=z.object({schemaVersion:z.literal(1),entries:z.array(CreativeAssetIndexEntrySchema).max(100_000)}).strict().superRefine((index,ctx)=>{
  const ids=new Set<string>();
  for(const[entryIndex,entry]of index.entries.entries()){
    if(ids.has(entry.assetId))ctx.addIssue({code:"custom",path:["entries",entryIndex,"assetId"],message:`Duplicate Creative Asset index entry ${entry.assetId}.`});
    ids.add(entry.assetId);
  }
});
export type CreativeAssetIndex=z.infer<typeof CreativeAssetIndexSchema>;
