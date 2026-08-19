"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { StudioPreview } from "@/components/player/StudioPreview";
import type { ProjectCommand } from "@/lib/project/commands";
import type { ProjectSummary } from "@/lib/project/repository";
import type { Project } from "@/schemas/project";
import { useProjectStore } from "@/store/project-store";

type ApiError = { error?: string; action?: string; retryable?: boolean };
type ErrorState = { message: string; action?: string; retryable: boolean } | null;

const requestJson = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, init);
  const payload = (await response.json()) as T & ApiError;
  if (!response.ok) {
    const error = new Error(payload.error || `Request failed with status ${response.status}`);
    Object.assign(error, { action: payload.action, retryable: payload.retryable });
    throw error;
  }
  return payload;
};

const toErrorState = (error: unknown): ErrorState => ({
  message: error instanceof Error ? error.message : String(error),
  action: error instanceof Error && "action" in error ? String((error as Error & { action?: string }).action || "") : undefined,
  retryable: error instanceof Error && "retryable" in error ? Boolean((error as Error & { retryable?: boolean }).retryable) : true,
});

const formatUpdatedAt = (value: string) => new Date(value).toLocaleString();

export const StudioWorkspace = ({ initialProjects }: { initialProjects: ProjectSummary[] }) => {
  const project = useProjectStore((state) => state.project);
  const setProject = useProjectStore((state) => state.setProject);
  const [projects, setProjects] = useState<ProjectSummary[]>(initialProjects);
  const [newProjectName, setNewProjectName] = useState("Untitled Video");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("Phase 1 ready");
  const [error, setError] = useState<ErrorState>(null);
  const [lastUpload, setLastUpload] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const refreshRecent = useCallback(async () => {
    const data = await requestJson<{ projects: ProjectSummary[] }>("/api/projects", { cache: "no-store" });
    setProjects(data.projects);
  }, []);

  const run = async (label: string, operation: () => Promise<void>) => {
    setBusy(label);
    setError(null);
    try {
      await operation();
    } catch (caught) {
      setError(toErrorState(caught));
    } finally {
      setBusy(null);
    }
  };

  const createNewProject = () =>
    run("Creating project", async () => {
      const data = await requestJson<{ project: Project }>("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProjectName }),
      });
      setProject(data.project);
      setNotice("Project created and saved");
      await refreshRecent();
    });

  const openProject = (projectId: string) =>
    run("Opening project", async () => {
      const data = await requestJson<{ project: Project }>(`/api/projects/${encodeURIComponent(projectId)}`, { cache: "no-store" });
      setProject(data.project);
      setNotice("Project restored from local data");
    });

  const persistCommand = (command: ProjectCommand, successMessage: string) => {
    if (!project) return Promise.resolve();
    return run("Saving change", async () => {
      const data = await requestJson<{ project: Project }>(
        `/api/projects/${encodeURIComponent(project.project.id)}/commands`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(command),
        },
      );
      setProject(data.project);
      setNotice(successMessage);
      await refreshRecent();
    });
  };

  const renameProject = () => {
    const name = renameInputRef.current?.value.trim();
    if (!project || !name || name === project.project.name) return Promise.resolve();
    return persistCommand({ type: "rename-project", name }, "Project renamed");
  };

  const saveProject = () => {
    if (!project) return Promise.resolve();
    return run("Saving project", async () => {
      const data = await requestJson<{ project: Project }>(`/api/projects/${encodeURIComponent(project.project.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(project),
      });
      setProject(data.project);
      setNotice("project.json saved atomically; backup preserved when applicable");
      await refreshRecent();
    });
  };

  const uploadFile = (file: File) => {
    if (!project) return Promise.resolve();
    setLastUpload(file);
    return run(`Importing ${file.name}`, async () => {
      const formData = new FormData();
      formData.set("file", file);
      const data = await requestJson<{ project: Project }>(
        `/api/projects/${encodeURIComponent(project.project.id)}/media`,
        { method: "POST", body: formData },
      );
      setProject(data.project);
      setNotice(file.name.toLowerCase().endsWith(".mp4") ? "MP4 imported, probed and connected to Player" : "SRT imported as a subtitle asset");
      await refreshRecent();
    });
  };

  const videoAsset = useMemo(() => project?.assets.find((asset) => asset.kind === "video"), [project]);

  return (
    <main className="studio-page">
      <header className="studio-header">
        <div>
          <p className="eyebrow">VIDEO OS STUDIO</p>
          <h1>{project?.project.name ?? "Phase 1 · Player & Media"}</h1>
        </div>
        <div className="header-actions">
          <span className="status-pill">{busy ?? notice}</span>
          <button className="button secondary" disabled={!project || Boolean(busy)} onClick={() => void saveProject()}>Save</button>
        </div>
      </header>

      {error ? (
        <div className="error-banner" role="alert">
          <div><strong>{error.message}</strong>{error.action ? <span>{error.action}</span> : null}</div>
          {error.retryable && lastUpload && project ? <button className="button danger" onClick={() => void uploadFile(lastUpload)}>Retry import</button> : null}
        </div>
      ) : null}

      <section className="project-toolbar panel-card">
        <div className="field-group grow">
          <label htmlFor="new-project-name">New project</label>
          <div className="inline-controls">
            <input id="new-project-name" value={newProjectName} onChange={(event) => setNewProjectName(event.target.value)} />
            <button className="button" disabled={!newProjectName.trim() || Boolean(busy)} onClick={() => void createNewProject()}>Create</button>
          </div>
        </div>
        <div className="field-group grow">
          <label htmlFor="rename-project">Project name</label>
          <div className="inline-controls">
            <input key={project?.project.id ?? "no-project"} ref={renameInputRef} id="rename-project" disabled={!project} defaultValue={project?.project.name ?? ""} />
            <button className="button secondary" disabled={!project || Boolean(busy)} onClick={() => void renameProject()}>Rename</button>
          </div>
        </div>
        <div className="field-group">
          <label>Canvas</label>
          <div className="segmented">
            <button disabled={!project} className={project?.canvas.width === 1080 && project.canvas.height === 1920 ? "active" : ""} onClick={() => void persistCommand({ type: "set-canvas", width: 1080, height: 1920 }, "Canvas set to 9:16")}>9:16</button>
            <button disabled={!project} className={project?.canvas.width === 1920 && project.canvas.height === 1080 ? "active" : ""} onClick={() => void persistCommand({ type: "set-canvas", width: 1920, height: 1080 }, "Canvas set to 16:9")}>16:9</button>
            <button disabled={!project} className={project?.canvas.width === 1080 && project.canvas.height === 1080 ? "active" : ""} onClick={() => void persistCommand({ type: "set-canvas", width: 1080, height: 1080 }, "Canvas set to 1:1")}>1:1</button>
          </div>
        </div>
      </section>

      <section className="studio-grid">
        <aside className="panel studio-sidebar">
          <div className="panel-heading"><h2>Projects</h2><button className="text-button" onClick={() => void refreshRecent()}>Refresh</button></div>
          <div className="recent-list">
            {projects.length === 0 ? <p>No local projects yet.</p> : projects.map((item) => (
              <button key={item.id} className={`recent-project ${item.id === project?.project.id ? "selected" : ""}`} onClick={() => void openProject(item.id)}>
                <strong>{item.name}</strong><span>rev {item.revision} · {formatUpdatedAt(item.updatedAt)}</span>
              </button>
            ))}
          </div>
          <div className="divider" />
          <div className="panel-heading"><h2>Assets</h2><button className="button small" disabled={!project || Boolean(busy)} onClick={() => fileInputRef.current?.click()}>Import</button></div>
          <input ref={fileInputRef} className="sr-only" type="file" accept="video/mp4,.mp4,application/x-subrip,.srt" onChange={(event) => {
            const file = event.target.files?.[0];
            event.currentTarget.value = "";
            if (file) void uploadFile(file);
          }} />
          <p className="hint">Phase 1: MP4 + SRT, up to 512 MB.</p>
          <div className="asset-list">
            {project?.assets.map((asset) => (
              <div className="asset-card" key={asset.id}>
                <div><span className="asset-kind">{asset.kind}</span><strong>{asset.label ?? asset.originalName ?? asset.id}</strong></div>
                <span>{asset.kind === "video" ? `${asset.width ?? "?"}×${asset.height ?? "?"} · ${asset.durationInFrames ?? "?"}f` : asset.relativePath}</span>
              </div>
            )) ?? <p className="hint">Create or open a project first.</p>}
          </div>
        </aside>

        <section className="preview-panel">
          {project ? <StudioPreview project={project} /> : (
            <div className="empty-state"><span>01</span><h2>Create or open a project</h2><p>Then import an MP4 to replace the Phase 0 placeholder with real media.</p></div>
          )}
        </section>

        <aside className="panel inspector-summary">
          <h2>Project Inspector</h2>
          {project ? <dl>
            <div><dt>ID</dt><dd>{project.project.id}</dd></div>
            <div><dt>Revision</dt><dd>{project.project.revision}</dd></div>
            <div><dt>Canvas</dt><dd>{project.canvas.width}×{project.canvas.height}</dd></div>
            <div><dt>FPS</dt><dd>{project.canvas.fps}</dd></div>
            <div><dt>Duration</dt><dd>{project.canvas.durationInFrames} frames</dd></div>
            <div><dt>Primary video</dt><dd>{videoAsset?.originalName ?? "Not imported"}</dd></div>
          </dl> : <p>Create or load a project to inspect it.</p>}
          <p className="phase-note">Schema-driven Effect Inspector remains Phase 4.</p>
        </aside>
      </section>

      <section className="timeline-placeholder">
        <strong>Timeline · Phase 2 boundary</strong>
        <span>Phase 1 writes a real Video clip in frame units. Interactive drag, resize and zoom are intentionally not implemented yet.</span>
      </section>
    </main>
  );
};
