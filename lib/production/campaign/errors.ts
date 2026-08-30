export class ProductionCampaignNotFoundError extends Error{
  readonly code="PRODUCTION_CAMPAIGN_NOT_FOUND";
  constructor(readonly campaignId:string){
    super("Production Campaign was not found.");
    this.name="ProductionCampaignNotFoundError";
  }
}

export class ProductionCampaignAlreadyExistsError extends Error{
  readonly code="PRODUCTION_CAMPAIGN_ALREADY_EXISTS";
  constructor(readonly campaignId:string){
    super("Production Campaign already exists.");
    this.name="ProductionCampaignAlreadyExistsError";
  }
}

export class ProductionCampaignMissionUnavailableError extends Error{
  readonly code="PRODUCTION_CAMPAIGN_MISSION_UNAVAILABLE";
  constructor(readonly projectId:string,readonly missionId:string){
    super("A Production Mission referenced by this Campaign is unavailable or does not match its Project.");
    this.name="ProductionCampaignMissionUnavailableError";
  }
}

export class ProductionCampaignMissionNotFoundError extends Error{
  readonly code="PRODUCTION_CAMPAIGN_MISSION_NOT_FOUND";
  constructor(readonly campaignId:string,readonly projectId:string,readonly missionId:string){
    super("Production Campaign does not contain the requested Mission reference.");
    this.name="ProductionCampaignMissionNotFoundError";
  }
}

export class ProductionCampaignStateError extends Error{
  readonly code="PRODUCTION_CAMPAIGN_INVALID_STATE";
  constructor(readonly campaignId:string,readonly status:string,message="Production Campaign cannot perform this operation from its current state."){
    super(message);
    this.name="ProductionCampaignStateError";
  }
}

export class ProductionCampaignRunnerBusyError extends Error{
  readonly code="PRODUCTION_CAMPAIGN_RUNNER_BUSY";
  constructor(readonly campaignId:string){
    super("Production Campaign already has a live execution owner.");
    this.name="ProductionCampaignRunnerBusyError";
  }
}

export class ProductionCampaignExecutionUnavailableError extends Error{
  readonly code="PRODUCTION_CAMPAIGN_EXECUTION_UNAVAILABLE";
  constructor(){
    super("Campaign execution runtime is unavailable.");
    this.name="ProductionCampaignExecutionUnavailableError";
  }
}
