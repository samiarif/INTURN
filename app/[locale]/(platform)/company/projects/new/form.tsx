'use client';

import { useState } from 'react';
import { GripVertical, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { WizardStepsInline } from '@/components/ui/wizard-steps-inline';
import { DraftBanner } from '@/components/ui/draft-banner';
import {
  createProjectAction,
  updateProjectAction,
} from '@/modules/projects/server-actions';
import type { Project } from '@/db/schema';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

const today = () => new Date().toISOString().slice(0, 10);

type Mode = 'hybrid' | 'virtual' | 'on-site';
type Phase = { name: string; description: string; fromWeek: number; toWeek: number };

const MODE_OPTIONS: Array<{ value: Mode; label: string; sub: string }> = [
  { value: 'hybrid', label: 'Hybrid', sub: 'On-site + remote' },
  { value: 'virtual', label: 'Remote', sub: 'Fully distributed' },
  { value: 'on-site', label: 'On-site', sub: 'Office every day' },
];

const ON_SITE_DAY_OPTIONS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const DEFAULT_PHASES: Phase[] = [
  { name: '', description: '', fromWeek: 1, toWeek: 4 },
];

const MS_PER_WEEK = 1000 * 60 * 60 * 24 * 7;

/** Whole weeks between two ISO date strings, clamped to the form's 4–52 range. */
function weeksBetween(start?: string | null, end?: string | null): number | null {
  if (!start || !end) return null;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (Number.isNaN(s) || Number.isNaN(e) || e <= s) return null;
  return Math.max(4, Math.min(52, Math.round((e - s) / MS_PER_WEEK)));
}

export function ProjectCreateForm({ initialProject }: { initialProject?: Project }) {
  const t = useTranslations('projects.edit');
  const isEdit = Boolean(initialProject);

  // Goals/phases persist on the project row; mode/location/onSiteDays/duration
  // are create-form-only fields that aren't stored, so in edit mode we seed
  // the persisted fields and leave the rest at their defaults (duration is
  // re-derived from the saved start/end dates).
  const seededGoals = (() => {
    const g = (initialProject?.goals ?? []).slice(0, 3);
    return [...g, '', '', ''].slice(0, Math.max(3, g.length));
  })();

  const [name, setName] = useState(initialProject?.name ?? '');
  const [slug, setSlug] = useState(initialProject?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(Boolean(initialProject));
  const [mode, setMode] = useState<Mode>('hybrid');
  const [location, setLocation] = useState('');
  const [onSiteDays, setOnSiteDays] = useState<string[]>(['Mon', 'Tue', 'Wed']);
  const [duration, setDuration] = useState(
    weeksBetween(initialProject?.startDate, initialProject?.endDate) ?? 12,
  );
  const [startDate, setStartDate] = useState(initialProject?.startDate ?? today());
  const [goals, setGoals] = useState<string[]>(isEdit ? seededGoals : ['', '', '']);
  const [phases, setPhases] = useState<Phase[]>(
    initialProject?.phases && initialProject.phases.length > 0
      ? initialProject.phases.map((p) => ({
          name: p.name,
          description: p.description ?? '',
          fromWeek: p.fromWeek,
          toWeek: p.toWeek,
        }))
      : DEFAULT_PHASES,
  );

  const goalsFilled = goals.filter((g) => g.trim().length > 0).length;
  const endDate = (() => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + duration * 7);
    return d.toISOString().slice(0, 10);
  })();

  function toggleDay(day: string) {
    setOnSiteDays((cur) =>
      cur.includes(day) ? cur.filter((d) => d !== day) : [...cur, day],
    );
  }

  function updateGoal(i: number, value: string) {
    setGoals(goals.map((g, j) => (j === i ? value : g)));
  }

  function updatePhase(i: number, patch: Partial<Phase>) {
    setPhases(phases.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  }

  function addPhase() {
    if (phases.length >= 12) return;
    const last = phases[phases.length - 1];
    const from = last ? Math.min(last.toWeek, duration) : 1;
    setPhases([...phases, { name: '', description: '', fromWeek: from, toWeek: Math.min(from + 2, duration) }]);
  }

  function removePhase(i: number) {
    setPhases(phases.filter((_, j) => j !== i));
  }

  // Goals + phases JSON-encoded into hidden inputs so the existing
  // FormData-driven server action stays simple.
  const goalsPayload = goals.map((g) => g.trim()).filter((g) => g.length > 0);
  const phasesPayload = phases
    .filter((p) => p.name.trim().length > 0)
    .map((p) => ({
      name: p.name.trim(),
      description: p.description.trim() || undefined,
      fromWeek: p.fromWeek,
      toWeek: p.toWeek,
    }));

  const formAction = isEdit
    ? updateProjectAction.bind(null, initialProject!.id)
    : createProjectAction;

  return (
    <form action={formAction} className="space-y-8">
      {!isEdit && (
        <DraftBanner
          title="Draft mode"
          message="this project stays private until you publish your first internship."
        />
      )}

      <WizardStepsInline
        steps={[
          { id: 'basics', label: 'Basics' },
          { id: 'goals', label: 'Goals & phases' },
          { id: 'review', label: 'Review' },
        ]}
        active="basics"
      />

      <input type="hidden" name="goals" value={JSON.stringify(goalsPayload)} />
      <input type="hidden" name="phases" value={JSON.stringify(phasesPayload)} />
      <input type="hidden" name="locationType" value={mode} />
      <input type="hidden" name="location" value={mode === 'virtual' ? '' : location} />
      <input
        type="hidden"
        name="onSiteDays"
        value={mode === 'virtual' ? '' : onSiteDays.join(',')}
      />
      <input type="hidden" name="duration" value={duration} />

      {/* ---- Section: Basics ---------------------------------------- */}
      <section id="basics" className="space-y-6 scroll-mt-24">
        <header>
          <h2 className="text-[22px] font-semibold tracking-tight text-[var(--ink)]">
            {isEdit ? t('heading') : 'Create a new project'}
          </h2>
          <p className="text-[14px] text-[var(--ink-3)] mt-1">
            {isEdit
              ? t('subheading')
              : 'Projects group your internships. One project = one piece of work; one or more interns work on it together in their own workspaces.'}
          </p>
        </header>

        <div>
          <Label htmlFor="name">
            Project name <span className="text-[var(--danger)]">*</span>
          </Label>
          <Input
            id="name"
            name="name"
            value={name}
            onChange={(e) => {
              const next = e.target.value;
              setName(next);
              if (!slugTouched) setSlug(slugify(next));
            }}
            placeholder="Brand audit & system refresh"
            required
          />
          <p className="text-[12px] text-[var(--ink-3)] mt-1">
            Visible internally and to applicants once internships go live.
          </p>
        </div>

        <div>
          <Label htmlFor="slug">
            URL slug <span className="text-[var(--danger)]">*</span>
          </Label>
          <Input
            id="slug"
            name="slug"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugTouched(true);
            }}
            pattern="[a-z0-9-]+"
            required
          />
          <p className="text-[12px] text-[var(--ink-3)] mt-1">
            Used in URLs. Lowercase letters, digits, hyphens only.
          </p>
        </div>

        <div>
          <Label htmlFor="brief">
            Short description <span className="text-[var(--danger)]">*</span>
          </Label>
          <Textarea
            id="brief"
            name="brief"
            rows={4}
            maxLength={2000}
            placeholder="A full-funnel audit of Acme's brand and a refreshed system delivered as Figma library + guidelines. Designed for two parallel interns over 12 weeks."
            required
          />
          <p className="text-[12px] text-[var(--ink-3)] mt-1">
            2–3 sentences. This becomes the brief at the top of every workspace under this
            project.
          </p>
        </div>

        <div>
          <Label>
            Mode <span className="text-[var(--danger)]">*</span>
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1.5">
            {MODE_OPTIONS.map((opt) => {
              const selected = mode === opt.value;
              return (
                <label
                  key={opt.value}
                  className={
                    selected
                      ? 'rounded-md p-3 cursor-pointer bg-[var(--surface-muted)] border-2 border-[var(--ink)]'
                      : 'rounded-md p-3 cursor-pointer bg-[var(--surface)] border border-[var(--border-color)] hover:border-[var(--border-strong)] transition-colors'
                  }
                >
                  <input
                    type="radio"
                    name="mode-picker"
                    value={opt.value}
                    checked={selected}
                    onChange={() => setMode(opt.value)}
                    className="sr-only"
                  />
                  <b className="block text-[13px] font-semibold text-[var(--ink)] mb-0.5">
                    {opt.label}
                  </b>
                  <span className="text-[11.5px] text-[var(--ink-3)]">{opt.sub}</span>
                </label>
              );
            })}
          </div>
        </div>

        {mode !== 'virtual' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="location-input">Location</Label>
              <Input
                id="location-input"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Tunis · Lac 2"
              />
              <p className="text-[12px] text-[var(--ink-3)] mt-1">
                Hybrid &amp; on-site projects only.
              </p>
            </div>
            <div>
              <Label>On-site days</Label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {ON_SITE_DAY_OPTIONS.map((day) => {
                  const selected = onSiteDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={
                        selected
                          ? 'px-3 py-1.5 rounded-md text-[12.5px] font-medium bg-[var(--ink)] text-white border border-[var(--ink)]'
                          : 'px-3 py-1.5 rounded-md text-[12.5px] font-medium bg-[var(--surface)] text-[var(--ink-2)] border border-[var(--border-color)] hover:border-[var(--border-strong)]'
                      }
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="startDate">
              Start date <span className="text-[var(--danger)]">*</span>
            </Label>
            <Input
              id="startDate"
              name="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="duration-input">
              Duration (weeks) <span className="text-[var(--danger)]">*</span>
            </Label>
            <Input
              id="duration-input"
              type="number"
              min={4}
              max={52}
              value={duration}
              onChange={(e) => setDuration(Math.max(4, Math.min(52, Number(e.target.value) || 12)))}
              required
            />
            <p className="text-[12px] text-[var(--ink-3)] mt-1">
              Internships can run shorter, never longer. Ends {endDate}.
            </p>
            <input type="hidden" name="endDate" value={endDate} />
          </div>
        </div>
      </section>

      {/* ---- Section: Goals + phases -------------------------------- */}
      <section id="goals" className="space-y-6 scroll-mt-24 pt-2 border-t border-[var(--border-color)]">
        <header className="pt-6">
          <h2 className="text-[22px] font-semibold tracking-tight text-[var(--ink)]">
            What does success look like?
          </h2>
          <p className="text-[14px] text-[var(--ink-3)] mt-1">
            3 short statements. These appear in every workspace under this project — interns
            read them on day 1, supervisors revisit them at every check-in.
          </p>
        </header>

        <div>
          <Label>
            Project goals{' '}
            <span className="text-[var(--ink-3)] font-normal">
              · {goalsFilled} of 3 used
            </span>
          </Label>
          <div className="flex flex-col gap-2 mt-1.5">
            {goals.map((g, i) => (
              <Input
                key={i}
                value={g}
                onChange={(e) => updateGoal(i, e.target.value)}
                placeholder={
                  i === 0
                    ? 'Clarity of position — a stakeholder-validated story in one paragraph.'
                    : i === 1
                      ? 'System, not assets — refresh ships as a token-backed Figma library.'
                      : 'Handoff that lasts — guidelines a junior can apply day one without us.'
                }
                maxLength={120}
                aria-label={`Goal ${i + 1}`}
              />
            ))}
          </div>
          <p className="text-[12px] text-[var(--ink-3)] mt-1.5">
            Limit is 3. If you can&apos;t say it in 3, you don&apos;t know it yet.
          </p>
        </div>

        <div className="relative">
          <div aria-hidden className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--border-color)]" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-[var(--background)] px-2 text-[10.5px] uppercase tracking-wider font-mono text-[var(--ink-3)]">
              then · optional
            </span>
          </div>
        </div>

        <div>
          <h3 className="text-[16px] font-semibold tracking-tight text-[var(--ink)]">
            Project phases
          </h3>
          <p className="text-[13px] text-[var(--ink-3)] mt-1 mb-3">
            Sketch the project arc. You can edit or skip — the Hub&apos;s phase strip uses
            these to show progress.
          </p>

          <div className="space-y-1.5">
            {phases.map((p, i) => (
              <div
                key={i}
                className="grid grid-cols-[24px_minmax(0,1fr)_70px_70px_28px] gap-2 items-center p-2 border border-[var(--border-color)] rounded-md bg-[var(--surface)]"
              >
                <button
                  type="button"
                  className="text-[var(--ink-4)] cursor-grab flex items-center justify-center h-8"
                  aria-label="Reorder phase"
                  title="Drag to reorder (coming soon)"
                >
                  <GripVertical className="h-4 w-4" />
                </button>
                <div className="space-y-1 min-w-0">
                  <Input
                    value={p.name}
                    onChange={(e) => updatePhase(i, { name: e.target.value })}
                    placeholder={
                      i === 0
                        ? 'Discovery & audit'
                        : i === 1
                          ? 'Explore & moodboard'
                          : i === 2
                            ? 'System build'
                            : 'Handoff'
                    }
                    aria-label="Phase name"
                    className="h-8 text-[13px] font-medium"
                  />
                  <Input
                    value={p.description}
                    onChange={(e) => updatePhase(i, { description: e.target.value })}
                    placeholder="Short note (optional)"
                    aria-label="Phase description"
                    className="h-7 text-[12px] text-[var(--ink-3)]"
                  />
                </div>
                <Input
                  type="number"
                  min={1}
                  max={duration}
                  value={p.fromWeek}
                  onChange={(e) =>
                    updatePhase(i, {
                      fromWeek: Math.max(1, Math.min(duration, Number(e.target.value) || 1)),
                    })
                  }
                  aria-label="From week"
                  className="h-8 text-[12px] text-center"
                />
                <Input
                  type="number"
                  min={1}
                  max={duration}
                  value={p.toWeek}
                  onChange={(e) =>
                    updatePhase(i, {
                      toWeek: Math.max(1, Math.min(duration, Number(e.target.value) || 1)),
                    })
                  }
                  aria-label="To week"
                  className="h-8 text-[12px] text-center"
                />
                <button
                  type="button"
                  onClick={() => removePhase(i)}
                  className="flex items-center justify-center text-[var(--ink-4)] hover:text-[var(--ink-2)] h-8"
                  aria-label="Remove phase"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={addPhase}
              disabled={phases.length >= 12}
              className="text-[12.5px] font-medium text-[var(--brand-600)] hover:text-[var(--brand-700)] disabled:text-[var(--ink-4)]"
            >
              + Add phase
            </button>
            <span className="text-[12px] text-[var(--ink-3)]">· Skip this section</span>
          </div>
        </div>
      </section>

      {/* ---- Section: Review ---------------------------------------- */}
      <section id="review" className="space-y-4 scroll-mt-24 pt-2 border-t border-[var(--border-color)]">
        <header className="pt-6">
          <h2 className="text-[22px] font-semibold tracking-tight text-[var(--ink)]">
            {isEdit ? t('reviewHeading') : 'Ready to save?'}
          </h2>
          <p className="text-[14px] text-[var(--ink-3)] mt-1">
            {isEdit
              ? t('reviewSubheading')
              : 'The project goes live the moment you post your first internship — until then, nobody outside your org sees it.'}
          </p>
        </header>

        <SummaryCard
          name={name}
          mode={mode}
          location={location}
          onSiteDays={onSiteDays}
          duration={duration}
          startDate={startDate}
          endDate={endDate}
          goals={goalsPayload}
          phases={phasesPayload}
        />

        {isEdit ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              className="bg-[var(--brand-500)] hover:bg-[var(--brand-600)] text-white"
            >
              {t('saveCta')}
            </Button>
            <span className="text-[12px] text-[var(--ink-3)]">{t('saveHint')}</span>
          </div>
        ) : (
          <div className="rounded-lg p-5 bg-gradient-to-br from-[#FFFBEB] to-[#FEF3C7] border border-[#FDE68A]">
            <h3 className="text-[15px] font-semibold text-[#78350F]">
              Next: post your first internship
            </h3>
            <p className="text-[13px] text-[#92400E] leading-relaxed mt-1.5 mb-3 max-w-[56ch]">
              The project becomes <b>active</b> the moment your first internship is published. A
              draft with no internships <b>auto-archives after 30 days</b>.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="submit"
                className="bg-[var(--brand-500)] hover:bg-[var(--brand-600)] text-white"
              >
                Save &amp; post first internship →
              </Button>
              <span className="text-[12px] text-[#92400E]">
                Saves a draft and takes you to step 5.
              </span>
            </div>
          </div>
        )}
      </section>
    </form>
  );
}

// Hoisted out of `SummaryCard` so React doesn't see them as new component
// types on each render (which would reset their internal state — see
// react-hooks/static-components lint rule).
function SummaryRow({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-4 items-baseline">
      <div className="font-mono uppercase tracking-wider text-[10.5px] text-[var(--ink-3)]">
        {k}
      </div>
      <div className="text-[13.5px] text-[var(--ink)] leading-relaxed">{children}</div>
    </div>
  );
}

function SummaryPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block px-2 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--border-color)] font-mono text-[10.5px] text-[var(--ink-2)] mr-1 mb-1">
      {children}
    </span>
  );
}

function SummaryCard({
  name,
  mode,
  location,
  onSiteDays,
  duration,
  startDate,
  endDate,
  goals,
  phases,
}: {
  name: string;
  mode: Mode;
  location: string;
  onSiteDays: string[];
  duration: number;
  startDate: string;
  endDate: string;
  goals: string[];
  phases: Array<{ name: string; description?: string; fromWeek: number; toWeek: number }>;
}) {
  return (
    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-muted)] p-5 flex flex-col gap-4">
      <SummaryRow k="Name">
        <b className="font-semibold">
          {name || <span className="text-[var(--ink-4)]">(not set)</span>}
        </b>
      </SummaryRow>
      <SummaryRow k="Mode">
        <SummaryPill>{mode.toUpperCase()}</SummaryPill>
        {location && mode !== 'virtual' ? (
          <SummaryPill>{location.toUpperCase()}</SummaryPill>
        ) : null}
        {mode !== 'virtual' && onSiteDays.length ? (
          <SummaryPill>{onSiteDays.join(' · ').toUpperCase()}</SummaryPill>
        ) : null}
      </SummaryRow>
      <SummaryRow k="Schedule">
        <b className="font-semibold">
          {startDate} → {endDate}
        </b>{' '}
        · {duration} weeks
      </SummaryRow>
      <div className="h-px bg-[var(--border-color)]" />
      <SummaryRow k="Goals">
        {goals.length ? (
          <ul className="space-y-0.5">
            {goals.map((g, i) => (
              <li key={i}>· {g}</li>
            ))}
          </ul>
        ) : (
          <span className="text-[var(--ink-4)]">(none yet)</span>
        )}
      </SummaryRow>
      <SummaryRow k="Phases">
        {phases.length ? (
          <div className="flex flex-wrap">
            {phases.map((p, i) => (
              <SummaryPill key={i}>
                {p.name.toUpperCase()} · WK {p.fromWeek}-{p.toWeek}
              </SummaryPill>
            ))}
          </div>
        ) : (
          <span className="text-[var(--ink-4)]">(skipped)</span>
        )}
      </SummaryRow>
    </div>
  );
}
