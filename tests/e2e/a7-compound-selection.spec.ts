import {expect,test,type Page} from "@playwright/test";
import type {ProjectCommand} from "@/lib/project/commands";
import type {Project} from "@/schemas/project";

const readProject=async(page:Page,projectId:string):Promise<Project>=>page.evaluate(async id=>{
  const response=await fetch(`/api/projects/${encodeURIComponent(id)}`,{cache:"no-store"});
  if(!response.ok)throw new Error(`Project read failed: ${response.status}`);
  return(await response.json()).project;
},projectId);

const applyCommand=async(page:Page,projectId:string,commandId:string,command:ProjectCommand):Promise<Project>=>{
  const current=await readProject(page,projectId);
  return page.evaluate(async({id,expectedRevision,operationId,payload})=>{
    const response=await fetch(`/api/projects/${encodeURIComponent(id)}/commands`,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({expectedRevision,commandId:operationId,command:payload}),
    });
    const result=await response.json();
    if(!response.ok)throw new Error(result.message||result.error||`Command failed: ${response.status}`);
    return result.project;
  },{id:projectId,expectedRevision:current.project.revision,operationId:commandId,payload:command});
};

const openAgent=async(page:Page)=>{
  await page.getByTitle("AI").click();
  await page.getByRole("tab",{name:"Agent",exact:true}).click();
  await expect(page.locator(".a4-agent-context")).toBeVisible();
};

test("A7 normal Studio path retains Scene + Caption compound Agent context",async({page})=>{
  await page.setViewportSize({width:1600,height:1000});
  await page.addInitScript(()=>{
    localStorage.setItem("video-os-studio-locale","en-US");
    localStorage.setItem("video-os-studio-theme","dark");
  });

  const projectName=`A7 Compound Selection ${Date.now()}`;
  const hookSceneId="a7-selection-hook";
  const proofSceneId="a7-selection-proof";
  const captionId="a7-selection-caption";

  await page.goto("/");
  await page.getByTitle("Project").click();
  await page.getByLabel("Project name").fill(projectName);
  const createResponse=page.waitForResponse(response=>response.request().method()==="POST"&&response.url().endsWith("/api/projects"));
  await page.getByRole("button",{name:"Create Project",exact:true}).click();
  const created=await createResponse;
  expect(created.status()).toBe(201);
  const createdBody=(await created.json()) as {project:Project};
  const projectId=createdBody.project.project.id;
  const duration=createdBody.project.canvas.durationInFrames;
  const split=Math.max(120,Math.floor(duration/2));

  await applyCommand(page,projectId,"a7-selection-scene-hook",{
    type:"add-scene",
    scene:{id:hookSceneId,name:"Hook",semanticType:"hook",startFrame:0,endFrame:split,visualStrategy:{intensity:"medium",preferredEngines:["remotion"]}},
  });
  await applyCommand(page,projectId,"a7-selection-scene-proof",{
    type:"add-scene",
    scene:{id:proofSceneId,name:"Proof",semanticType:"proof",startFrame:split,endFrame:duration,visualStrategy:{intensity:"medium",preferredEngines:["remotion"]}},
  });
  await applyCommand(page,projectId,"a7-selection-caption",{
    type:"add-clip",
    trackId:"captions-main",
    clip:{id:captionId,type:"caption",text:"90% complete in 15 days",startFrame:30,durationInFrames:60,enabled:true,layer:100,preset:"primary",emphasis:"numbers",keywords:[]},
  });

  await page.reload();
  await page.getByTitle("Project").click();
  const recent=page.locator(".os-recent-list button").filter({hasText:projectName}).first();
  await expect(recent).toBeVisible();
  await recent.click();
  await expect(page.locator(".v21-project-title")).toContainText(projectName);

  const hookScene=page.locator(".timeline-scene").filter({hasText:"Hook"}).first();
  const proofScene=page.locator(".timeline-scene").filter({hasText:"Proof"}).first();
  const caption=page.locator(`[data-clip-id="${captionId}"]`);
  await expect(hookScene).toBeVisible();
  await expect(proofScene).toBeVisible();
  await expect(caption).toBeVisible();

  await hookScene.click();
  await caption.click();
  await openAgent(page);
  const context=page.locator(".a4-agent-context");
  await expect(context).toContainText(`@Scene · ${hookSceneId}`);
  await expect(context).toContainText(`@Clip · ${captionId}`);

  await proofScene.click();
  await expect(context).toContainText(`@Scene · ${proofSceneId}`);
  await expect(context).not.toContainText(`@Clip · ${captionId}`);

  await hookScene.click();
  await caption.click();
  await expect(context).toContainText(`@Scene · ${hookSceneId}`);
  await expect(context).toContainText(`@Clip · ${captionId}`);
});
