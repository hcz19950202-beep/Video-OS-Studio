import {access,mkdtemp,rm} from "node:fs/promises";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {afterEach,describe,expect,it} from "vitest";
import {NodeHyperFramesAdapter} from "@/adapters/hyperframes";
import {NodeRemotionCliAdapter} from "@/adapters/remotion-cli";
import type {ToolRunInput,ToolRunResult,ToolRunner} from "@/lib/process/tool-runner";
import {createProject} from "@/lib/project/factory";

const roots:string[]=[];
afterEach(async()=>{await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));});
const makeRoot=async()=>{const root=await mkdtemp(join(tmpdir(),"video-os-h0-render-cleanup-"));roots.push(root);return root;};
const exists=async(path:string)=>{try{await access(path);return true;}catch{return false;}};
const resultFor=(input:ToolRunInput):ToolRunResult=>({tool:input.tool,command:input.command,args:input.args,pid:123,exitCode:0,exitSignal:null,stdout:"",stdoutBytes:new Uint8Array(),stderr:"",durationMs:1});

class ProbeRunner implements ToolRunner{
  constructor(private readonly beforeResolve:(input:ToolRunInput)=>Promise<void>,private readonly fail=false){}
  async run(input:ToolRunInput){await this.beforeResolve(input);if(this.fail)throw new Error("probe failure");return resultFor(input);}
}

describe("V2.3.1 H0 render temporary cleanup",()=>{
  it.each([false,true])("removes Remotion props after %s failure state",async fail=>{
    const root=await makeRoot();
    const outputPath=join(root,"render","final.mp4");
    const propsPath=`${outputPath}.props.json`;
    const project=createProject({id:`h0-remotion-${fail?"fail":"ok"}`,name:"H0 Remotion",durationInFrames:30,width:320,height:180,fps:30});
    const runner=new ProbeRunner(async()=>{expect(await exists(propsPath)).toBe(true);},fail);
    const adapter=new NodeRemotionCliAdapter(join(process.cwd(),"remotion","index.ts"),runner);
    const operation=adapter.render({project,outputPath,mode:"final",assetBaseUrl:"http://127.0.0.1:3000",quality:"draft",includeAudio:false});
    if(fail)await expect(operation).rejects.toThrow("probe failure");else await expect(operation).resolves.toEqual({outputPath});
    expect(await exists(propsPath)).toBe(false);
  });

  it.each([false,true])("removes HyperFrames workdir after %s failure state",async fail=>{
    const root=await makeRoot();
    const outputPath=join(root,"render","motion.webm");
    const workDir=`${outputPath}.hf-work`;
    const runner=new ProbeRunner(async input=>{expect(input.cwd).toBe(workDir);expect(await exists(join(workDir,"index.html"))).toBe(true);expect(await exists(join(workDir,"DESIGN.md"))).toBe(true);},fail);
    const adapter=new NodeHyperFramesAdapter(runner);
    const operation=adapter.render({effectId:"process-flow",props:{title:"H0"},width:320,height:180,durationInFrames:30,fps:30,outputPath});
    if(fail)await expect(operation).rejects.toThrow("probe failure");else await expect(operation).resolves.toEqual({outputPath});
    expect(await exists(workDir)).toBe(false);
  });
});
