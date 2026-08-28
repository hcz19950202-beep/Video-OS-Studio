import type {ProductionMission} from "@/lib/production/mission/schema";
import {QAFindingSchema,type QAFinding,type QAExpectations} from "@/lib/production/qa/schema";
import type {Project} from "@/schemas/project";

const normalized=(value:string)=>value.toLocaleLowerCase();
const containsAny=(haystack:string,terms:string[])=>terms.some(term=>normalized(haystack).includes(normalized(term)));
const finding=(input:QAFinding)=>QAFindingSchema.parse(input);
const evidence=(source:QAFinding["evidence"][number]["source"],summary:string,ref?:string)=>({source,summary,...(ref?{ref}:{})});
const activeSegments=(project:Project)=>project.script.segments.filter(segment=>segment.status!=="removed");

const activeScriptText=(project:Project)=>activeSegments(project).flatMap(segment=>segment.words).map(word=>word.text).join(" ");
const allCaptionText=(project:Project)=>project.tracks.flatMap(track=>track.clips).filter(clip=>clip.enabled&&clip.type==="caption").map(clip=>clip.text).join(" ");
const hookWindowText=(project:Project,seconds:number)=>{
  const endFrame=Math.max(1,Math.round(seconds*project.canvas.fps));
  const script=activeSegments(project).flatMap(segment=>segment.words).filter(word=>word.startFrame<endFrame).map(word=>word.text);
  const captions=project.tracks.flatMap(track=>track.clips).filter(clip=>clip.enabled&&clip.type==="caption"&&clip.startFrame<endFrame).map(clip=>clip.text);
  return [...script,...captions].join(" ");
};

const sceneCoverageRatio=(project:Project)=>{
  const duration=project.canvas.durationInFrames;
  if(duration<=0)return 0;
  const intervals=project.scenes.map(scene=>[Math.max(0,scene.startFrame),Math.min(duration,scene.endFrame)] as const).filter(([start,end])=>end>start).sort((a,b)=>a[0]-b[0]);
  if(intervals.length===0)return 0;
  let covered=0;
  let start=intervals[0][0];
  let end=intervals[0][1];
  for(const[nextStart,nextEnd]of intervals.slice(1)){
    if(nextStart<=end){end=Math.max(end,nextEnd);continue;}
    covered+=end-start;start=nextStart;end=nextEnd;
  }
  covered+=end-start;
  return Math.min(1,covered/duration);
};

export const evaluateProjectSemanticQA=(project:Project,mission:ProductionMission,expectations:QAExpectations):QAFinding[]=>{
  const findings:QAFinding[]=[];
  const scriptText=activeScriptText(project);
  const captionText=allCaptionText(project);
  const combined=`${scriptText} ${captionText}`.trim();
  const early=hookWindowText(project,expectations.hookWindowSeconds);
  const hookScene=project.scenes.some(scene=>scene.semanticType==="hook");
  const ctaScene=project.scenes.some(scene=>scene.semanticType==="cta");
  const proofScene=project.scenes.some(scene=>scene.semanticType==="proof");

  const hookPass=expectations.hookTerms.length>0?containsAny(early,expectations.hookTerms):hookScene;
  findings.push(finding({id:"content-hook",category:"content",status:hookPass?"pass":"fail",severity:hookPass?"info":"warning",message:hookPass?"The intended hook is represented in approved Project semantic evidence.":"The intended hook is not represented in the configured hook window or Scene semantics.",evidence:[evidence("project-script","Hook evaluation uses approved Script/Caption text and Scene semantics; it is not rendered-frame recognition."),evidence("mission","Mission context used for intended content checks.",mission.id)]}));

  const ctaPass=expectations.ctaTerms.length>0?containsAny(combined,expectations.ctaTerms):ctaScene;
  findings.push(finding({id:"content-cta",category:"content",status:ctaPass?"pass":"fail",severity:ctaPass?"info":"warning",message:ctaPass?"A CTA is represented in approved Project semantic evidence.":"No CTA is represented by the configured terms or CTA Scene semantics.",evidence:[evidence("project-timeline","CTA evaluation uses Project Script/Caption/Scene semantics; it is not rendered-frame recognition.")]}));

  const evidencePass=expectations.evidenceTerms.length>0?containsAny(combined,expectations.evidenceTerms):proofScene;
  findings.push(finding({id:"content-evidence",category:"content",status:evidencePass?"pass":"fail",severity:evidencePass?"info":"warning",message:evidencePass?"Evidence use is represented in approved Project semantic evidence.":"No configured evidence term or proof Scene is represented in Project semantics.",evidence:[evidence("project-timeline","Evidence evaluation is semantic Project evidence, not visual recognition of the final render.")]}));

  if(expectations.expectCaptions===undefined){
    findings.push(finding({id:"visual-captions",category:"visual",status:"not-evaluated",severity:"info",message:"Caption presence was not evaluated because no caption expectation was supplied.",evidence:[]}));
  }else{
    const captionCount=project.tracks.flatMap(track=>track.clips).filter(clip=>clip.enabled&&clip.type==="caption").length;
    const pass=expectations.expectCaptions?captionCount>0:captionCount===0;
    findings.push(finding({id:"visual-captions",category:"visual",status:pass?"pass":"fail",severity:pass?"info":"warning",message:pass?"Project Timeline caption presence matches the configured expectation.":"Project Timeline caption presence does not match the configured expectation.",evidence:[evidence("project-timeline",`Timeline contains ${captionCount} enabled caption clip${captionCount===1?"":"s"}; this does not prove rendered caption legibility.`)]}));
  }

  const minimum=expectations.sceneCoverageMinRatio??0.8;
  const coverage=sceneCoverageRatio(project);
  const coveragePass=coverage>=minimum;
  findings.push(finding({id:"visual-scene-coverage",category:"visual",status:coveragePass?"pass":"fail",severity:coveragePass?"info":"warning",message:coveragePass?"Project Scene ranges meet the configured coverage threshold.":"Project Scene ranges do not meet the configured coverage threshold.",evidence:[evidence("project-timeline",`Scene ranges cover ${(coverage*100).toFixed(1)}% of Project duration; threshold is ${(minimum*100).toFixed(1)}%.`)]}));

  findings.push(finding({id:"brand-render-compliance",category:"brand",status:"not-evaluated",severity:"info",message:"Rendered brand compliance is not inferred from Project configuration alone.",evidence:[evidence("project-brand","Brand configuration is available, but B4 does not claim frame-level brand recognition.")]}));

  if(mission.target.targetDurationSeconds!==undefined){
    findings.push(finding({id:"goal-duration-target",category:"goal",status:"not-evaluated",severity:"info",message:"Mission duration target requires ffprobe output evidence and is evaluated by the technical QA service.",evidence:[evidence("mission",`Mission target duration is ${mission.target.targetDurationSeconds} seconds.`,mission.id)]}));
  }

  for(const[id,message]of [
    ["policy-prompt-injection","Prompt-injection resistance requires application execution-audit evidence and is not inferred from Project content."],
    ["policy-shell-network","Unexpected shell/network behavior requires application execution-audit evidence and is not inferred from absence of errors."],
    ["policy-escalation","Approval/escalation compliance requires application execution-audit evidence and is not inferred without an audit trail."],
  ] as const){
    findings.push(finding({id,category:"policy",status:"not-evaluated",severity:"info",message,evidence:[evidence("application-policy","No B4 execution-audit record was supplied; policy status remains explicitly not evaluated.")]}));
  }

  return findings;
};

export const qaReportStatusFor=(findings:QAFinding[])=>{
  const failed=findings.filter(item=>item.status==="fail");
  if(failed.some(item=>item.category==="technical"&&item.severity==="error"))return"fail" as const;
  if(failed.length>0)return"repair-recommended" as const;
  return"pass" as const;
};
