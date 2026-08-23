import {describe,expect,it} from "vitest";
import {translateStudio,type StudioMessageKey} from "@/lib/i18n/studio";

describe("H7 typed i18n consolidation",()=>{
  it("keeps Planner Director copy in the shared typed Studio dictionary",()=>{
    const keys:StudioMessageKey[]=[
      "planner.director.title",
      "planner.director.prompt",
      "planner.director.activity.analyze",
      "planner.director.activity.done",
    ];
    expect(keys.map(key=>translateStudio("zh-CN",key))).toEqual([
      "AI 导演 V2",
      "导演意图",
      "读取 Scene、字幕、现有视觉密度与空间占位",
      "Transaction {transaction} · {applied} applied",
    ]);
    expect(translateStudio("en-US","planner.director.activity.done",{transaction:"tx-1",applied:3})).toBe("Transaction tx-1 · 3 applied");
  });
});
