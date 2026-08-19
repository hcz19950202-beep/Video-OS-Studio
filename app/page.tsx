import { StudioPreview } from "@/components/player/StudioPreview";

export default function Home() {
  return (
    <main className="studio-page">
      <header className="studio-header">
        <div>
          <p className="eyebrow">VIDEO OS STUDIO</p>
          <h1>Phase 0 Foundation</h1>
        </div>
        <span className="status-pill">Cloud scaffold</span>
      </header>

      <section className="studio-grid">
        <aside className="panel">
          <h2>Asset Library</h2>
          <p>Phase 1+ will add media and effects here.</p>
        </aside>

        <section className="preview-panel">
          <StudioPreview />
        </section>

        <aside className="panel">
          <h2>Inspector</h2>
          <p>Schema-driven controls arrive in Phase 4.</p>
        </aside>
      </section>

      <section className="timeline-placeholder">
        <strong>Timeline</strong>
        <span>Frame-based timeline engine is ready; interactive UI is Phase 2.</span>
      </section>
    </main>
  );
}
