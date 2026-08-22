import {execFile} from "node:child_process";
import {mkdir,writeFile} from "node:fs/promises";
import {dirname,join} from "node:path";
import {promisify} from "node:util";
import type {RemotionRenderAdapter} from "@/adapters/contracts";
import {exportQualityCrf} from "@/lib/render/profile";

const execFileAsync=promisify(execFile);
const REMOTION_CLI_PACKAGE=process.env.REMOTION_CLI_PACKAGE||"@remotion/cli@4.0.506";

export class NodeRemotionCliAdapter implements RemotionRenderAdapter{
  constructor(private readonly cliPath=process.env.REMOTION_CLI_PATH,private readonly entryPoint=join(process.cwd(),"remotion","index.ts")){}

  async render({project,outputPath,mode,assetBaseUrl,quality="high",includeAudio=true}:Parameters<RemotionRenderAdapter["render"]>[0]){
    await mkdir(dirname(outputPath),{recursive:true});
    const propsPath=`${outputPath}.props.json`;
    const assetUrls=Object.fromEntries(project.assets.map((asset)=>[asset.id,`${assetBaseUrl}/api/projects/${encodeURIComponent(project.project.id)}/assets/${encodeURIComponent(asset.id)}`]));
    await writeFile(propsPath,JSON.stringify({project,assetUrls,renderMode:mode}),"utf8");
    const renderArgs=["render",this.entryPoint,"VideoOSMaster",outputPath,"--props",propsPath,"--width",String(project.canvas.width),"--height",String(project.canvas.height),"--fps",String(project.canvas.fps),"--duration",String(project.canvas.durationInFrames),"--overwrite","--concurrency",process.env.REMOTION_RENDER_CONCURRENCY||"2"];
    if(mode==="overlay")renderArgs.push("--image-format=png","--pixel-format=yuva420p","--codec=vp9","--muted");
    else{renderArgs.push("--codec=h264",`--crf=${exportQualityCrf(quality)}`);if(!includeAudio)renderArgs.push("--muted");}

    const launcher=this.cliPath||(process.platform==="win32"?"npx.cmd":"npx");
    const args=this.cliPath?renderArgs:["--yes","--package",REMOTION_CLI_PACKAGE,"remotion",...renderArgs];
    try{
      await execFileAsync(launcher,args,{windowsHide:true,shell:!this.cliPath&&process.platform==="win32",maxBuffer:20*1024*1024,env:process.env});
    }catch(error){
      const message=error instanceof Error?error.message:String(error);
      throw new Error(`Remotion render failed: ${message}. Verify network access for ${REMOTION_CLI_PACKAGE} or set REMOTION_CLI_PATH to a matching local CLI, then retry.`);
    }
    return{outputPath};
  }
}
