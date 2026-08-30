import {chmod,mkdir,mkdtemp,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {dirname,join} from "node:path";
import {afterEach,describe,expect,it} from "vitest";
import {NodeHyperFramesAdapter} from "@/adapters/hyperframes";
import {NodeRemotionCliAdapter} from "@/adapters/remotion-cli";
import {ToolRunError,type ToolRunInput,type ToolRunner} from "@/lib/process/tool-runner";
import {ProjectSchema} from "@/schemas/project";

const roots:string[]=[];
afterEach(async()=>{await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));});

const operationalError=(input:ToolRunInput,label:string)=>new ToolRunError(`${label} failed.`,input.tool,input.command,input.args,123,1,null,"",`${label} operational failure`);

const project=()=>ProjectSchema.parse({
  version:"2.0.0",
  project:{id:"final-audit-render-cleanup",name:"Final audit render cleanup",revision:0,createdAt:"2026-08-31T00:00:00.000Z",updatedAt:"2026-08-31T00:00:00.000Z"},
  canvas:{width:640,height:360,fps:30,durationInFrames:90},
});

describe("V2.4 final audit render cleanup error preservation",()=>{
  it("preserves the Remotion render failure when props cleanup also fails",async()=>{
    const root=await mkdtemp(join(tmpdir(),"video-os-final-audit-remotion-cleanup-"));
    roots.push(root);
    const outputPath=join(root,"render","final.mp4");
    let renderError:ToolRunError|undefined;
    const runner:ToolRunner={run:async input=>{
      renderError=operationalError(input,"remotion render");
      const propsIndex=input.args.indexOf("--props");
      const propsPath=input.args[propsIndex+1];
      if(!propsPath)throw new Error("Expected Remotion props path.");
      await rm(propsPath,{force:true});
      await mkdir(propsPath,{recursive:true});
      await writeFile(join(propsPath,"held-open.txt"),"force cleanup failure","utf8");
      throw renderError;
    }};
    const adapter=new NodeRemotionCliAdapter(join(root,"entry.ts"),runner);

    let thrown:unknown;
    try{await adapter.render({project:project(),outputPath,mode:"final",assetBaseUrl:"http://127.0.0.1:3000"});}
    catch(error){thrown=error;}

    expect(renderError).toBeDefined();
    expect(thrown).toBeInstanceOf(AggregateError);
    expect((thrown as AggregateError).errors[0]).toBe(renderError);
    expect((thrown as AggregateError).errors).toHaveLength(2);
    expect((thrown as AggregateError).message).not.toContain("held-open.txt");
  });

  it.skipIf(process.platform==="win32")("preserves the HyperFrames operational failure when work-dir cleanup also fails",async()=>{
    const root=await mkdtemp(join(tmpdir(),"video-os-final-audit-hyperframes-cleanup-"));
    roots.push(root);
    const outputPath=join(root,"render","overlay.webm");
    const outputDir=dirname(outputPath);
    let runError:ToolRunError|undefined;
    const runner:ToolRunner={run:async input=>{
      runError=operationalError(input,"hyperframes render");
      await chmod(outputDir,0o500);
      throw runError;
    }};
    const adapter=new NodeHyperFramesAdapter(runner);

    let thrown:unknown;
    try{
      await adapter.render({effectId:"process-flow",props:{title:"AUDIT",steps:["A","B"],accentColor:"#FFC400"},outputPath,width:640,height:360,fps:30,durationInFrames:60});
    }catch(error){thrown=error;}
    finally{await chmod(outputDir,0o700).catch(()=>undefined);}

    expect(runError).toBeDefined();
    expect(thrown).toBeInstanceOf(AggregateError);
    expect((thrown as AggregateError).errors[0]).toBe(runError);
    expect((thrown as AggregateError).errors).toHaveLength(2);
  });
});
