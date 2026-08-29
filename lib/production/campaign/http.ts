import {z} from "zod";
import {
  ProductionCampaignExecutionUnavailableError,
  ProductionCampaignMissionNotFoundError,
  ProductionCampaignMissionUnavailableError,
  ProductionCampaignNotFoundError,
  ProductionCampaignStateError,
} from "@/lib/production/campaign/errors";
import {ProductionCampaignIdSchema} from "@/lib/production/campaign/schema";
import {ProductionMissionIdSchema} from "@/lib/production/mission/schema";
import {ProjectIdSchema} from "@/schemas/project";

export const ProductionCampaignActionRequestSchema=z.discriminatedUnion("action",[
  z.object({action:z.literal("enqueue")}).strict(),
  z.object({action:z.literal("run")}).strict(),
  z.object({action:z.literal("resume")}).strict(),
  z.object({action:z.literal("retry-failed")}).strict(),
  z.object({action:z.literal("archive")}).strict(),
  z.object({
    action:z.literal("cancel-mission"),
    projectId:ProjectIdSchema,
    missionId:ProductionMissionIdSchema,
  }).strict(),
]);
export type ProductionCampaignActionRequest=z.infer<typeof ProductionCampaignActionRequestSchema>;

export const parseProductionCampaignId=(campaignId:string)=>ProductionCampaignIdSchema.parse(campaignId);

export const productionCampaignErrorResponse=(error:unknown)=>{
  if(error instanceof z.ZodError)return Response.json({
    error:"invalid_campaign_request",
    message:"The Campaign request did not match the accepted bounded contract.",
    retryable:false,
  },{status:400});
  if(error instanceof ProductionCampaignNotFoundError)return Response.json({
    error:"campaign_not_found",
    message:"The Production Campaign was not found.",
    retryable:false,
  },{status:404});
  if(error instanceof ProductionCampaignMissionNotFoundError||error instanceof ProductionCampaignMissionUnavailableError)return Response.json({
    error:"campaign_mission_unavailable",
    message:"The requested Production Mission is unavailable for this Campaign.",
    retryable:false,
  },{status:404});
  if(error instanceof ProductionCampaignStateError)return Response.json({
    error:"campaign_state_conflict",
    message:error.message,
    retryable:false,
  },{status:409});
  if(error instanceof ProductionCampaignExecutionUnavailableError)return Response.json({
    error:"campaign_execution_unavailable",
    message:"Campaign execution is unavailable until the bounded Production runtime is configured.",
    retryable:true,
  },{status:503});
  return Response.json({
    error:"campaign_request_failed",
    message:"The Campaign request failed without exposing internal runtime details.",
    retryable:true,
  },{status:500});
};
