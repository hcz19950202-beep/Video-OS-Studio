import { fileSystem, projectRepository } from "@/lib/server/runtime";
import {parseSingleByteRange,RangeNotSatisfiableError} from "@/lib/http/byte-range";

export const runtime = "nodejs";

type Context = { params: Promise<{ projectId: string; assetId: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const { projectId, assetId } = await params;
    const project = await projectRepository.load(projectId);
    const asset = project.assets.find((item) => item.id === assetId);
    if (!asset) throw new Error(`Asset ${assetId} was not found in project ${projectId}.`);
    const bytes = await fileSystem.readBinary(projectRepository.resolveProjectFile(projectId, asset.relativePath));
    let range;
    try{
      range=parseSingleByteRange(request.headers.get("range"),bytes.byteLength);
    }catch(error){
      if(error instanceof RangeNotSatisfiableError){
        return new Response(null,{status:416,headers:{"Accept-Ranges":"bytes","Content-Range":`bytes */${bytes.byteLength}`}});
      }
      throw error;
    }
    const selected=range?bytes.slice(range.start,range.end+1):bytes;
    const buffer = selected.buffer.slice(selected.byteOffset, selected.byteOffset + selected.byteLength) as ArrayBuffer;
    return new Response(buffer, {
      status:range?206:200,
      headers: {
        "Content-Type": asset.mimeType || "application/octet-stream",
        "Content-Length": String(selected.byteLength),
        "Accept-Ranges":"bytes",
        ...(range?{"Content-Range":`bytes ${range.start}-${range.end}/${bytes.byteLength}`}:{}),
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
