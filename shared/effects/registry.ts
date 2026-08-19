import type {EffectDefinition} from "./types";
import {EFFECT_CATALOG} from "./catalog";
import {BigNumber} from "./remotion/BigNumber/Component";
import {MetricFocus} from "./remotion/MetricFocus/Component";
import {KeywordImpact} from "./remotion/KeywordImpact/Component";
import {LowerThird} from "./remotion/LowerThird/Component";

const COMPONENTS={
  "big-number":BigNumber,
  "metric-focus":MetricFocus,
  "keyword-impact":KeywordImpact,
  "lower-third":LowerThird,
} as const;

export const EFFECT_REGISTRY:EffectDefinition[]=EFFECT_CATALOG.map((effect)=>({
  ...effect,
  component:COMPONENTS[effect.id as keyof typeof COMPONENTS],
}));

export const EFFECTS_BY_ID=Object.fromEntries(EFFECT_REGISTRY.map((effect)=>[effect.id,effect])) as Record<string,EffectDefinition>;
