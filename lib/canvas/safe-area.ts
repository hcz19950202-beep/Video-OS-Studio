export type SafeAreaInsets={top:number;right:number;bottom:number;left:number};
export type SafeAreaProfileId="generic"|"youtube"|"tiktok"|"instagram-reels"|"instagram-feed"|"facebook"|"custom";
export type SafeAreaProfile={id:SafeAreaProfileId;label:string;insets:SafeAreaInsets};

const clamp=(value:number)=>Math.max(0,Math.min(.45,Number.isFinite(value)?value:0));
export const normalizeSafeArea=(value:SafeAreaInsets):SafeAreaInsets=>({top:clamp(value.top),right:clamp(value.right),bottom:clamp(value.bottom),left:clamp(value.left)});

export const SAFE_AREA_PROFILES:ReadonlyArray<SafeAreaProfile>=[
  {id:"generic",label:"Generic",insets:{top:.05,right:.05,bottom:.05,left:.05}},
  {id:"youtube",label:"YouTube",insets:{top:.05,right:.05,bottom:.1,left:.05}},
  {id:"tiktok",label:"TikTok",insets:{top:.08,right:.14,bottom:.18,left:.08}},
  {id:"instagram-reels",label:"Instagram Reels",insets:{top:.08,right:.09,bottom:.16,left:.09}},
  {id:"instagram-feed",label:"Instagram Feed",insets:{top:.06,right:.06,bottom:.08,left:.06}},
  {id:"facebook",label:"Facebook",insets:{top:.06,right:.08,bottom:.1,left:.08}},
  {id:"custom",label:"Custom",insets:{top:.05,right:.05,bottom:.05,left:.05}},
] as const;

export const DEFAULT_SAFE_AREA_PROFILE:SafeAreaProfile={...SAFE_AREA_PROFILES[0],insets:{...SAFE_AREA_PROFILES[0].insets}};

export const safeAreaProfileById=(id:SafeAreaProfileId,custom?:SafeAreaInsets):SafeAreaProfile=>{
  const base=SAFE_AREA_PROFILES.find(profile=>profile.id===id)??DEFAULT_SAFE_AREA_PROFILE;
  return{id:base.id,label:base.label,insets:normalizeSafeArea(id==="custom"&&custom?custom:base.insets)};
};

export type SafeAreaRect={x:number;y:number;width:number;height:number};
export const safeAreaRect=(width:number,height:number,insets:SafeAreaInsets):SafeAreaRect=>{
  const normalized=normalizeSafeArea(insets);
  const x=width*normalized.left;
  const y=height*normalized.top;
  return{x,y,width:Math.max(0,width*(1-normalized.left-normalized.right)),height:Math.max(0,height*(1-normalized.top-normalized.bottom))};
};

export const safeAreaCss=(insets:SafeAreaInsets)=>{
  const value=normalizeSafeArea(insets);
  return{top:`${value.top*100}%`,right:`${value.right*100}%`,bottom:`${value.bottom*100}%`,left:`${value.left*100}%`};
};
