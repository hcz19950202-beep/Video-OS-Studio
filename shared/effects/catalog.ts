import type {z} from "zod";
import {BigNumberDefaults} from "./remotion/BigNumber/defaults";
import {BigNumberMetadata} from "./remotion/BigNumber/metadata";
import {BigNumberFields,BigNumberPropsSchema} from "./remotion/BigNumber/schema";
import {MetricFocusDefaults} from "./remotion/MetricFocus/defaults";
import {MetricFocusMetadata} from "./remotion/MetricFocus/metadata";
import {MetricFocusFields,MetricFocusPropsSchema} from "./remotion/MetricFocus/schema";
import {KeywordImpactDefaults} from "./remotion/KeywordImpact/defaults";
import {KeywordImpactMetadata} from "./remotion/KeywordImpact/metadata";
import {KeywordImpactFields,KeywordImpactPropsSchema} from "./remotion/KeywordImpact/schema";
import {LowerThirdDefaults} from "./remotion/LowerThird/defaults";
import {LowerThirdMetadata} from "./remotion/LowerThird/metadata";
import {LowerThirdFields,LowerThirdPropsSchema} from "./remotion/LowerThird/schema";
import {getEffectCapability,type EffectCapability} from "./capabilities";
import type {EffectCategory,EffectField} from "./types";

export type EffectCatalogEntry={
  id:string;
  name:string;
  engine:"remotion";
  category:EffectCategory;
  tags:string[];
  thumbnail:string;
  defaultDurationInFrames:number;
  schema:z.ZodType<Record<string,unknown>>;
  defaults:Record<string,unknown>;
  fields:EffectField[];
  capability:EffectCapability;
};

const withCapability=<T extends Omit<EffectCatalogEntry,"capability">>(effect:T):EffectCatalogEntry=>({...effect,capability:getEffectCapability(effect.id)});

export const EFFECT_CATALOG:EffectCatalogEntry[]=[
  withCapability({...BigNumberMetadata,schema:BigNumberPropsSchema,defaults:BigNumberDefaults,fields:BigNumberFields}),
  withCapability({...MetricFocusMetadata,schema:MetricFocusPropsSchema,defaults:MetricFocusDefaults,fields:MetricFocusFields}),
  withCapability({...KeywordImpactMetadata,schema:KeywordImpactPropsSchema,defaults:KeywordImpactDefaults,fields:KeywordImpactFields}),
  withCapability({...LowerThirdMetadata,schema:LowerThirdPropsSchema,defaults:LowerThirdDefaults,fields:LowerThirdFields}),
];

export const EFFECT_CATALOG_BY_ID=Object.fromEntries(EFFECT_CATALOG.map((effect)=>[effect.id,effect])) as Record<string,EffectCatalogEntry>;
