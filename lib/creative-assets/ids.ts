import {createHash} from "node:crypto";
import {CreativeAssetLogicalIdSchema} from "@/lib/creative-assets/schema";

export const normalizeCreativeAssetLogicalId=(value:string)=>CreativeAssetLogicalIdSchema.parse(value.normalize("NFKC").trim());

const hashKey=(scope:string,parts:string[])=>createHash("sha256").update([scope,...parts].join("\0"),"utf8").digest("hex");

export const creativeAssetStorageKey=(creativeAssetId:string)=>hashKey("creative-asset-v1",[normalizeCreativeAssetLogicalId(creativeAssetId)]);
export const creativeAssetVersionStorageKey=(creativeAssetId:string,versionId:string)=>hashKey("creative-asset-version-v1",[normalizeCreativeAssetLogicalId(creativeAssetId),normalizeCreativeAssetLogicalId(versionId)]);
export const creativeAssetProjectLinkStorageKey=(projectId:string,projectObjectId:string)=>hashKey("creative-asset-project-link-v1",[projectId.normalize("NFKC").trim(),projectObjectId.normalize("NFKC").trim()]);
