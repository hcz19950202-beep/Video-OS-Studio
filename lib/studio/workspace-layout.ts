export type StudioWorkspacePreset="edit"|"ai"|"script"|"motion";

export type StudioWorkspaceLayout={
  preset:StudioWorkspacePreset;
  leftPanelWidth:number;
  inspectorWidth:number;
  timelineHeight:number;
  leftCollapsed:boolean;
  inspectorCollapsed:boolean;
  timelineCollapsed:boolean;
};

export const STUDIO_LAYOUT_LIMITS={
  left:{min:240,max:460},
  inspector:{min:280,max:440},
  timeline:{min:220,max:520},
} as const;

export const WORKSPACE_DEFAULTS:Record<StudioWorkspacePreset,StudioWorkspaceLayout>={
  edit:{preset:"edit",leftPanelWidth:300,inspectorWidth:320,timelineHeight:300,leftCollapsed:false,inspectorCollapsed:false,timelineCollapsed:false},
  ai:{preset:"ai",leftPanelWidth:390,inspectorWidth:320,timelineHeight:300,leftCollapsed:false,inspectorCollapsed:true,timelineCollapsed:false},
  script:{preset:"script",leftPanelWidth:460,inspectorWidth:320,timelineHeight:220,leftCollapsed:false,inspectorCollapsed:true,timelineCollapsed:false},
  motion:{preset:"motion",leftPanelWidth:320,inspectorWidth:360,timelineHeight:360,leftCollapsed:false,inspectorCollapsed:false,timelineCollapsed:false},
};

const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));

export const normalizeWorkspaceLayout=(value:Partial<StudioWorkspaceLayout>|null|undefined):StudioWorkspaceLayout=>{
  const preset=value?.preset&&value.preset in WORKSPACE_DEFAULTS?value.preset:"edit";
  const fallback=WORKSPACE_DEFAULTS[preset];
  return{
    preset,
    leftPanelWidth:clamp(Number(value?.leftPanelWidth??fallback.leftPanelWidth),STUDIO_LAYOUT_LIMITS.left.min,STUDIO_LAYOUT_LIMITS.left.max),
    inspectorWidth:clamp(Number(value?.inspectorWidth??fallback.inspectorWidth),STUDIO_LAYOUT_LIMITS.inspector.min,STUDIO_LAYOUT_LIMITS.inspector.max),
    timelineHeight:clamp(Number(value?.timelineHeight??fallback.timelineHeight),STUDIO_LAYOUT_LIMITS.timeline.min,STUDIO_LAYOUT_LIMITS.timeline.max),
    leftCollapsed:Boolean(value?.leftCollapsed??fallback.leftCollapsed),
    inspectorCollapsed:Boolean(value?.inspectorCollapsed??fallback.inspectorCollapsed),
    timelineCollapsed:Boolean(value?.timelineCollapsed??fallback.timelineCollapsed),
  };
};

export const workspacePresetLayout=(preset:StudioWorkspacePreset)=>({...WORKSPACE_DEFAULTS[preset]});

export const patchWorkspaceLayout=(layout:StudioWorkspaceLayout,patch:Partial<StudioWorkspaceLayout>)=>normalizeWorkspaceLayout({...layout,...patch,preset:patch.preset??layout.preset});
