import { mediaImportService } from "@/lib/server/runtime";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 512 * 1024 * 1024;

type Context = { params: Promise<{ projectId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const { projectId } = await params;
    const formData = await request.formData();
    const upload = formData.get("file");
    if (!(upload instanceof File)) throw new Error("No media file was provided.");
    if (upload.size <= 0) throw new Error("The selected file is empty.");
    if (upload.size > MAX_UPLOAD_BYTES) {
      throw new Error("The selected file exceeds the Phase 1 512 MB upload limit.");
    }
    const project = await mediaImportService.importFile({
      projectId,
      fileName: upload.name,
      mimeType: upload.type || undefined,
      bytes: new Uint8Array(await upload.arrayBuffer()),
    });
    return Response.json({ project });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : String(error),
        action: "Use a valid MP4 or SRT, verify ffprobe for MP4 files, then retry.",
        retryable: true,
      },
      { status: 400 },
    );
  }
}
