export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div style={{ width: 320, height: 32, background: 'var(--surface-muted)', borderRadius: 8, marginBottom: 16 }} />
      <div style={{ width: 480, height: 16, background: 'var(--surface-muted)', borderRadius: 6, marginBottom: 32 }} />
      <div className="grid md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="border border-[var(--border-color)] rounded-lg bg-[var(--surface)] p-5"
            style={{ minHeight: 160 }}
          >
            <div style={{ width: 100, height: 10, background: 'var(--surface-muted)', borderRadius: 4, marginBottom: 12 }} />
            <div style={{ width: '70%', height: 18, background: 'var(--surface-muted)', borderRadius: 4, marginBottom: 16 }} />
            <div style={{ width: '100%', height: 12, background: 'var(--surface-muted)', borderRadius: 4, marginBottom: 6 }} />
            <div style={{ width: '60%', height: 12, background: 'var(--surface-muted)', borderRadius: 4 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
