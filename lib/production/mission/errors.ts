export class ProductionMissionNotFoundError extends Error{
  readonly code="PRODUCTION_MISSION_NOT_FOUND";
  constructor(readonly projectId:string,readonly missionId:string){
    super("Production Mission was not found.");
    this.name="ProductionMissionNotFoundError";
  }
}

export class ProductionMissionAlreadyExistsError extends Error{
  readonly code="PRODUCTION_MISSION_ALREADY_EXISTS";
  constructor(readonly projectId:string,readonly missionId:string){
    super("Production Mission already exists.");
    this.name="ProductionMissionAlreadyExistsError";
  }
}

export class ProductionMissionProjectUnavailableError extends Error{
  readonly code="PRODUCTION_MISSION_PROJECT_UNAVAILABLE";
  constructor(readonly projectId:string,options?:{cause?:unknown}){
    super("The Project required by this Production Mission is unavailable.",options);
    this.name="ProductionMissionProjectUnavailableError";
  }
}

export class ProductionMissionTerminalStateError extends Error{
  readonly code="PRODUCTION_MISSION_TERMINAL_STATE";
  constructor(readonly missionId:string,readonly status:string){
    super("A completed or cancelled Production Mission cannot be edited.");
    this.name="ProductionMissionTerminalStateError";
  }
}
