export type CreativeAssetContractErrorCode="invalid_parameter_values"|"immutable_version"|"invalid_version_transition";

export class CreativeAssetContractError extends Error{
  constructor(readonly code:CreativeAssetContractErrorCode,message:string){
    super(message);
    this.name="CreativeAssetContractError";
  }
}
