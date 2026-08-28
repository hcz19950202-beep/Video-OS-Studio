export class QAReportNotFoundError extends Error{
  constructor(reportId:string){super(`QA report ${reportId} was not found.`);this.name="QAReportNotFoundError";}
}
export class QAInvalidRenderJobError extends Error{
  constructor(message="The referenced render Job is not a completed final render for this Project."){super(message);this.name="QAInvalidRenderJobError";}
}
export class QAProjectUnavailableError extends Error{
  constructor(projectId:string){super(`Project ${projectId} is unavailable for QA.`);this.name="QAProjectUnavailableError";}
}
export class QARepairStaleProjectError extends Error{
  constructor(){super("The QA repair proposal is stale because the Project revision has changed.");this.name="QARepairStaleProjectError";}
}
export class QARepairReviewRequiredError extends Error{
  constructor(){super("This QA repair proposal requires explicit review before an application request can be prepared.");this.name="QARepairReviewRequiredError";}
}
