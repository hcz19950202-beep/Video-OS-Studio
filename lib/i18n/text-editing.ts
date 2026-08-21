import type {StudioLocale} from "@/lib/i18n/studio";

const messages={
  "zh-CN":{
    script:"脚本",scenes:"场景",transcribe:"先在项目工具中运行转写 + Pack，Script 会自动生成。",showRemoved:"显示已删除",hideRemoved:"隐藏已删除",remove:"删除这句",restore:"恢复这句",removed:"已删除",active:"保留",editLocked:"请先完成脚本剪辑，再添加 Scene / 字幕 / 动效 / B-roll / Audio。",words:"词",segments:"句",seek:"点击文字跳转视频",tags:"语义标签",keep:"保留",motion:"动效",broll:"B-roll",quote:"引用",cta:"CTA",sceneGenerate:"自动分 Scene",sceneEmpty:"先准备 Script，再生成 Scene。",sceneType:"类型",sceneRename:"名称",sceneMerge:"与下一 Scene 合并",sceneSplit:"从这里拆分",sceneSelect:"点击 Scene 跳转",sceneGenerated:"Scene 已生成",sceneUpdated:"Scene 已更新",sceneSplitDone:"Scene 已拆分",sceneMergeDone:"Scene 已合并",sceneCount:"场景",scriptReady:"可编辑脚本",scriptStatus:"脚本剪辑会直接重建 A-roll，删除/恢复都可逆。",noScript:"还没有 Script",sceneHint:"Scene 是语义段落，不是素材 Clip。它会同时出现在 Script 和 Timeline。"
  },
  "en-US":{
    script:"Script",scenes:"Scenes",transcribe:"Run Transcribe + Pack in Project tools first. The editable Script will be created automatically.",showRemoved:"Show Removed",hideRemoved:"Hide Removed",remove:"Remove Sentence",restore:"Restore Sentence",removed:"Removed",active:"Keep",editLocked:"Finish Script cuts before adding Scenes, Captions, Motion, B-roll or Audio.",words:"words",segments:"segments",seek:"Click text to seek video",tags:"Semantic Tags",keep:"Keep",motion:"Motion",broll:"B-roll",quote:"Quote",cta:"CTA",sceneGenerate:"Auto Scenes",sceneEmpty:"Prepare the Script before generating Scenes.",sceneType:"Type",sceneRename:"Name",sceneMerge:"Merge with Next",sceneSplit:"Split Here",sceneSelect:"Click a Scene to seek",sceneGenerated:"Scenes generated",sceneUpdated:"Scene updated",sceneSplitDone:"Scene split",sceneMergeDone:"Scenes merged",sceneCount:"scenes",scriptReady:"Editable Script",scriptStatus:"Script cuts rebuild the A-roll and remain reversible.",noScript:"No Script yet",sceneHint:"Scenes are semantic sections, not media clips. They appear in both Script and Timeline."
  }
} as const;

export type TextEditingKey=keyof typeof messages["zh-CN"];
export const textEditingMessage=(locale:StudioLocale,key:TextEditingKey)=>messages[locale][key];
