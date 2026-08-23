export type FrameRequest=(callback:()=>void)=>number;
export type FrameCancel=(id:number)=>void;

export const createRafLatestQueue=<T>(publish:(value:T)=>void,requestFrame:FrameRequest,cancelFrame:FrameCancel)=>{
  let frameId:number|null=null;
  let pending:T|undefined;
  const run=()=>{
    frameId=null;
    const value=pending;
    pending=undefined;
    if(value!==undefined)publish(value);
  };
  return{
    schedule(value:T){pending=value;if(frameId===null)frameId=requestFrame(run);},
    cancel(){if(frameId!==null)cancelFrame(frameId);frameId=null;pending=undefined;},
    take(){if(frameId!==null)cancelFrame(frameId);frameId=null;const value=pending;pending=undefined;return value;},
    hasPending(){return frameId!==null;},
  };
};
