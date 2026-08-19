import { fileSystem, projectRepository } from "@/lib/server/runtime";

export const runtime = "nodejs";

type Context = { params: Promise<{ projectId: string; assetId: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const { projectId, assetId } = await params;
    const project = await projectRepository.load(projectId);
    const asset = project.assets.find((item) => item.id === assetId);
    if (!asset) throw new Error(`Asset ${assetId} was not found in project ${projectId}.`);
    const bytes = await fileSystem.readBinary(projectRepository.resolveProjectFile(projectId, asset.relativePath));
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    return new Response(buffer, {
      headers: {
        "Content-Type": asset.mimeType || "application/octet-stream",
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : String(error),
        action: "Re-import the missing asset or reload the project.",
        retryable: false,
      },
      { status: 404 },
    );
  }
}
