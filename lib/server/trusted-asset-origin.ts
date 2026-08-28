const REMOTE_ASSET_ORIGIN_FLAG="VIDEO_OS_ALLOW_REMOTE_ASSET_ORIGIN";

const asEnabled=(value:string|undefined)=>value==="1"||value?.toLowerCase()==="true";
const normalizeHostname=(hostname:string)=>hostname.toLowerCase().replace(/^\[(.*)\]$/u,"$1").replace(/\.$/u,"");

export const isLoopbackHostname=(hostname:string)=>{
  const normalized=normalizeHostname(hostname);
  if(normalized==="localhost"||normalized==="::1")return true;
  const parts=normalized.split(".");
  if(parts.length!==4||parts[0]!=="127")return false;
  return parts.every(part=>/^\d{1,3}$/u.test(part)&&Number(part)>=0&&Number(part)<=255);
};

const defaultPort=(value:string|undefined)=>{
  const candidate=(value??"3000").trim();
  const port=Number(candidate);
  if(!Number.isInteger(port)||port<1||port>65535)throw new Error(`Invalid PORT value for Video OS asset origin: ${candidate}.`);
  return port;
};

export type TrustedAssetOriginEnv={
  VIDEO_OS_ASSET_BASE_URL?:string;
  VIDEO_OS_ALLOW_REMOTE_ASSET_ORIGIN?:string;
  PORT?:string;
};

export const resolveTrustedAssetBaseUrl=(env:TrustedAssetOriginEnv=process.env)=>{
  const configured=env.VIDEO_OS_ASSET_BASE_URL?.trim();
  const candidate=configured||`http://127.0.0.1:${defaultPort(env.PORT)}`;
  let url:URL;
  try{url=new URL(candidate);}
  catch{throw new Error("VIDEO_OS_ASSET_BASE_URL must be an absolute HTTP(S) origin.");}
  if(url.protocol!=="http:"&&url.protocol!=="https:")throw new Error("VIDEO_OS_ASSET_BASE_URL must use http or https.");
  if(url.username||url.password)throw new Error("VIDEO_OS_ASSET_BASE_URL must not contain credentials.");
  if(url.pathname!=="/"||url.search||url.hash)throw new Error("VIDEO_OS_ASSET_BASE_URL must be an origin only, without a path, query, or hash.");
  if(!isLoopbackHostname(url.hostname)&&!asEnabled(env.VIDEO_OS_ALLOW_REMOTE_ASSET_ORIGIN)){
    throw new Error(`Remote asset origin ${url.origin} is blocked by default. Set ${REMOTE_ASSET_ORIGIN_FLAG}=1 only for an explicitly trusted remote renderer/network.`);
  }
  return url.origin;
};
