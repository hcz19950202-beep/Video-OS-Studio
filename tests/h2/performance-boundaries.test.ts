import {readFileSync} from "node:fs";
import {describe,expect,it,vi,beforeEach} from "vitest";
import {findActiveScriptWordId} from "@/lib/script/playback";
import {clearWaveformRequestCache,createWaveformCacheKey,loadCachedWaveform} from "@/lib/timeline/waveform-cache";

const source=(path:string)=>readFileSync(path,"utf8");

describe("H2 playback and waveform boundaries",()=>{
  beforeEach(()=>clearWaveformRequestCache());

  it("deduplicates waveform requests and invalidates on media signature changes",async()=>{
    const base={projectId:"project-1",assetId:"asset-1",points:160,relativePath:"input/a.mp4",durationInFrames:300,hasAudio:true};
    const key=createWaveformCacheKey(base);
    const loader=vi.fn(async()=>[.1,.5,.9]);

    const first=loadCachedWaveform(key,loader);
    const second=loadCachedWaveform(key,loader);
    expect(second).toBe(first);
    await expect(first).resolves.toEqual([.1,.5,.9]);
    await expect(loadCachedWaveform(key,loader)).resolves.toEqual([.1,.5,.9]);
    expect(loader).toHaveBeenCalledTimes(1);

    const changed=createWaveformCacheKey({...base,relativePath:"input/b.mp4"});
    expect(changed).not.toBe(key);
    await loadCachedWaveform(changed,loader);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("finds the active transcript word with a sorted range lookup",()=>{
    const ranges=[
      {id:"w1",startFrame:0,endFrame:10},
      {id:"w2",startFrame:10,endFrame:22},
      {id:"w3",startFrame:30,endFrame:40},
    ];
    expect(findActiveScriptWordId(ranges,null)).toBeNull();
    expect(findActiveScriptWordId(ranges,0)).toBe("w1");
    expect(findActiveScriptWordId(ranges,15)).toBe("w2");
    expect(findActiveScriptWordId(ranges,25)).toBeNull();
    expect(findActiveScriptWordId(ranges,39)).toBe("w3");
    expect(findActiveScriptWordId(ranges,40)).toBeNull();
  });

  it("keeps frame subscriptions out of heavy Timeline and Script roots",()=>{
    const timeline=source("components/timeline/TimelineV2.tsx");
    const playhead=source("components/timeline/TimelinePlayhead.tsx");
    const script=source("components/script/ScriptEditor.tsx");
    const scriptBridge=source("components/script/ScriptPlaybackBridge.tsx");
    const waveform=source("components/timeline/WaveformBars.tsx");

    const directFrameSubscription=/usePlayerStore\(\s*(?:state|s)\s*=>\s*(?:state|s)\.currentFrame/;
    expect(timeline).not.toMatch(directFrameSubscription);
    expect(playhead).toMatch(directFrameSubscription);
    expect(script).not.toMatch(directFrameSubscription);
    expect(scriptBridge).toContain("usePlayerStore.subscribe");
    expect(waveform).toContain("loadCachedWaveform");
    expect(waveform).not.toContain("[asset,clip.assetId,project.project.id]");
  });
});
