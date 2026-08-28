import {expect,test,type Page} from "@playwright/test";
import type {ProjectCommand} from "@/lib/project/commands";
import type {Project} from "@/schemas/project";

const PROJECT_NAME="H2 Playback Boundary";
const CAPTION_ID="h2-drag-caption";

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

const captionStart=async(page:Page,projectId:string)=>{
  const project=await readProject(page,projectId);
  const clip=project.tracks.flatMap(track=>track.clips).find(item=>item.id===CAPTION_ID);
  return clip?.startFrame??-1;
};

test("H2 keeps playback listeners narrow and drag commits singular",async({page})=>{
  await page.setViewportSize({width:1600,height:1000});
  await page.addInitScript(()=>{
    localStorage.setItem("video-os-studio-locale","en-US");
    localStorage.setItem("video-os-studio-theme","dark");
  });

  await page.goto("/");
  await page.getByTitle("Project").click();
  await page.getByLabel("Project name").fill(PROJECT_NAME);
  const createResponse=page.waitForResponse(response=>response.request().method()==="POST"&&response.url().endsWith("/api/projects"));
  await page.getByRole("button",{name:"Create Project",exact:true}).click();
  const created=await createResponse;
  expect(created.status()).toBe(201);
  const createdBody=(await created.json()) as {project:Project};
  const projectId=createdBody.project.project.id;

  await applyCommand(page,projectId,"h2-caption",{
    type:"add-clip",
    trackId:"captions-main",
    clip:{
      id:CAPTION_ID,
      type:"caption",
      text:"H2 drag boundary",
      startFrame:20,
      durationInFrames:80,
      enabled:true,
      layer:100,
      preset:"primary",
      emphasis:"none",
      keywords:[],
    },
  });

  await page.reload();
  await page.getByTitle("Project").click();
  const recent=page.locator(".os-recent-list button").filter({hasText:PROJECT_NAME}).first();
  await expect(recent).toBeVisible();
  await recent.click();
  await expect(page.locator(`[data-clip-id="${CAPTION_ID}"]`)).toBeVisible();

  const ruler=page.locator(".timeline-ruler");
  const playhead=ruler.locator(".timeline-playhead");
  await expect(playhead).toBeVisible();
  const beforeLeft=await playhead.evaluate(element=>getComputedStyle(element).left);
  const rulerBox=await ruler.boundingBox();
  expect(rulerBox).not.toBeNull();
  await ruler.click({position:{x:Math.min(420,Math.max(120,(rulerBox?.width??720)*.45)),y:10}});
  await expect.poll(async()=>playhead.evaluate(element=>getComputedStyle(element).left)).not.toBe(beforeLeft);

  await page.evaluate(()=>{
    (window as Window&{__h2PlaybackToggles?:number}).__h2PlaybackToggles=0;
    window.addEventListener("video-os-toggle-playback",()=>{
      const target=window as Window&{__h2PlaybackToggles?:number};
      target.__h2PlaybackToggles=(target.__h2PlaybackToggles??0)+1;
    });
  });
  const timelineActions=page.locator(".timeline-actions");
  await timelineActions.getByRole("button",{name:"+"}).click();
  await timelineActions.getByRole("button",{name:"+"}).click();
  await timelineActions.getByRole("button",{name:/Snap/}).click();
  await page.keyboard.press("Space");
  await expect.poll(()=>page.evaluate(()=>(window as Window&{__h2PlaybackToggles?:number}).__h2PlaybackToggles??0)).toBe(1);
  await page.keyboard.press("Space");
  await expect.poll(()=>page.evaluate(()=>(window as Window&{__h2PlaybackToggles?:number}).__h2PlaybackToggles??0)).toBe(2);

  let commandPosts=0;
  page.on("request",request=>{
    if(request.method()==="POST"&&request.url().endsWith(`/api/projects/${encodeURIComponent(projectId)}/commands`))commandPosts+=1;
  });
  const originalStart=await captionStart(page,projectId);
  const clip=page.locator(`[data-clip-id="${CAPTION_ID}"]`);
  const box=await clip.boundingBox();
  expect(box).not.toBeNull();
  const fromX=(box?.x??0)+Math.min(30,(box?.width??60)/3);
  const y=(box?.y??0)+(box?.height??20)/2;
  await page.mouse.move(fromX,y);
  await page.mouse.down();
  for(let step=1;step<=12;step+=1)await page.mouse.move(fromX+step*5,y);
  await page.mouse.up();

  await expect.poll(()=>captionStart(page,projectId)).not.toBe(originalStart);
  expect(commandPosts).toBe(1);
});
