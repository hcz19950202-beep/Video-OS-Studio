import {extname} from "node:path";

export type MediaImportKind="video"|"audio"|"image"|"subtitle";
export type MediaImportStrategy="native"|"normalize-video"|"asset-only";
export type MediaImportPlan={kind:MediaImportKind;strategy:MediaImportStrategy;extension:string;workingExtension:string;mimeType:string;};

const VIDEO_EXTENSIONS=new Set([".mp4",".mov",".m4v",".webm",".mkv",".avi"]);
const AUDIO_EXTENSIONS=new Set([".mp3",".wav",".m4a",".aac",".flac"]);
const IMAGE_EXTENSIONS=new Set([".png",".jpg",".jpeg",".webp"]);
const SUBTITLE_EXTENSIONS=new Set([".srt",".vtt"]);

const MIME_BY_EXTENSION:Record<string,string>={
  ".mp4":"video/mp4",".mov":"video/quicktime",".m4v":"video/x-m4v",".webm":"video/webm",".mkv":"video/x-matroska",".avi":"video/x-msvideo",
  ".mp3":"audio/mpeg",".wav":"audio/wav",".m4a":"audio/mp4",".aac":"audio/aac",".flac":"audio/flac",
  ".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",
  ".srt":"application/x-subrip",".vtt":"text/vtt",
};

export const SUPPORTED_MEDIA_EXTENSIONS=[...VIDEO_EXTENSIONS,...AUDIO_EXTENSIONS,...IMAGE_EXTENSIONS,...SUBTITLE_EXTENSIONS] as const;

export const planMediaImport=(fileName:string,mimeType?:string):MediaImportPlan=>{
  const extension=extname(fileName).toLowerCase();
  const resolvedMime=mimeType||MIME_BY_EXTENSION[extension]||"application/octet-stream";
  if(SUBTITLE_EXTENSIONS.has(extension))return{kind:"subtitle",strategy:"native",extension,workingExtension:extension,mimeType:resolvedMime};
  if(VIDEO_EXTENSIONS.has(extension))return{kind:"video",strategy:extension===".mp4"?"native":"normalize-video",extension,workingExtension:".mp4",mimeType:resolvedMime};
  if(AUDIO_EXTENSIONS.has(extension))return{kind:"audio",strategy:"asset-only",extension,workingExtension:extension,mimeType:resolvedMime};
  if(IMAGE_EXTENSIONS.has(extension))return{kind:"image",strategy:"asset-only",extension,workingExtension:extension,mimeType:resolvedMime};
  throw new Error(`Unsupported media extension ${extension||"(none)"}. Supported: ${SUPPORTED_MEDIA_EXTENSIONS.join(", ")}.`);
};

export const acceptsMediaFile=(fileName:string)=>{try{planMediaImport(fileName);return true;}catch{return false;}};
