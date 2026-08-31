export type WorkspacePreset="edit"|"ai"|"script"|"motion";

export type WorkspaceLayout={
  version:1;
  preset:WorkspacePreset;
  leftWidth:number;
  inspectorWidth:number;
  timelineHeight:number;
  leftCollapsed:boolean;
  inspectorCollapsed:boolean;
  timelineCollapsed:boolean;
};

export const WORKSPACE_LIMITS={
  railWidth:48,
  leftMin:240,
  leftMax:480,
  inspectorMin:280,
  inspectorMax:460,
  timelineMin:220,
  timelineMax:720,
  viewerMin:320,
} as const;

export const WORKSPACE_PRESETS:Record<WorkspacePreset,WorkspaceLayout>={
  edit:{version:1,preset:"edit",leftWidth:340,inspectorWidth:340,timelineHeight:300,leftCollapsed:false,inspectorCollapsed:false,timelineCollapsed:false},
  ai:{version:1,preset:"ai",leftWidth:400,inspectorWidth:320,timelineHeight:300,leftCollapsed:false,inspectorCollapsed:false,timelineCollapsed:false},
  script:{version:1,preset:"script",leftWidth:440,inspectorWidth:320,timelineHeight:240,leftCollapsed:false,inspectorCollapsed:false,timelineCollapsed:false},
  motion:{version:1,preset:"motion",leftWidth:340,inspectorWidth:380,timelineHeight:360,leftCollapsed:false,inspectorCollapsed:false,timelineCollapsed:false},
};

const clamp=(value:number,min:number,max:number,fallback:number)=>Number.isFinite(value)?Math.max(min,Math.min(max,Math.round(value))):fallback;

export const normalizeWorkspaceLayout=(layout:Partial<WorkspaceLayout>|null|undefined):WorkspaceLayout=>{
  const preset=layout?.preset&&layout.preset in WORKSPACE_PRESETS?layout.preset:"edit";
  const base=WORKSPACE_PRESETS[preset];
  return{
    version:1,
    preset,
    leftWidth:clamp(layout?.leftWidth??base.leftWidth,WORKSPACE_LIMITS.leftMin,WORKSPACE_LIMITS.leftMax,base.leftWidth),
    inspectorWidth:clamp(layout?.inspectorWidth??base.inspectorWidth,WORKSPACE_LIMITS.inspectorMin,WORKSPACE_LIMITS.inspectorMax,base.inspectorWidth),
    timelineHeight:clamp(layout?.timelineHeight??base.timelineHeight,WORKSPACE_LIMITS.timelineMin,WORKSPACE_LIMITS.timelineMax,base.timelineHeight),
    leftCollapsed:Boolean(layout?.leftCollapsed??base.leftCollapsed),
    inspectorCollapsed:Boolean(layout?.inspectorCollapsed??base.inspectorCollapsed),
    timelineCollapsed:Boolean(layout?.timelineCollapsed??base.timelineCollapsed),
  };
};

export const applyWorkspacePreset=(preset:WorkspacePreset)=>({...WORKSPACE_PRESETS[preset]});

export const updateWorkspaceLayout=(layout:WorkspaceLayout,patch:Partial<Omit<WorkspaceLayout,"version">>)=>normalizeWorkspaceLayout({...layout,...patch});

export const parseWorkspaceLayout=(value:string|null|undefined):WorkspaceLayout=>{
  if(!value)return applyWorkspacePreset("edit");
  try{return normalizeWorkspaceLayout(JSON.parse(value) as Partial<WorkspaceLayout>);}catch{return applyWorkspacePreset("edit");}
};

export const serializeWorkspaceLayout=(layout:WorkspaceLayout)=>JSON.stringify(normalizeWorkspaceLayout(layout));

export const availableViewerWidth=(viewportWidth:number,layout:WorkspaceLayout)=>Math.max(WORKSPACE_LIMITS.viewerMin,Math.round(viewportWidth-WORKSPACE_LIMITS.railWidth-(layout.leftCollapsed?0:layout.leftWidth)-(layout.inspectorCollapsed?0:layout.inspectorWidth)));
