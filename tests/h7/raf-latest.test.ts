import {describe,expect,it,vi} from "vitest";
import {createRafLatestQueue} from "@/lib/studio/raf-latest";

describe("H7 rAF latest-value queue",()=>{
  it("publishes only the latest gesture draft once per frame",()=>{
    let nextId=1;const callbacks=new Map<number,()=>void>();const published:number[]=[];
    const requestFrame=vi.fn((callback:()=>void)=>{const id=nextId++;callbacks.set(id,callback);return id;});
    const cancelFrame=vi.fn((id:number)=>callbacks.delete(id));
    const queue=createRafLatestQueue<number>(value=>published.push(value),requestFrame,cancelFrame);

    queue.schedule(1);queue.schedule(2);queue.schedule(3);
    expect(requestFrame).toHaveBeenCalledTimes(1);expect(published).toEqual([]);expect(queue.hasPending()).toBe(true);
    callbacks.get(1)?.();
    expect(published).toEqual([3]);expect(queue.hasPending()).toBe(false);

    queue.schedule(4);queue.schedule(5);
    expect(queue.take()).toBe(5);expect(cancelFrame).toHaveBeenCalledWith(2);expect(published).toEqual([3]);
  });

  it("cancels a pending frame without publishing stale preview state",()=>{
    const callbacks=new Map<number,()=>void>();const published:string[]=[];
    const queue=createRafLatestQueue<string>(value=>published.push(value),callback=>{callbacks.set(1,callback);return 1;},id=>callbacks.delete(id));
    queue.schedule("draft");queue.cancel();callbacks.get(1)?.();
    expect(published).toEqual([]);expect(queue.hasPending()).toBe(false);
  });
});
