import {beforeEach,describe,expect,it} from "vitest";
import {createProject} from "@/lib/project/factory";
import {MAX_HISTORY_BYTES,MAX_HISTORY_ENTRIES,useHistoryStore,type HistoryEntry} from "@/store/history-store";

const entry=(index:number,projectId="history"):HistoryEntry=>{
  const before=createProject({id:projectId,name:`Before ${index}`,durationInFrames:60,now:"2026-08-23T00:00:00.000Z"});
  before.project.revision=index;
  const after=structuredClone(before);
  after.project.name=`After ${index}`;
  after.project.revision=index+1;
  return{projectId,label:`Edit ${index}`,before,after};
};

beforeEach(()=>useHistoryStore.getState().clear());

describe("H5 history store",()=>{
  it("bounds entry count and invalidates redo after a fresh edit",()=>{
    for(let index=0;index<MAX_HISTORY_ENTRIES+8;index++)useHistoryStore.getState().push(entry(index));
    expect(useHistoryStore.getState().undoStack).toHaveLength(MAX_HISTORY_ENTRIES);
    const currentRevision=MAX_HISTORY_ENTRIES+8;
    expect(useHistoryStore.getState().takeUndo("history",currentRevision)?.label).toBe(`Edit ${MAX_HISTORY_ENTRIES+7}`);
    expect(useHistoryStore.getState().redoStack).toHaveLength(1);
    useHistoryStore.getState().push(entry(100));
    expect(useHistoryStore.getState().redoStack).toHaveLength(0);
  });

  it("clears stale project history instead of applying it to an unrelated revision",()=>{
    useHistoryStore.getState().push(entry(0));
    expect(useHistoryStore.getState().takeUndo("history",99)).toBeUndefined();
    expect(useHistoryStore.getState().undoStack.filter(item=>item.projectId==="history")).toHaveLength(0);
    expect(useHistoryStore.getState().redoStack.filter(item=>item.projectId==="history")).toHaveLength(0);
  });

  it("tracks expected revisions across repeated undo and redo restores",()=>{
    useHistoryStore.getState().push(entry(0));
    const undone=useHistoryStore.getState().takeUndo("history",1);
    expect(undone?.label).toBe("Edit 0");
    const redone=useHistoryStore.getState().takeRedo("history",2);
    expect(redone?.label).toBe("Edit 0");
    const secondUndo=useHistoryStore.getState().takeUndo("history",3);
    expect(secondUndo?.label).toBe("Edit 0");
  });

  it("rolls back stack movement when the server-side restore fails",()=>{
    useHistoryStore.getState().push(entry(0));
    const undone=useHistoryStore.getState().takeUndo("history",1)!;
    useHistoryStore.getState().rollbackUndo("history",undone,1);
    expect(useHistoryStore.getState().redoStack).toHaveLength(0);
    expect(useHistoryStore.getState().takeUndo("history",1)?.label).toBe("Edit 0");
  });

  it("drops a single history entry that exceeds the byte budget",()=>{
    const huge=entry(0);
    huge.after.script.segments=[{id:"segment",startFrame:0,endFrame:1,text:"x".repeat(MAX_HISTORY_BYTES+1024),sourceStartFrame:0,sourceEndFrame:1}];
    useHistoryStore.getState().push(huge);
    expect(useHistoryStore.getState().undoStack).toHaveLength(0);
  });
});
