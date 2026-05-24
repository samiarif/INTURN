export function WizardProgress({
  step,
  total,
  label,
}: {
  step: number;
  total: number;
  label: string;
}) {
  const pct = Math.round((step / total) * 100);
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between text-xs text-[var(--ink-3)] mb-2">
        <span>{label}</span>
        <span>
          {step} / {total}
        </span>
      </div>
      <div className="h-1 bg-[var(--surface-muted)] rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--brand-500)] transition-all"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={step}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label={label}
        />
      </div>
    </div>
  );
}
