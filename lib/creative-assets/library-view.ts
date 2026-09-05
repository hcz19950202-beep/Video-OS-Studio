import {z} from "zod";
import {
  CreativeAssetArtifactProfileSchema,
  CreativeAssetArtifactRoleSchema,
  CreativeAssetArtifactStateSchema,
  CreativeAssetEngineSchema,
  CreativeAssetKindSchema,
  CreativeAssetLifecycleSchema,
  CreativeAssetLogicalIdSchema,
  CreativeAssetParameterValuesSchema,
  CreativeAssetVersionStateSchema,
  type CreativeAssetManifest,
} from "@/lib/creative-assets/schema";

export const CreativeAssetLibraryArtifactViewSchema=z.object({
  id:CreativeAssetLogicalIdSchema,
  role:CreativeAssetArtifactRoleSchema,
  state:CreativeAssetArtifactStateSchema,
  profile:CreativeAssetArtifactProfileSchema,
  readyAt:z.string().datetime().optional(),
}).strict();
export type CreativeAssetLibraryArtifactView=z.infer<typeof CreativeAssetLibraryArtifactViewSchema>;

export const CreativeAssetLibraryVersionViewSchema=z.object({
  id:CreativeAssetLogicalIdSchema,
  state:CreativeAssetVersionStateSchema,
  engine:CreativeAssetEngineSchema,
  engineVersion:z.string().trim().min(1).max(128),
  origin:z.enum(["created","cloned","imported"]),
  parentVersionId:CreativeAssetLogicalIdSchema.optional(),
  rootVersionId:CreativeAssetLogicalIdSchema.optional(),
  parameterValues:CreativeAssetParameterValuesSchema,
  artifacts:z.array(CreativeAssetLibraryArtifactViewSchema).max(64),
  createdAt:z.string().datetime(),
  acceptedAt:z.string().datetime().optional(),
  failureCode:z.string().trim().min(1).max(120).optional(),
}).strict();
export type CreativeAssetLibraryVersionView=z.infer<typeof CreativeAssetLibraryVersionViewSchema>;

export const CreativeAssetLibraryActionViewSchema=z.object({
  enabled:z.boolean(),
  availableIn:z.enum(["C5","C7"]),
  reason:z.string().trim().min(1).max(240),
}).strict();

export const CreativeAssetLibraryItemSchema=z.object({
  id:CreativeAssetLogicalIdSchema,
  name:z.string().trim().min(1).max(200),
  kind:CreativeAssetKindSchema,
  engine:CreativeAssetEngineSchema,
  editable:z.boolean(),
  tags:z.array(z.string().trim().min(1).max(80)).max(64),
  lifecycle:CreativeAssetLifecycleSchema,
  latestVersionId:CreativeAssetLogicalIdSchema.optional(),
  recommendedVersionId:CreativeAssetLogicalIdSchema.optional(),
  createdAt:z.string().datetime(),
  updatedAt:z.string().datetime(),
  versions:z.array(CreativeAssetLibraryVersionViewSchema),
  actions:z.object({
    addToTimeline:CreativeAssetLibraryActionViewSchema,
    duplicateAndEdit:CreativeAssetLibraryActionViewSchema,
  }).strict(),
}).strict();
export type CreativeAssetLibraryItem=z.infer<typeof CreativeAssetLibraryItemSchema>;

export const CreativeAssetLibraryResponseSchema=z.object({
  items:z.array(CreativeAssetLibraryItemSchema),
  filters:z.object({
    kinds:z.array(CreativeAssetKindSchema),
    tags:z.array(z.string().trim().min(1).max(80)),
  }).strict(),
}).strict();
export type CreativeAssetLibraryResponse=z.infer<typeof CreativeAssetLibraryResponseSchema>;

const stagedActions={
  addToTimeline:{
    enabled:false,
    availableIn:"C5" as const,
    reason:"Project materialization and timeline placement arrive in V2.6 C5.",
  },
  duplicateAndEdit:{
    enabled:false,
    availableIn:"C7" as const,
    reason:"Immutable clone and variant editing arrive in V2.6 C7.",
  },
};

export const toCreativeAssetLibraryItem=(manifest:CreativeAssetManifest):CreativeAssetLibraryItem=>
  CreativeAssetLibraryItemSchema.parse({
    id:manifest.asset.id,
    name:manifest.asset.name,
    kind:manifest.asset.kind,
    engine:manifest.asset.engine,
    editable:manifest.asset.editable,
    tags:manifest.asset.tags,
    lifecycle:manifest.asset.lifecycle,
    latestVersionId:manifest.asset.latestVersionId,
    recommendedVersionId:manifest.asset.recommendedVersionId,
    createdAt:manifest.asset.createdAt,
    updatedAt:manifest.asset.updatedAt,
    versions:manifest.versions.map(version=>({
      id:version.id,
      state:version.state,
      engine:version.engine,
      engineVersion:version.engineVersion,
      origin:version.lineage.origin,
      parentVersionId:version.lineage.parentVersionId,
      rootVersionId:version.lineage.rootVersionId,
      parameterValues:version.parameterValues,
      artifacts:version.artifacts.map(artifact=>({
        id:artifact.id,
        role:artifact.role,
        state:artifact.state,
        profile:artifact.profile,
        readyAt:artifact.readyAt,
      })),
      createdAt:version.createdAt,
      acceptedAt:version.acceptedAt,
      failureCode:version.failureCode,
    })),
    actions:stagedActions,
  });

export type CreativeAssetLibraryFilter={
  kind?:string;
  tag?:string;
};

export const filterCreativeAssetLibraryManifests=(
  manifests:CreativeAssetManifest[],
  filter:CreativeAssetLibraryFilter,
)=>{
  const kind=filter.kind?.normalize("NFKC").trim().toLocaleLowerCase();
  const tag=filter.tag?.normalize("NFKC").trim().toLocaleLowerCase();
  return manifests.filter(manifest=>{
    if(kind&&manifest.asset.kind.toLocaleLowerCase()!==kind)return false;
    if(tag&&!manifest.asset.tags.some(candidate=>candidate.toLocaleLowerCase()===tag))return false;
    return true;
  });
};

export const buildCreativeAssetLibraryResponse=(
  manifests:CreativeAssetManifest[],
):CreativeAssetLibraryResponse=>{
  const items=manifests.map(toCreativeAssetLibraryItem);
  const kinds=[...new Set(items.map(item=>item.kind))].sort((a,b)=>a.localeCompare(b));
  const tags=[...new Set(items.flatMap(item=>item.tags))].sort((a,b)=>a.localeCompare(b));
  return CreativeAssetLibraryResponseSchema.parse({items,filters:{kinds,tags}});
};
