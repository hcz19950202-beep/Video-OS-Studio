import type {PlayerRef} from "@remotion/player";
import {describe,expect,it,vi} from "vitest";
import {bindRemotionPlayerState} from "@/components/player/usePlayerStoreBridge";

type Listener=(event:{detail?:Record<string,unknown>})=>void;

describe("H7 Remotion player event bridge",()=>{
  it("syncs frame and playback state from events and removes listeners on cleanup",()=>{
    let frame=3;let playing=false;
    const listeners=new Map<string,Set<Listener>>();
    const addEventListener=vi.fn((type:string,listener:Listener)=>{const set=listeners.get(type)??new Set<Listener>();set.add(listener);listeners.set(type,set);});
    const removeEventListener=vi.fn((type:string,listener:Listener)=>listeners.get(type)?.delete(listener));
    const player={getCurrentFrame:()=>frame,isPlaying:()=>playing,addEventListener,removeEventListener} as unknown as PlayerRef;
    const frames:number[]=[];const states:boolean[]=[];
    const emit=(type:string,event:{detail?:Record<string,unknown>}={})=>listeners.get(type)?.forEach(listener=>listener(event));

    const cleanup=bindRemotionPlayerState(player,{setCurrentFrame:value=>frames.push(value),setPlaying:value=>states.push(value)});
    expect(frames).toEqual([3]);expect(states).toEqual([false]);

    playing=true;emit("play");
    frame=12;emit("frameupdate",{detail:{frame:12}});
    frame=20;emit("seeked",{detail:{frame:20}});
    playing=false;emit("pause");
    frame=29;emit("ended");
    expect(frames).toEqual([3,12,20,29]);expect(states).toEqual([false,true,false,false]);

    cleanup();
    emit("frameupdate",{detail:{frame:99}});
    expect(frames).toEqual([3,12,20,29]);
    expect(addEventListener).toHaveBeenCalledTimes(5);expect(removeEventListener).toHaveBeenCalledTimes(5);
  });
});
