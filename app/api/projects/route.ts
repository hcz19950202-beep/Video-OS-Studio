import { randomUUID } from "node:crypto";
import { z } from "zod";
import { projectRepository } from "@/lib/server/runtime";

export const runtime = "nodejs";

const CreateProjectRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  fps: z.number().int().positive().max(120).optional(),
});

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "project";

export async function GET() {
  try {
    return Response.json({ projects: await projectRepository.listRecent() });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : String(error),
        action: "Check VIDEO_OS_DATA_ROOT permissions and retry.",
        retryable: true,
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const input = CreateProjectRequestSchema.parse(await request.json());
    const id = `${slugify(input.name)}-${randomUUID().slice(0, 8)}`;
    const project = await projectRepository.create({
      id,
      name: input.name,
      width: input.width,
      height: input.height,
      fps: input.fps,
    });
    return Response.json({ project }, { status: 201 });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : String(error),
        action: "Use a non-empty project name and verify the local data directory is writable.",
        retryable: true,
      },
      { status: 400 },
    );
  }
}
