import type {StudioLocale} from "@/lib/i18n/studio";
import type {WorkflowRunStatus,WorkflowStageStatus} from "@/lib/workflows/schema";

const zh={
  composer:"智能编排",
  workflow:"自动工作流",
  title:"Generate First Draft",
  subtitle:"从已导入的视频开始，自动完成转写、场景、字幕、视觉规划、装配与最终渲染。",
  scenario:"视频类型",
  source:"源视频",
  noVideo:"请先导入至少一条视频素材。",
  generate:"生成第一版",
  generating:"正在启动…",
  noRun:"这个项目还没有自动工作流。",
  stages:"生产阶段",
  currentJob:"当前 Job",
  reviewContent:"内容与视觉方案待审核",
  reviewAssembly:"成片结构待审核",
  reviewHint:"你可以先在编辑器中修改 Project。继续时会读取最新 revision，不会覆盖你的手工编辑。",
  approve:"确认并继续",
  replay:"从这里重新计算",
  retry:"重试失败阶段",
  pause:"暂停后续阶段",
  resume:"继续工作流",
  cancel:"取消工作流",
  refresh:"刷新",
  activity:"执行记录",
  final:"最终成片",
  openEditor:"继续手工编辑",
  projectUpdated:"Workflow 已更新 Project，编辑器已同步到最新版本。",
  cancelled:"Workflow 已取消；Project 保留，可继续手工编辑。",
  terminal:"Workflow 已结束。",
  attempt:"尝试",
  jobs:"Jobs",
  revision:"Project revision",
  waiting:"等待审核",
  selectReplay:"选择一个已执行阶段重新计算；它的下游结果会失效并重新生成。",
} as const;

type WorkflowMessageKey=keyof typeof zh;
const en:Record<WorkflowMessageKey,string>={
  composer:"Composer",
  workflow:"Workflow",
  title:"Generate First Draft",
  subtitle:"Start from imported video and automatically run transcript, scenes, captions, visual planning, assembly, review and final render.",
  scenario:"Video type",
  source:"Source video",
  noVideo:"Import at least one video asset first.",
  generate:"Generate First Draft",
  generating:"Starting…",
  noRun:"This project has no production workflow yet.",
  stages:"Production Stages",
  currentJob:"Current Job",
  reviewContent:"Content & visual plan review",
  reviewAssembly:"Assembly review",
  reviewHint:"You can edit the Project before continuing. Approval reloads the latest revision and will not overwrite your manual edits.",
  approve:"Approve & Continue",
  replay:"Recalculate From Here",
  retry:"Retry Failed Stage",
  pause:"Pause New Stages",
  resume:"Resume Workflow",
  cancel:"Cancel Workflow",
  refresh:"Refresh",
  activity:"Activity",
  final:"Final Render",
  openEditor:"Continue Manual Editing",
  projectUpdated:"Workflow changed the Project; the editor was refreshed to the latest revision.",
  cancelled:"Workflow cancelled. The Project is preserved for manual editing.",
  terminal:"Workflow finished.",
  attempt:"Attempt",
  jobs:"Jobs",
  revision:"Project revision",
  waiting:"Waiting for review",
  selectReplay:"Recalculate a completed stage and invalidate only its downstream results.",
};

export const workflowMessages=(locale:StudioLocale)=>locale==="zh-CN"?zh:en;

export const workflowRunStatusLabel=(locale:StudioLocale,status:WorkflowRunStatus)=>{
  const labels:Record<WorkflowRunStatus,[string,string]>={
    pending:["待启动","Pending"],running:["执行中","Running"],waiting_review:["等待审核","Waiting review"],paused:["已暂停","Paused"],completed:["已完成","Completed"],failed:["失败","Failed"],cancelled:["已取消","Cancelled"],interrupted:["已中断","Interrupted"],
  };
  return labels[status][locale==="zh-CN"?0:1];
};

export const workflowStageStatusLabel=(locale:StudioLocale,status:WorkflowStageStatus)=>{
  const labels:Record<WorkflowStageStatus,[string,string]>={
    pending:["待执行","Pending"],ready:["已就绪","Ready"],running:["执行中","Running"],waiting_review:["等待审核","Waiting review"],completed:["完成","Completed"],failed:["失败","Failed"],cancelled:["取消","Cancelled"],interrupted:["中断","Interrupted"],skipped:["跳过","Skipped"],invalidated:["需重算","Invalidated"],
  };
  return labels[status][locale==="zh-CN"?0:1];
};

const stageLabels:Record<string,[string,string]>={
  MEDIA_IMPORT:["媒体接入","Import"],MEDIA_PROBE:["媒体探测","Probe"],MEDIA_NORMALIZE:["媒体标准化","Normalize"],TRANSCRIBE:["语音转写","Transcribe"],SCRIPT_ANALYSIS:["脚本分析","Script Analysis"],SCENE_DETECTION:["场景识别","Scene Detection"],CAPTION_GENERATION:["字幕生成","Captions"],VISUAL_PLANNING:["视觉规划","Visual Plan"],CONTENT_REVIEW:["内容审核","Content Review"],MOTION_GENERATION:["动效生成","Motion"],BROLL_ASSEMBLY:["B-roll 装配","B-roll"],AUDIO_ASSEMBLY:["音频装配","Audio"],TIMELINE_ASSEMBLY:["时间轴装配","Timeline"],PREVIEW:["预览检查","Preview"],ASSEMBLY_REVIEW:["成片审核","Assembly Review"],FINAL_RENDER:["最终渲染","Final Render"],
};
export const workflowStageLabel=(locale:StudioLocale,stageId:string)=>stageLabels[stageId]?.[locale==="zh-CN"?0:1]??stageId;
