export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-10 animate-pulse">
      <div className="h-8 w-64 bg-[var(--surface-muted)] rounded-md mb-3" />
      <div className="h-4 w-96 bg-[var(--surface-muted)] rounded-md mb-8" />
      <div className="space-y-3">
        <div className="h-16 bg-[var(--surface-muted)] rounded-md" />
        <div className="h-16 bg-[var(--surface-muted)] rounded-md" />
        <div className="h-16 bg-[var(--surface-muted)] rounded-md" />
      </div>
    </div>
  );
}
