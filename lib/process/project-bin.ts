import {access,readFile} from "node:fs/promises";
import {join} from "node:path";

type PackageManifest={name?:string;version?:string;bin?:string|Record<string,string>};
export type ProjectNodeBin={packageName:string;binName:string;version:string;scriptPath:string;command:string;argsPrefix:string[]};

export const projectPackageRoot=(packageName:string,root=process.cwd())=>join(root,"node_modules",...packageName.split("/"));
export const selectPackageBin=(manifest:PackageManifest,binName:string)=>{
  if(typeof manifest.bin==="string")return manifest.bin;
  const selected=manifest.bin?.[binName];
  if(!selected)throw new Error(`Package ${manifest.name??"unknown"} does not expose the ${binName} CLI.`);
  return selected;
};

export const resolveProjectNodeBin=async(packageName:string,binName:string,expectedVersion?:string,root=process.cwd()):Promise<ProjectNodeBin>=>{
  const packageRoot=projectPackageRoot(packageName,root);
  const manifestPath=join(packageRoot,"package.json");
  let manifest:PackageManifest;
  try{manifest=JSON.parse(await readFile(manifestPath,"utf8")) as PackageManifest;}
  catch{throw new Error(`${packageName} is not installed under ${packageRoot}. Run npm ci with the H2 pinned dependencies.`);}
  if(!manifest.version)throw new Error(`${packageName} package.json does not declare a version.`);
  if(expectedVersion&&manifest.version!==expectedVersion)throw new Error(`${packageName} version mismatch: expected ${expectedVersion}, found ${manifest.version}. Run npm ci from the accepted H2 lockfile.`);
  const scriptPath=join(packageRoot,selectPackageBin(manifest,binName));
  try{await access(scriptPath);}
  catch{throw new Error(`${packageName} CLI entry is missing at ${scriptPath}. Reinstall the H2 pinned dependencies.`);}
  return{packageName,binName,version:manifest.version,scriptPath,command:process.execPath,argsPrefix:[scriptPath]};
};
