import { StudioWorkspace } from "@/components/studio/StudioWorkspace";
import { projectRepository } from "@/lib/server/runtime";

export const dynamic = "force-dynamic";

export default async function Home() {
  let initialProjects = [];
  try {
    initialProjects = await projectRepository.listRecent();
  } catch {
    initialProjects = [];
  }
  return <StudioWorkspace initialProjects={initialProjects} />;
}
