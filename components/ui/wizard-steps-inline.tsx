// Sprint 3 wireframe step indicator. Inline, mono uppercase, brand-coloured
// active step. Different from `wizard-progress.tsx` (a percentage bar used by
// onboarding) — this one shows the named steps inline, with separators.
export function WizardStepsInline({
  steps,
  active,
}: {
  steps: Array<{ id: string; label: string; done?: boolean }>;
  active: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-8 text-[13px]">
      {steps.map((s, i) => {
        const isActive = s.id === active;
        const isDone = !!s.done;
        return (
          <div key={s.id} className="flex items-center gap-3">
            <span
              className={
                isActive
                  ? 'font-mono uppercase tracking-wider text-[var(--brand-600)] font-semibold'
                  : isDone
                    ? 'font-mono uppercase tracking-wider text-[var(--ink-3)] line-through opacity-60'
                    : 'font-mono uppercase tracking-wider text-[var(--ink-3)]'
              }
            >
              {String(i + 1).padStart(2, '0')} · {s.label}
            </span>
            {i < steps.length - 1 && (
              <span className="h-px w-8 bg-[var(--border-color)]" aria-hidden />
            )}
          </div>
        );
      })}
    </div>
  );
}
