import type {AttributedProjectHistoryTransaction} from "@/lib/project/history-attribution-schema";
import {parseJsonResponse} from "@/lib/client/api";

export const listAttributedProjectHistory=async(projectId:string)=>{
  const response=await fetch(`/api/projects/${encodeURIComponent(projectId)}/transactions`,{cache:"no-store"});
  return parseJsonResponse<{transactions:AttributedProjectHistoryTransaction[]}>(response);
};
