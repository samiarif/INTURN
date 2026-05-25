export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div style={{ width: 320, height: 32, background: 'var(--surface-muted)', borderRadius: 8, marginBottom: 16 }} />
      <div style={{ width: 480, height: 16, background: 'var(--surface-muted)', borderRadius: 6, marginBottom: 24 }} />
      <div
        style={{ width: '100%', height: 40, background: 'var(--surface-muted)', borderRadius: 8, marginBottom: 24 }}
      />
      <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-6">
        {/* Filter rail skeleton */}
        <div
          className="border border-[var(--border-color)] rounded-lg bg-[var(--surface)] p-4"
          style={{ minHeight: 320 }}
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ marginBottom: 18 }}>
              <div style={{ width: 80, height: 10, background: 'var(--surface-muted)', borderRadius: 4, marginBottom: 8 }} />
              {[1, 2, 3].map((j) => (
                <div
                  key={j}
                  style={{ width: '100%', height: 14, background: 'var(--surface-muted)', borderRadius: 4, marginBottom: 6 }}
                />
              ))}
            </div>
          ))}
        </div>
        {/* Cards grid skeleton */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="border border-[var(--border-color)] rounded-lg bg-[var(--surface)] p-5"
              style={{ minHeight: 180 }}
            >
              <div style={{ width: 100, height: 10, background: 'var(--surface-muted)', borderRadius: 4, marginBottom: 12 }} />
              <div style={{ width: '70%', height: 18, background: 'var(--surface-muted)', borderRadius: 4, marginBottom: 16 }} />
              <div style={{ width: '100%', height: 12, background: 'var(--surface-muted)', borderRadius: 4, marginBottom: 6 }} />
              <div style={{ width: '60%', height: 12, background: 'var(--surface-muted)', borderRadius: 4 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
