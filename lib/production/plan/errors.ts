export class ProductionPlanNotFoundError extends Error{
  readonly code="PRODUCTION_PLAN_NOT_FOUND";
  constructor(readonly projectId:string,readonly planId:string){super("Production plan was not found.");this.name="ProductionPlanNotFoundError";}
}

export class ProductionPlanAlreadyExistsError extends Error{
  readonly code="PRODUCTION_PLAN_ALREADY_EXISTS";
  constructor(readonly projectId:string,readonly planId:string){super("Production plan already exists.");this.name="ProductionPlanAlreadyExistsError";}
}

export class ProductionPlanRevisionConflictError extends Error{
  readonly code="PRODUCTION_PLAN_REVISION_CONFLICT";
  constructor(readonly expectedRevision:number,readonly actualRevision:number){super(`Production planning context is stale: expected Project revision ${expectedRevision}, found ${actualRevision}.`);this.name="ProductionPlanRevisionConflictError";}
}

export class ProductionMissionPlanConflictError extends Error{
  readonly code="PRODUCTION_MISSION_PLAN_CONFLICT";
  constructor(){super("Production Mission changed while a plan was being generated. Re-plan from the latest Mission state.");this.name="ProductionMissionPlanConflictError";}
}

export class ProductionMissionPlanningStateError extends Error{
  readonly code="PRODUCTION_MISSION_PLANNING_STATE_INVALID";
  constructor(readonly status:string){super(`Production Mission cannot be planned from status ${status}.`);this.name="ProductionMissionPlanningStateError";}
}
