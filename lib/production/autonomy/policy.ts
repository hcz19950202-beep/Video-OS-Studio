import {
  ProductionEditProtectionRecordSchema,
  ProductionMutationTargetSchema,
  ProductionProtectionAssessmentSchema,
  productionLogicalTargetKey,
  type ProductionEditProtectionRecord,
  type ProductionMutationTarget,
  type ProductionProtectionAssessment,
  type ProductionProtectionFinding,
} from "@/lib/production/autonomy/schema";
import type {Project} from "@/schemas/project";

const decisionRank={allow:0,review:1,block:2} as const;
const clipContainer=(project:Project,clipId:string)=>project.tracks.find(track=>track.clips.some(clip=>clip.id===clipId));
const targetExists=(project:Project,target:ProductionMutationTarget)=>{
  switch(target.kind){
    case"project":case"canvas":case"script":case"brand":case"language":return true;
    case"asset":return project.assets.some(item=>item.id===target.id);
    case"track":return project.tracks.some(item=>item.id===target.id);
    case"clip":return project.tracks.some(track=>track.clips.some(item=>item.id===target.id));
    case"scene":return project.scenes.some(item=>item.id===target.id);
    case"marker":return project.markers.some(item=>item.id===target.id);
    case"linked-style":return project.linkedStyles.some(item=>item.id===target.id);
  }
};
const targetLocked=(project:Project,target:ProductionMutationTarget)=>{
  if(target.kind==="track")return project.tracks.find(item=>item.id===target.id)?.locked===true;
  if(target.kind==="clip")return clipContainer(project,target.id!)?.locked===true;
  return false;
};
const finding=(target:ProductionMutationTarget,decision:"review"|"block",code:string,reason:string):ProductionProtectionFinding=>({target,decision,code,reason});

export const evaluateProductionEditProtection=(
  project:Project,
  targetsInput:ProductionMutationTarget[],
  recordsInput:ProductionEditProtectionRecord[]=[]
):ProductionProtectionAssessment=>{
  const targets=targetsInput.map(target=>ProductionMutationTargetSchema.parse(target));
  const records=recordsInput.map(record=>ProductionEditProtectionRecordSchema.parse(record));
  if(targets.length===0){
    return ProductionProtectionAssessmentSchema.parse({
      decision:"review",
      findings:[finding({kind:"project",action:"modify"},"review","EDIT_TARGETS_UNDECLARED","Autonomous Project edits require explicit logical target scope before mutation.")],
    });
  }

  const recordByKey=new Map(records.map(record=>[productionLogicalTargetKey(record.target),record]));
  const findings:ProductionProtectionFinding[]=[];
  for(const target of targets){
    if(targetLocked(project,target)){
      findings.push(finding(target,"block","EDIT_TARGET_LOCKED","The target is inside an explicitly locked Track and cannot be changed by autonomous execution."));
      continue;
    }

    const record=recordByKey.get(productionLogicalTargetKey(target));
    if(record?.state==="protected"){
      findings.push(finding(target,"block","EDIT_TARGET_PROTECTED","The target is explicitly preserved and cannot be overwritten until protection is removed."));
      continue;
    }

    const exists=targetExists(project,target);
    if((target.action==="modify"||target.action==="remove")&&!exists){
      findings.push(finding(target,"block","EDIT_TARGET_MISSING","The declared target no longer exists in current Project truth."));
      continue;
    }
    if(target.action==="create"&&exists){
      findings.push(finding(target,"review","EDIT_CREATE_COLLISION","The create target already exists and requires review before any overwrite-like behavior."));
      continue;
    }
    if(target.action==="append"&&!exists){
      findings.push(finding(target,"block","EDIT_APPEND_TARGET_MISSING","The collection target for this append operation no longer exists."));
      continue;
    }

    if(record?.state==="human-modified"){
      findings.push(finding(target,"review","EDIT_TARGET_HUMAN_MODIFIED","The target contains a recorded human modification and requires explicit review before overwrite."));
      continue;
    }
    if(record?.state==="ai-owned")continue;

    if(target.action==="create"&&!exists)continue;
    if(target.action==="append"&&exists)continue;
    findings.push(finding(target,"review","EDIT_TARGET_OWNERSHIP_UNKNOWN","Existing target ownership is unknown, so autonomous overwrite requires explicit review."));
  }

  const decision=findings.reduce<"allow"|"review"|"block">((current,item)=>decisionRank[item.decision]>decisionRank[current]?item.decision:current,"allow");
  return ProductionProtectionAssessmentSchema.parse({decision,findings});
};
