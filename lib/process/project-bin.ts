import {access} from "node:fs/promises";
import {join} from "node:path";

export const projectBinPath=(name:string,platform:NodeJS.Platform=process.platform,root=process.cwd())=>join(root,"node_modules",".bin",platform==="win32"?`${name}.cmd`:name);

export const requireProjectBin=async(name:string,override?:string)=>{
  const path=override?.trim()||projectBinPath(name);
  try{await access(path);}
  catch{throw new Error(`${name} CLI is not installed at ${path}. Run npm ci with the H2 pinned dependencies or set the explicit CLI path override.`);}
  return path;
};
