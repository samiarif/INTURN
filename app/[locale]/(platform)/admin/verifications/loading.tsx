export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto p-8">
      <div style={{ width: 200, height: 28, background: 'var(--surface-muted)', borderRadius: 6, marginBottom: 8 }} />
      <div style={{ width: 360, height: 14, background: 'var(--surface-muted)', borderRadius: 4, marginBottom: 24 }} />
      <div className="border border-[var(--border-color)] rounded-md overflow-hidden bg-[var(--surface)]">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="border-b border-[var(--border-color)] last:border-b-0 px-4 py-4"
            style={{ display: 'flex', gap: 16, alignItems: 'center' }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ width: '40%', height: 14, background: 'var(--surface-muted)', borderRadius: 4, marginBottom: 6 }} />
              <div style={{ width: '20%', height: 11, background: 'var(--surface-muted)', borderRadius: 4 }} />
            </div>
            <div style={{ width: 80, height: 24, background: 'var(--surface-muted)', borderRadius: 12 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
