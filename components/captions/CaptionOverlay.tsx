import type {CSSProperties} from "react";
import type {Clip} from "@/schemas/clip";
import type {Project} from "@/schemas/project";
import {resolveCaptionStyle} from "@/lib/styles/resolve";

type Caption=Extract<Clip,{type:"caption"}>;
const isNumber=(token:string)=>/\d/.test(token);

const highlight=(text:string,caption:Caption,accent:string)=>{
  const terms=caption.keywords.map(k=>k.toLowerCase()).filter(Boolean);
  return text.split(/(\s+)/).map((token,index)=>{
    const clean=token.replace(/[^\p{L}\p{N}%+.-]/gu,"").toLowerCase();
    const numeric=(caption.emphasis==="numbers"||caption.emphasis==="both")&&isNumber(token);
    const keyword=(caption.emphasis==="keywords"||caption.emphasis==="both")&&terms.includes(clean);
    return <span key={`${token}-${index}`} style={numeric||keyword?{color:accent,fontWeight:950}:undefined}>{token}</span>;
  });
};

export const CaptionOverlay=({caption,project}:{caption:Caption;project:Project})=>{
  const resolved=resolveCaptionStyle(project,caption);
  const preset:CSSProperties=caption.preset==="minimal"
    ?{fontSize:44,fontWeight:700,background:"rgba(0,0,0,.28)",padding:"10px 16px"}
    :caption.preset==="bold"
      ?{fontSize:60,fontWeight:950,background:"rgba(0,0,0,.82)",padding:"18px 24px",border:`2px solid ${project.brand.colors.primary}80`}
      :{fontSize:50,fontWeight:850,background:"rgba(0,0,0,.68)",padding:"14px 20px"};
  const vertical=resolved.position==="top"?{top:"11%"}:resolved.position==="center"?{top:"50%",transform:"translateY(-50%)"}:{bottom:"11%"};
  const width=Math.max(20,Math.min(100,resolved.maxWidth??86));
  return <div style={{
    position:"absolute",left:`${(100-width)/2}%`,right:`${(100-width)/2}%`,...vertical,
    textAlign:resolved.alignment??"center",lineHeight:resolved.lineHeight??1.25,borderRadius:16,
    color:resolved.fill??project.brand.colors.text,fontFamily:resolved.fontFamily??project.brand.typography.captionFont,
    ...preset,
    ...(resolved.fontSize?{fontSize:resolved.fontSize}:{}),
    ...(resolved.fontWeight?{fontWeight:resolved.fontWeight}:{}),
    ...(resolved.background?{background:resolved.background}:{}),
    ...(resolved.stroke?{WebkitTextStroke:`1px ${resolved.stroke}`}:{}),
    ...(resolved.shadow?{textShadow:resolved.shadow}:{}),
  }}>{highlight(caption.text,caption,project.brand.colors.primary)}</div>;
};
