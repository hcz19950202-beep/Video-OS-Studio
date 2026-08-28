import {VideoSkillSchema,VideoSkillSearchQuerySchema,VideoSkillSearchResultSchema,VideoSkillSelectionRequestSchema,videoSkillEvidenceId,type VideoSkill,type VideoSkillApplicationMode,type VideoSkillContextKey,type VideoSkillRef,type VideoSkillSearchQuery,type VideoSkillSearchResult,type VideoSkillSelectionRequest} from "@/lib/production/skills/schema";

const semverParts=(version:string)=>version.split(".").map(Number) as [number,number,number];
const compareVersions=(left:string,right:string)=>{
  const a=semverParts(left);const b=semverParts(right);
  for(let index=0;index<3;index+=1)if(a[index]!==b[index])return b[index]-a[index];
  return 0;
};
const normalizedTokens=(value:string)=>value.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
const skillRef=(skill:VideoSkill):VideoSkillRef=>({id:skill.id,version:skill.version});

export class VideoSkillContextError extends Error{
  constructor(readonly missingContext:VideoSkillContextKey[]){super(`Video Skill is missing required context: ${missingContext.join(", ")}`);this.name="VideoSkillContextError";}
}

export type VideoSkillApplicationHints={reusableSkillRefs?:readonly string[];modifiableSkillIds?:readonly string[]};

export class VideoSkillRegistry{
  private readonly skills:VideoSkill[];
  private readonly byEvidenceId:Map<string,VideoSkill>;

  constructor(skills:readonly VideoSkill[]){
    this.skills=[];this.byEvidenceId=new Map();
    for(const input of skills){
      const skill=VideoSkillSchema.parse(input);const evidenceId=videoSkillEvidenceId(skill);
      if(this.byEvidenceId.has(evidenceId))throw new Error(`Duplicate Video Skill version: ${evidenceId}`);
      this.byEvidenceId.set(evidenceId,skill);this.skills.push(skill);
    }
    this.skills.sort((a,b)=>a.id.localeCompare(b.id)||compareVersions(a.version,b.version));
  }

  list():VideoSkill[]{return this.skills.map(skill=>structuredClone(skill));}

  get(id:string,version?:string):VideoSkill|undefined{
    if(version){const skill=this.byEvidenceId.get(`${id}@${version}`);return skill?structuredClone(skill):undefined;}
    const skill=this.skills.filter(candidate=>candidate.id===id).sort((a,b)=>compareVersions(a.version,b.version))[0];
    return skill?structuredClone(skill):undefined;
  }

  search(queryInput:VideoSkillSearchQuery,availableContextInput:readonly VideoSkillContextKey[]=[]):VideoSkillSearchResult[]{
    const query=VideoSkillSearchQuerySchema.parse(queryInput);const availableContext=new Set(availableContextInput);const tokens=normalizedTokens(query.query??"");
    return this.skills.map(skill=>{
      const searchable=[skill.id,skill.title,skill.intendedUse,...skill.discoveryTerms].join(" ").toLowerCase();
      const matched=tokens.filter(token=>searchable.includes(token)).length;
      const score=tokens.length===0?1:Math.min(1,matched/tokens.length+(searchable.includes((query.query??"").toLowerCase())?0.25:0));
      const missingContext=skill.requiredContext.filter(key=>!availableContext.has(key));
      return VideoSkillSearchResultSchema.parse({skill:skillRef(skill),title:skill.title,intendedUse:skill.intendedUse,requiredContext:skill.requiredContext,missingContext,risk:skill.riskPolicy.risk,score});
    }).filter(result=>tokens.length===0||result.score>0).sort((a,b)=>b.score-a.score||a.missingContext.length-b.missingContext.length||a.skill.id.localeCompare(b.skill.id)||compareVersions(a.skill.version,b.skill.version)).slice(0,query.maxResults);
  }

  chooseApplicationMode(skill:VideoSkillRef,hints:VideoSkillApplicationHints={}):VideoSkillApplicationMode{
    const evidenceId=videoSkillEvidenceId(skill);
    if(new Set(hints.reusableSkillRefs??[]).has(evidenceId))return"reuse";
    if(new Set(hints.modifiableSkillIds??[]).has(skill.id))return"modify";
    return"create";
  }

  buildSelectionRequest(input:{projectId:string;baseProjectRevision:number;skill:VideoSkill;intent:string;availableContext:readonly VideoSkillContextKey[];hints?:VideoSkillApplicationHints}):VideoSkillSelectionRequest{
    const available=new Set(input.availableContext);const missing=input.skill.requiredContext.filter(key=>!available.has(key));
    if(missing.length)throw new VideoSkillContextError(missing);
    const ref=skillRef(input.skill);const mode=this.chooseApplicationMode(ref,input.hints);
    return VideoSkillSelectionRequestSchema.parse({projectId:input.projectId,baseProjectRevision:input.baseProjectRevision,skill:ref,mode,intent:input.intent,requiredContext:input.skill.requiredContext,rationale:[`Selected ${videoSkillEvidenceId(ref)} from the allow-listed Video Skill registry.`,`Application mode resolved as ${mode} using REUSE > MODIFY > CREATE precedence.`]});
  }
}
