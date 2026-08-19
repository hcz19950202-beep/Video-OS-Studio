import { ProjectSchema } from "@/schemas/project";
import { projectRepository } from "@/lib/server/runtime";

export const runtime = "nodejs";

type Context = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const { projectId } = await params;
    return Response.json({ project: await projectRepository.load(projectId) });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : String(error),
        action: "Confirm the project still exists under VIDEO_OS_DATA_ROOT and retry.",
        retryable: true,
      },
      { status: 404 },
    );
  }
}

export async function PUT(request: Request, { params }: Context) {
  try {
    const { projectId } = await params;
    const project = ProjectSchema.parse(await request.json());
    if (project.project.id !== projectId) {
      throw new Error("Project ID in the request body does not match the route.");
    }
    await projectRepository.save(project);
    return Response.json({ project });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : String(error),
        action: "Reload the project, keep changes inside Project Commands, and retry saving.",
        retryable: true,
      },
      { status: 400 },
    );
  }
}
