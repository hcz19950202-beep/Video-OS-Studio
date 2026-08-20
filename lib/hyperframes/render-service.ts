import { createHash } from "node:crypto";
import type { FileSystemAdapter, HyperFramesAdapter } from "@/adapters/contracts";
import { applyProjectCommand } from "@/lib/project/commands";
import type { ProjectRepository } from "@/lib/project/repository";
import { parseHyperFramesEffect } from "@/shared/hyperframes/registry";
import type { MotionTransform } from "@/schemas/clip";
import type { Project } from "@/schemas/project";

export class HyperFramesRenderService {
  constructor(private readonly fs: FileSystemAdapter, private readonly adapter: HyperFramesAdapter, private readonly repository: ProjectRepository) {}

  async renderAndAdd(input: { projectId: string; effectId: string; props: Record<string, unknown>; startFrame: number; durationInFrames: number; transform?: MotionTransform }): Promise<Project> {
    let project = await this.repository.load(input.projectId);
    const parsed = parseHyperFramesEffect(input.effectId, input.props);
    const cacheKey = createHash("sha256").update(JSON.stringify({ effectId: parsed.effectId, props: parsed.props, width: project.canvas.width, height: project.canvas.height, fps: project.canvas.fps, durationInFrames: input.durationInFrames })).digest("hex").slice(0, 16);
    const assetId = `hf-${parsed.effectId}-${cacheKey}`;
    const relativePath = `animations/${assetId}.webm`;
    const absolutePath = this.repository.resolveProjectFile(project.project.id, relativePath);
    const cachedAsset = project.assets.find((asset) => asset.id === assetId);
    if (!cachedAsset || !(await this.fs.exists(absolutePath))) {
      await this.adapter.render({ effectId: parsed.effectId, props: parsed.props, width: project.canvas.width, height: project.canvas.height, fps: project.canvas.fps, durationInFrames: input.durationInFrames, outputPath: absolutePath });
      if (!cachedAsset) project = applyProjectCommand(project, { type: "add-asset", asset: { id: assetId, kind: "overlay", relativePath, label: parsed.effectId, mimeType: "video/webm", durationInFrames: input.durationInFrames, width: project.canvas.width, height: project.canvas.height, sourceFps: project.canvas.fps, hasAudio: false } });
    }
    project = applyProjectCommand(project, { type: "add-clip", trackId: "motion-main", clip: { id: `motion-${assetId}-${Date.now()}`, type: "motion", engine: "hyperframes", effectId: parsed.effectId, assetId, props: parsed.props, transform:input.transform, startFrame: input.startFrame, durationInFrames: input.durationInFrames, enabled: true, layer: 20 } });
    await this.repository.save(project);
    return project;
  }
}
