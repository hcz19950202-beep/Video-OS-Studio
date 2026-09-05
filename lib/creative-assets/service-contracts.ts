import {CreativeAssetContractError} from "@/lib/creative-assets/errors";
import {stableCreativeAssetSerialize} from "@/lib/creative-assets/fingerprints";
import {
  CreativeAssetParameterSchema,
  CreativeAssetParameterValuesSchema,
  CreativeAssetVersionSchema,
  type CreativeAsset,
  type CreativeAssetParameterSchema as CreativeAssetParameterSchemaType,
  type CreativeAssetParameterValues,
  type CreativeAssetVersion,
} from "@/lib/creative-assets/schema";

export const isImmutableCreativeAssetVersion=(version:CreativeAssetVersion)=>version.state==="READY"||version.state==="ARCHIVED";

export const assertCreativeAssetVersionMutable=(versionInput:CreativeAssetVersion)=>{
  const version=CreativeAssetVersionSchema.parse(versionInput);
  if(isImmutableCreativeAssetVersion(version))throw new CreativeAssetContractError("immutable_version",`Creative Asset Version ${version.id} is immutable in ${version.state} state.`);
  return version;
};

export const assertCreativeAssetVersionTransition=(currentInput:CreativeAssetVersion,nextInput:CreativeAssetVersion)=>{
  const current=CreativeAssetVersionSchema.parse(currentInput);
  const next=CreativeAssetVersionSchema.parse(nextInput);
  if(current.id!==next.id||current.creativeAssetId!==next.creativeAssetId)throw new CreativeAssetContractError("invalid_version_transition","Creative Asset Version identity cannot change during a state transition.");
  if(isImmutableCreativeAssetVersion(current)&&stableCreativeAssetSerialize(current)!==stableCreativeAssetSerialize(next))throw new CreativeAssetContractError("immutable_version",`Creative Asset Version ${current.id} cannot change after acceptance/archive.`);
  return next;
};

const failParameter=(message:string):never=>{throw new CreativeAssetContractError("invalid_parameter_values",message);};

export const validateCreativeAssetParameterValues=(schemaInput:CreativeAssetParameterSchemaType,valuesInput:CreativeAssetParameterValues)=>{
  const schema=CreativeAssetParameterSchema.parse(schemaInput);
  const values=CreativeAssetParameterValuesSchema.parse(valuesInput);
  const byKey=new Map(schema.parameters.map(parameter=>[parameter.key,parameter] as const));
  for(const key of Object.keys(values))if(!byKey.has(key))failParameter(`Parameter ${key} is not allow-listed.`);
  for(const parameter of schema.parameters){
    const value=values[parameter.key];
    if(value===undefined){
      if(parameter.required&&!("default" in parameter&&parameter.default!==undefined))failParameter(`Required parameter ${parameter.key} is missing.`);
      continue;
    }
    if(parameter.type==="string"){
      const stringValue=typeof value==="string"?value:failParameter(`Parameter ${parameter.key} must be a string.`);
      if(parameter.minLength!==undefined&&stringValue.length<parameter.minLength)failParameter(`Parameter ${parameter.key} is shorter than minLength.`);
      if(parameter.maxLength!==undefined&&stringValue.length>parameter.maxLength)failParameter(`Parameter ${parameter.key} exceeds maxLength.`);
    }else if(parameter.type==="number"){
      const numberValue=typeof value==="number"?value:failParameter(`Parameter ${parameter.key} must be a number.`);
      if(parameter.integer&&!Number.isInteger(numberValue))failParameter(`Parameter ${parameter.key} must be an integer.`);
      if(parameter.min!==undefined&&numberValue<parameter.min)failParameter(`Parameter ${parameter.key} is below min.`);
      if(parameter.max!==undefined&&numberValue>parameter.max)failParameter(`Parameter ${parameter.key} exceeds max.`);
      if(parameter.step!==undefined){
        const base=parameter.min??0;
        const steps=(numberValue-base)/parameter.step;
        if(Math.abs(steps-Math.round(steps))>1e-9)failParameter(`Parameter ${parameter.key} does not align with step.`);
      }
    }else if(parameter.type==="boolean"){
      if(typeof value!=="boolean")failParameter(`Parameter ${parameter.key} must be a boolean.`);
    }else if(parameter.type==="enum"){
      if(typeof value!=="string"||!parameter.options.includes(value))failParameter(`Parameter ${parameter.key} must be one of its allow-listed options.`);
    }else if(parameter.type==="color"){
      if(typeof value!=="string"||!/^#[0-9A-Fa-f]{6}(?:[0-9A-Fa-f]{2})?$/.test(value))failParameter(`Parameter ${parameter.key} must be a hex color.`);
    }
  }
  return values;
};

export interface CreativeAssetContractReader{
  getAsset(id:string):Promise<CreativeAsset|null>;
  getVersion(creativeAssetId:string,versionId:string):Promise<CreativeAssetVersion|null>;
}

export interface CreativeAssetVersionLifecycleService extends CreativeAssetContractReader{
  createDraft(asset:CreativeAsset,version:CreativeAssetVersion):Promise<CreativeAssetVersion>;
  cloneDraft(creativeAssetId:string,sourceVersionId:string,newVersionId:string):Promise<CreativeAssetVersion>;
  acceptVersion(creativeAssetId:string,versionId:string,expectedFingerprint:string):Promise<CreativeAssetVersion>;
}
