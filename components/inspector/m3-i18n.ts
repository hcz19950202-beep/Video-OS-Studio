import type {StudioLocale} from "@/lib/i18n/studio";

const zh={
  projectInspector:"项目检查器",videoBrand:"视频品牌",generatedVideo:"成片风格",brandMode:"品牌模式",dark:"暗色",light:"亮色",custom:"自定义",primary:"主色",data:"数据色",success:"成功色",text:"文字色",background:"背景色",headingFont:"标题字体",bodyFont:"正文字体",captionFont:"字幕字体",motionSpeed:"动画速度",effectScale:"动效缩放",intensity:"动效强度",minimal:"克制",balanced:"平衡",strong:"强烈",linkedStyles:"联动样式",noLinkedStyles:"暂无联动样式，可从动效或字幕检查器创建。",
  videoInspector:"视频检查器",brollInspector:"B-roll 检查器",audioInspector:"音频检查器",media:"媒体",timing:"时间",layout:"布局",start:"起始帧",duration:"时长",fit:"适配",contain:"完整显示",cover:"铺满",volume:"音量",mute:"静音",sourceStart:"源起始帧",fadeIn:"淡入",fadeOut:"淡出",role:"角色",voice:"人声",bgm:"背景音乐",sfx:"音效",
  sceneInspector:"场景检查器",name:"名称",type:"类型",summary:"摘要",visualIntensity:"视觉强度",sceneStyle:"场景样式",inheritBrand:"继承品牌",range:"范围",segments:"段落",low:"低",medium:"中",high:"高",hook:"钩子",pain:"痛点",problem:"问题",reframe:"重构",solution:"方案",proof:"证明",process:"流程",comparison:"对比",cta:"行动号召",customScene:"自定义",
  multiSelect:"多选",clips:"个片段",commonProperties:"公共属性",motionCommon:"动效公共属性",scale:"缩放",opacity:"透明度",mixed:"混合",mixedNone:"混合 / 无",bulkHint:"一次批量编辑作为一个 Project Transaction，只增加一次 revision。",mixedTypes:"当前选中了不同类型片段。M3 只显示安全的公共属性，类型专属字段已隐藏。",
  linkedStyle:"联动样式",live:"实时联动",style:"样式",none:"无",create:"创建",styleName:"样式名称",motionStyle:"动效样式",captionStyle:"字幕样式",styleScale:"样式缩放",styleOpacity:"样式透明度",fill:"填充色",fontSize:"字号",fontWeight:"字重",lineHeight:"行高",maxWidth:"最大宽度 %",font:"字体",position:"位置",alignment:"对齐",stroke:"描边",shadow:"阴影",top:"顶部",center:"居中",bottom:"底部",left:"左",right:"右",anchor:"锚点",
  content:"内容",delete:"删除",engine:"引擎",hyperframesHelp:"HyperFrames 参数由资产定义；这里继续提供统一时间、布局和联动样式控制。",
} as const;

const en={
  projectInspector:"Project Inspector",videoBrand:"Video Brand",generatedVideo:"Generated Video",brandMode:"Brand Mode",dark:"Dark",light:"Light",custom:"Custom",primary:"Primary",data:"Data",success:"Success",text:"Text",background:"Background",headingFont:"Heading Font",bodyFont:"Body Font",captionFont:"Caption Font",motionSpeed:"Motion Speed",effectScale:"Effect Scale",intensity:"Motion Intensity",minimal:"Minimal",balanced:"Balanced",strong:"Strong",linkedStyles:"Linked Styles",noLinkedStyles:"No linked styles yet. Create one from a Motion or Caption Inspector.",
  videoInspector:"Video Inspector",brollInspector:"B-roll Inspector",audioInspector:"Audio Inspector",media:"Media",timing:"Timing",layout:"Layout",start:"Start",duration:"Duration",fit:"Fit",contain:"Contain",cover:"Cover",volume:"Volume",mute:"Mute",sourceStart:"Source Start",fadeIn:"Fade In",fadeOut:"Fade Out",role:"Role",voice:"Voice",bgm:"BGM",sfx:"SFX",
  sceneInspector:"Scene Inspector",name:"Name",type:"Type",summary:"Summary",visualIntensity:"Visual Intensity",sceneStyle:"Scene Style",inheritBrand:"Inherit Brand",range:"Range",segments:"Segments",low:"Low",medium:"Medium",high:"High",hook:"Hook",pain:"Pain",problem:"Problem",reframe:"Reframe",solution:"Solution",proof:"Proof",process:"Process",comparison:"Comparison",cta:"CTA",customScene:"Custom",
  multiSelect:"Multi Select",clips:"clips",commonProperties:"Common Properties",motionCommon:"Motion Common",scale:"Scale",opacity:"Opacity",mixed:"Mixed",mixedNone:"Mixed / None",bulkHint:"One bulk edit is committed as one Project transaction / one revision.",mixedTypes:"Mixed clip types selected. M3 only exposes safe common properties; type-specific fields remain hidden.",
  linkedStyle:"Linked Style",live:"Live",style:"Style",none:"None",create:"Create",styleName:"Style name",motionStyle:"Motion Style",captionStyle:"Caption Style",styleScale:"Style Scale",styleOpacity:"Style Opacity",fill:"Fill",fontSize:"Font Size",fontWeight:"Font Weight",lineHeight:"Line Height",maxWidth:"Max Width %",font:"Font",position:"Position",alignment:"Alignment",stroke:"Stroke",shadow:"Shadow",top:"Top",center:"Center",bottom:"Bottom",left:"Left",right:"Right",anchor:"Anchor",
  content:"Content",delete:"Delete",engine:"Engine",hyperframesHelp:"HyperFrames block parameters remain asset-defined; common timing, layout and Linked Style controls are available here.",
} satisfies Record<keyof typeof zh,string>;

export type M3LabelKey=keyof typeof zh;
export const m3Label=(locale:StudioLocale,key:M3LabelKey)=>locale==="zh-CN"?zh[key]:en[key];
