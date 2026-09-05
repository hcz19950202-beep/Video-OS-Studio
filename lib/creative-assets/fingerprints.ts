import {createHash} from "node:crypto";
import {CreativeAssetRenderFingerprintInputSchema,type CreativeAssetRenderFingerprintInput} from "@/lib/creative-assets/schema";

const normalizeJson=(value:unknown):unknown=>{
  if(value===null||typeof value==="string"||typeof value==="boolean")return value;
  if(typeof value==="number"){
    if(!Number.isFinite(value))throw new Error("Creative Asset fingerprint input cannot contain non-finite numbers.");
    return Object.is(value,-0)?0:value;
  }
  if(Array.isArray(value))return value.map(normalizeJson);
  if(typeof value==="object"){
    const record=value as Record<string,unknown>;
    return Object.fromEntries(Object.keys(record).sort().filter(key=>record[key]!==undefined).map(key=>[key,normalizeJson(record[key])]));
  }
  throw new Error(`Creative Asset fingerprint input contains unsupported ${typeof value} value.`);
};

export const stableCreativeAssetSerialize=(value:unknown)=>JSON.stringify(normalizeJson(value));
export const createCreativeAssetRenderFingerprint=(input:CreativeAssetRenderFingerprintInput)=>{
  const normalized=CreativeAssetRenderFingerprintInputSchema.parse(input);
  return createHash("sha256").update(stableCreativeAssetSerialize(normalized),"utf8").digest("hex");
};
