export function WorkspaceBodySkeleton() {
  return (
    <div className="ws-content" aria-busy="true">
      <div className="ws-col-main">
        <div
          style={{ height: 160, background: 'var(--surface-muted)', borderRadius: 8 }}
        />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12,
            marginTop: 12,
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{ height: 72, background: 'var(--surface-muted)', borderRadius: 6 }}
            />
          ))}
        </div>
        <div
          style={{
            marginTop: 16,
            height: 240,
            background: 'var(--surface-muted)',
            borderRadius: 8,
          }}
        />
        <div
          style={{
            marginTop: 16,
            height: 180,
            background: 'var(--surface-muted)',
            borderRadius: 8,
          }}
        />
      </div>
      <div className="ws-col-side">
        <div style={{ height: 320, background: 'var(--surface-muted)', borderRadius: 8 }} />
      </div>
    </div>
  );
}
