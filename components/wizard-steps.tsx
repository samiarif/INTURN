import { cn } from '@/lib/utils';

export type WizardStep = { id: string; label: string; state: 'todo' | 'on' | 'done' };

export function WizardSteps({ steps }: { steps: WizardStep[] }) {
  return (
    <div className="flex items-center gap-2 text-[13px] mb-8 flex-wrap">
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-2 px-3 py-1.5 rounded-md font-medium',
              step.state === 'on' && 'bg-[var(--brand-500)] text-white',
              step.state === 'done' &&
                'bg-[var(--surface-muted)] text-[var(--ink-3)] line-through decoration-1',
              step.state === 'todo' && 'text-[var(--ink-3)]',
            )}
          >
            <b className="font-mono text-[11px]">{String(i + 1).padStart(2, '0')}</b>
            {step.label}
          </span>
          {i < steps.length - 1 && <span className="h-px w-6 bg-[var(--border-color)]" />}
        </div>
      ))}
    </div>
  );
}
