export class ProductionWorkspaceTruthInconsistentError extends Error{
  readonly code="PRODUCTION_WORKSPACE_TRUTH_INCONSISTENT";
  constructor(){
    super("The Production Mission references durable production truth that does not match its scope.");
    this.name="ProductionWorkspaceTruthInconsistentError";
  }
}
