import { ProjectCommandSchema, applyProjectCommand } from "@/lib/project/commands";
import { projectRepository } from "@/lib/server/runtime";

export const runtime = "nodejs";

type Context = { params: Promise<{ projectId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const { projectId } = await params;
    const command = ProjectCommandSchema.parse(await request.json());
    const current = await projectRepository.load(projectId);
    const project = applyProjectCommand(current, command);
    await projectRepository.save(project);
    return Response.json({ project });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : String(error),
        action: "Reload the project and retry the validated command.",
        retryable: true,
      },
      { status: 400 },
    );
  }
}
