export class ProductionExecutionNotFoundError extends Error{
  readonly code="PRODUCTION_EXECUTION_NOT_FOUND";
  constructor(readonly projectId:string,readonly executionId:string){
    super("Production Mission execution was not found.");
    this.name="ProductionExecutionNotFoundError";
  }
}

export class ProductionExecutionAlreadyExistsError extends Error{
  readonly code="PRODUCTION_EXECUTION_ALREADY_EXISTS";
  constructor(readonly projectId:string,readonly executionId:string){
    super("Production Mission execution already exists.");
    this.name="ProductionExecutionAlreadyExistsError";
  }
}

export class ProductionExecutionPlanUnavailableError extends Error{
  readonly code="PRODUCTION_EXECUTION_PLAN_UNAVAILABLE";
  constructor(){
    super("Production Mission does not have an executable Production Plan.");
    this.name="ProductionExecutionPlanUnavailableError";
  }
}

export class ProductionExecutionPlanMismatchError extends Error{
  readonly code="PRODUCTION_EXECUTION_PLAN_MISMATCH";
  constructor(){
    super("Production Mission execution does not match the Mission's current Production Plan.");
    this.name="ProductionExecutionPlanMismatchError";
  }
}

export class ProductionExecutionStaleProjectError extends Error{
  readonly code="PRODUCTION_EXECUTION_STALE_PROJECT";
  constructor(readonly expectedRevision:number,readonly actualRevision:number){
    super("Production Mission execution is stale against the current Project revision.");
    this.name="ProductionExecutionStaleProjectError";
  }
}

export class ProductionExecutionBudgetExceededError extends Error{
  readonly code="PRODUCTION_EXECUTION_BUDGET_EXCEEDED";
  constructor(readonly budget:string){
    super("Production Mission execution budget was exhausted.");
    this.name="ProductionExecutionBudgetExceededError";
  }
}

export class ProductionExecutionCheckpointError extends Error{
  readonly code="PRODUCTION_EXECUTION_CHECKPOINT_INVALID";
  constructor(message="Production Mission checkpoint is not valid for the current execution state."){
    super(message);
    this.name="ProductionExecutionCheckpointError";
  }
}

export class ProductionExecutionMissionCancelledError extends Error{
  readonly code="PRODUCTION_EXECUTION_MISSION_CANCELLED";
  constructor(){
    super("Cancelled Production Missions cannot start a new execution.");
    this.name="ProductionExecutionMissionCancelledError";
  }
}
