'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { updateProjectGoalsPhasesAction } from '../server-actions';

type Phase = { name: string; description?: string; fromWeek: number; toWeek: number };

type Mode = 'goals' | 'phases';

export function EditGoalsPhasesDialog({
  projectId,
  mode,
  initialGoals,
  initialPhases,
  trigger,
}: {
  projectId: string;
  mode: Mode;
  initialGoals?: string[];
  initialPhases?: Phase[];
  trigger: { label: string; className?: string };
}) {
  const t = useTranslations('projectHub.edit');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [goals, setGoals] = useState<string[]>(initialGoals ?? ['', '', '']);
  const [phases, setPhases] = useState<Phase[]>(
    initialPhases && initialPhases.length > 0
      ? initialPhases
      : [{ name: '', fromWeek: 1, toWeek: 4 }],
  );

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await updateProjectGoalsPhasesAction({
        projectId,
        goals: mode === 'goals' ? goals.map((g) => g.trim()).filter(Boolean) : undefined,
        phases:
          mode === 'phases'
            ? phases.filter((p) => p.name.trim().length > 0)
            : undefined,
      });
      if (!res.ok) {
        setError(res.error ?? 'failed');
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={trigger.className ?? 'text-[12.5px] text-[var(--brand-700)] hover:underline'}
      >
        {trigger.label}
      </button>
    );
  }

  return (
    <>
      <div
        onClick={() => setOpen(false)}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 49 }}
        aria-hidden
      />
      <div
        role="dialog"
        aria-label={mode === 'goals' ? t('goalsTitle') : t('phasesTitle')}
        style={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(560px, calc(100vw - 32px))',
          maxHeight: 'calc(100vh - 64px)',
          overflowY: 'auto',
          background: 'var(--surface)',
          border: '1px solid var(--border-color)',
          borderRadius: 12,
          padding: 20,
          zIndex: 50,
          boxShadow: '0 20px 60px -20px rgba(0,0,0,0.3)',
        }}
      >
        <h3 className="text-[16px] font-semibold mb-1">
          {mode === 'goals' ? t('goalsTitle') : t('phasesTitle')}
        </h3>
        <p className="text-[12.5px] text-[var(--ink-3)] mb-4">
          {mode === 'goals' ? t('goalsHint') : t('phasesHint')}
        </p>

        {mode === 'goals' ? (
          <div className="flex flex-col gap-2">
            {goals.map((g, i) => (
              <input
                key={i}
                type="text"
                value={g}
                onChange={(e) => {
                  const next = [...goals];
                  next[i] = e.target.value;
                  setGoals(next);
                }}
                placeholder={t('goalPlaceholder', { n: i + 1 })}
                maxLength={120}
                className="w-full px-3 py-2 rounded-md border border-[var(--border-color)] bg-[var(--surface)] text-sm"
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {phases.map((p, i) => (
              <div key={i} className="border border-[var(--border-color)] rounded-md p-3">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={p.name}
                    onChange={(e) => {
                      const next = [...phases];
                      next[i] = { ...p, name: e.target.value };
                      setPhases(next);
                    }}
                    placeholder={t('phaseNamePlaceholder', { n: i + 1 })}
                    maxLength={80}
                    className="flex-1 px-3 py-2 rounded-md border border-[var(--border-color)] bg-[var(--surface)] text-sm"
                  />
                  {phases.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setPhases(phases.filter((_, idx) => idx !== i))}
                      className="text-[var(--ink-3)] hover:text-[var(--danger)] text-[16px] leading-none px-2"
                      aria-label={t('removePhase')}
                    >
                      ×
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={p.description ?? ''}
                  onChange={(e) => {
                    const next = [...phases];
                    next[i] = { ...p, description: e.target.value };
                    setPhases(next);
                  }}
                  placeholder={t('phaseDescriptionPlaceholder')}
                  maxLength={200}
                  className="w-full px-3 py-2 rounded-md border border-[var(--border-color)] bg-[var(--surface)] text-sm mb-2"
                />
                <div className="flex items-center gap-2 text-[12px]">
                  <label className="text-[var(--ink-3)]">{t('fromWeek')}</label>
                  <input
                    type="number"
                    min={1}
                    max={52}
                    value={p.fromWeek}
                    onChange={(e) => {
                      const next = [...phases];
                      next[i] = { ...p, fromWeek: Math.max(1, Number(e.target.value)) };
                      setPhases(next);
                    }}
                    className="w-16 px-2 py-1 rounded-md border border-[var(--border-color)] bg-[var(--surface)] text-sm"
                  />
                  <label className="text-[var(--ink-3)]">{t('toWeek')}</label>
                  <input
                    type="number"
                    min={1}
                    max={52}
                    value={p.toWeek}
                    onChange={(e) => {
                      const next = [...phases];
                      next[i] = { ...p, toWeek: Math.max(1, Number(e.target.value)) };
                      setPhases(next);
                    }}
                    className="w-16 px-2 py-1 rounded-md border border-[var(--border-color)] bg-[var(--surface)] text-sm"
                  />
                </div>
              </div>
            ))}
            {phases.length < 6 && (
              <button
                type="button"
                onClick={() =>
                  setPhases([
                    ...phases,
                    {
                      name: '',
                      fromWeek: phases[phases.length - 1]?.toWeek + 1 || 1,
                      toWeek: (phases[phases.length - 1]?.toWeek ?? 0) + 4,
                    },
                  ])
                }
                className="text-[13px] text-[var(--brand-700)] hover:underline self-start"
              >
                + {t('addPhase')}
              </button>
            )}
          </div>
        )}

        {error && <p className="text-[13px] text-[var(--danger)] mt-3">{error}</p>}

        <div className="flex items-center justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={pending}
            className="px-3 py-1.5 text-sm text-[var(--ink-2)] hover:text-[var(--ink)]"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="px-3 py-1.5 rounded-md text-sm font-medium bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)] disabled:opacity-60"
          >
            {pending ? t('saving') : t('save')}
          </button>
        </div>
      </div>
    </>
  );
}
