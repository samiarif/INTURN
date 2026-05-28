export default function Loading() {
  return (
    <div className="ws-shell ws" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="ws-topbar">
        <div className="ws-tb-brand">
          <span className="star" />
          <span className="name">Inturn</span>
        </div>
        <div className="ws-tb-crumbs">
          <div style={{ width: 200, height: 14, background: 'var(--surface-muted)', borderRadius: 4 }} />
        </div>
      </div>
      <div className="ws-body">
        <main className="ws-main">
          <div className="ws-mhead">
            <div className="ws-mhead-title-row">
              <div style={{ width: 280, height: 28, background: 'var(--surface-muted)', borderRadius: 6 }} />
            </div>
            <div className="ws-mhead-tabs">
              {['Overview', 'Tasks', 'Deliverables', 'Comments'].map((t) => (
                <span key={t} className="ws-mhead-tab">
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="ws-content">
            <div className="ws-col-main">
              <div className="ws-brief" style={{ minHeight: 140 }}>
                <div style={{ width: '60%', height: 22, background: 'var(--surface-muted)', borderRadius: 4 }} />
              </div>
              <div className="ws-stats">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="ws-stat" style={{ minHeight: 88 }}>
                    <div style={{ width: 60, height: 12, background: 'var(--surface-muted)', borderRadius: 4, marginBottom: 8 }} />
                    <div style={{ width: 40, height: 24, background: 'var(--surface-muted)', borderRadius: 4 }} />
                  </div>
                ))}
              </div>
              <div className="ws-card" style={{ minHeight: 280 }} />
              <div className="ws-card" style={{ minHeight: 200 }} />
            </div>
            <div className="ws-col-side">
              <div className="ws-rail-cta" style={{ minHeight: 140 }} />
              <div className="ws-rail-quick" style={{ minHeight: 180 }} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
