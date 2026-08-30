export class RenderReferencedMediaUnavailableError extends Error{
  readonly code="RENDER_REFERENCED_MEDIA_UNAVAILABLE";
  constructor(readonly assetIds:string[]){
    super("Render cannot continue because referenced Project media is unavailable.");
    this.name="RenderReferencedMediaUnavailableError";
  }
}
