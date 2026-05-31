'use client';

import { useCallback, useState } from 'react';
import { ArrowRight, GripVertical, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { WizardStepsInline } from '@/components/ui/wizard-steps-inline';
import { DraftBanner } from '@/components/ui/draft-banner';
import { BackLink } from '@/components/ui/back-link';
import {
  createProjectAction,
  updateProjectAction,
} from '@/modules/projects/server-actions';
import {
  useAssist,
  AssistButton,
  AssistThinking,
  AssistedTag,
  SuggestDraftPanel,
  ReformulatePanel,
  type AssistErrorCode,
} from '@/components/ai/assist';
import type {
  ReformulateResult,
  SuggestGoalsResult,
  DraftPhasesResult,
} from '@/modules/ai/project-assist';
import type { Project } from '@/db/schema';
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

const today = () => new Date().toISOString().slice(0, 10);

type Mode = 'hybrid' | 'virtual' | 'on-site';
type Phase = { id: string; name: string; description: string; fromWeek: number; toWeek: number };

let _phaseCounter = 0;
function newPhaseId() {
  return `ph-${++_phaseCounter}`;
}

const MODE_VALUES: Mode[] = ['hybrid', 'virtual', 'on-site'];

const ON_SITE_DAY_OPTIONS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const DEFAULT_PHASES: Phase[] = [
  { id: newPhaseId(), name: '', description: '', fromWeek: 1, toWeek: 4 },
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
  const tf = useTranslations('projects.form');
  const tn = useTranslations('projects.new');
  const ta = useTranslations('assist');
  const tw = useTranslations('wizard');
  const isEdit = Boolean(initialProject);

  // Reformulate variant chips + assist failure copy, localized. Errors never
  // block — on any failure the user's text is kept untouched.
  const reformLabels: Record<'balanced' | 'shorter' | 'warmer', string> = {
    balanced: ta('variantBalanced'),
    shorter: ta('variantShorter'),
    warmer: ta('variantWarmer'),
  };
  const assistError = (code: AssistErrorCode): string =>
    code === 'rate_limited'
      ? ta('errorRateLimited')
      : code === 'network'
        ? ta('errorNetwork')
        : ta('errorGeneric');

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
  // Controlled so Reformulate can write back — also seeds the field in edit mode.
  const [brief, setBrief] = useState(initialProject?.brief ?? '');
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
          id: newPhaseId(),
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

  // ---- Inline AI assists (draft -> you accept/edit; never auto-commit) ----
  const descAssist = useAssist<ReformulateResult>('reformulate');
  const goalsAssist = useAssist<SuggestGoalsResult>('goals');
  const phasesAssist = useAssist<DraftPhasesResult>('phases');
  const [descAssisted, setDescAssisted] = useState(false);
  const [goalsAssisted, setGoalsAssisted] = useState(false);
  const [phasesAssisted, setPhasesAssisted] = useState(false);
  const [reformSel, setReformSel] = useState<'balanced' | 'shorter' | 'warmer'>('balanced');

  // `const` data captures keep TS narrowing inside callbacks below.
  const descData = descAssist.state.status === 'ready' ? descAssist.state.data : null;
  const goalsData = goalsAssist.state.status === 'ready' ? goalsAssist.state.data : null;
  const phasesData = phasesAssist.state.status === 'ready' ? phasesAssist.state.data : null;
  const descError = descAssist.state.status === 'error' ? descAssist.state.code : null;
  const goalsError = goalsAssist.state.status === 'error' ? goalsAssist.state.code : null;
  const phasesError = phasesAssist.state.status === 'error' ? phasesAssist.state.code : null;

  const hasGoalRoom = goals.some((g) => g.trim().length === 0);
  const canAddPhase = phases.length < 12;

  async function triggerReformulate() {
    const data = await descAssist.run({ text: brief });
    if (data?.variants[0]) setReformSel(data.variants[0].key);
  }
  function applyReformulation(text: string) {
    setBrief(text);
    setDescAssisted(true);
    descAssist.reset();
  }

  function addGoalDraft(text: string) {
    const slot = goals.findIndex((g) => g.trim().length === 0);
    if (slot === -1) return;
    setGoals(goals.map((g, j) => (j === slot ? text : g)));
    setGoalsAssisted(true);
  }
  function addAllGoals(drafts: string[]) {
    let next = [...goals];
    for (const text of drafts) {
      if (next.some((g) => g.trim() === text.trim())) continue;
      const slot = next.findIndex((g) => g.trim().length === 0);
      if (slot === -1) break;
      next = next.map((g, j) => (j === slot ? text : g));
    }
    setGoals(next);
    setGoalsAssisted(true);
  }

  function addPhaseDraft(p: DraftPhasesResult['phases'][number]) {
    if (phases.length >= 12) return;
    setPhases([
      ...phases,
      { id: newPhaseId(), name: p.name, description: p.description ?? '', fromWeek: p.fromWeek, toWeek: p.toWeek },
    ]);
    setPhasesAssisted(true);
  }
  function addAllPhases(drafts: DraftPhasesResult['phases']) {
    const room = 12 - phases.length;
    const toAdd = drafts
      .filter(
        (d) => !phases.some((p) => p.name === d.name && p.fromWeek === d.fromWeek && p.toWeek === d.toWeek),
      )
      .slice(0, room);
    if (toAdd.length === 0) return;
    setPhases([
      ...phases,
      ...toAdd.map((d) => ({
        id: newPhaseId(),
        name: d.name,
        description: d.description ?? '',
        fromWeek: d.fromWeek,
        toWeek: d.toWeek,
      })),
    ]);
    setPhasesAssisted(true);
  }

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
    setPhases([...phases, { id: newPhaseId(), name: '', description: '', fromWeek: from, toWeek: Math.min(from + 2, duration) }]);
  }

  function removePhase(i: number) {
    setPhases(phases.filter((_, j) => j !== i));
  }

  const phaseSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onPhaseDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      setPhases((prev) => {
        const oldIndex = prev.findIndex((p) => p.id === active.id);
        const newIndex = prev.findIndex((p) => p.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return prev;
        return arrayMove(prev, oldIndex, newIndex);
      });
    },
    [],
  );

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
      <BackLink
        href={isEdit ? `/company/projects/${initialProject!.id}` : '/company/projects'}
      >
        {isEdit ? t('backToProject') : t('backToProjects')}
      </BackLink>

      {!isEdit && (
        <DraftBanner
          title={tn('draftBannerTitle')}
          message={tn('draftBannerMessage')}
        />
      )}

      <WizardStepsInline
        steps={
          isEdit
            ? [
                { id: 'basics', label: tw('basics') },
                { id: 'goals', label: tw('goalsPhases') },
                { id: 'review', label: tw('review') },
              ]
            : [
                // Create flows straight into posting the first internship, so
                // the bar spans all five steps — Review hands off to step 4.
                { id: 'basics', label: tw('basics') },
                { id: 'goals', label: tw('goalsPhases') },
                { id: 'review', label: tw('review') },
                { id: 'role', label: tw('roleSkills') },
                { id: 'deliverables', label: tw('deliverablesPublish') },
              ]
        }
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
          <h2 className="text-title text-[var(--ink)]">
            {isEdit ? t('heading') : tn('heading')}
          </h2>
          <p className="text-body text-[var(--ink-3)] mt-1">
            {isEdit ? t('subheading') : tn('subheading')}
          </p>
        </header>

        <div>
          <Label htmlFor="name">
            {tf('nameLabel')} <span className="text-[var(--danger)]">{tf('req')}</span>
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
            placeholder={tf('namePlaceholder')}
            required
          />
          <p className="text-caption text-[var(--ink-3)] mt-1">
            {tf('nameHint')}
          </p>
        </div>

        <div>
          <Label htmlFor="slug">
            {tf('slugLabel')} <span className="text-[var(--danger)]">{tf('req')}</span>
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
          <p className="text-caption text-[var(--ink-3)] mt-1">
            {tf('slugHint')}
          </p>
        </div>

        <div>
          <div className="sc-label-row">
            <Label htmlFor="brief">
              {tf('briefLabel')} <span className="text-[var(--danger)]">{tf('req')}</span>
            </Label>
            <span className="sc-spacer" />
            {descAssisted && <AssistedTag />}
            <AssistButton
              label={ta('reformulate')}
              onClick={triggerReformulate}
              loading={descAssist.state.status === 'loading'}
              disabled={brief.trim().length < 10}
              title={ta('reformulateHint')}
            />
          </div>
          <Textarea
            id="brief"
            name="brief"
            rows={4}
            maxLength={2000}
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder={tf('briefPlaceholder')}
            required
          />
          {descAssist.state.status === 'loading' && <AssistThinking />}
          {descData && (
            <ReformulatePanel
              variants={descData.variants.map((v) => ({
                key: v.key,
                label: reformLabels[v.key],
                text: v.text,
              }))}
              selected={reformSel}
              onSelect={(k) => setReformSel(k as 'balanced' | 'shorter' | 'warmer')}
              onUse={applyReformulation}
              onDismiss={descAssist.reset}
            />
          )}
          {descError && (
            <p className="text-caption text-[var(--danger)] mt-1.5">
              {assistError(descError)}
            </p>
          )}
          <p className="text-caption text-[var(--ink-3)] mt-1">
            {tf('briefHint')}
          </p>
        </div>

        <div>
          <Label>
            {tf('modeLabel')} <span className="text-[var(--danger)]">{tf('req')}</span>
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1.5">
            {MODE_VALUES.map((value) => {
              const selected = mode === value;
              return (
                <label
                  key={value}
                  className={
                    selected
                      ? 'rounded-md p-3 cursor-pointer bg-[var(--surface-muted)] border-2 border-[var(--ink)]'
                      : 'rounded-md p-3 cursor-pointer bg-[var(--surface)] border border-[var(--border-color)] hover:border-[var(--border-strong)] transition-colors'
                  }
                >
                  <input
                    type="radio"
                    name="mode-picker"
                    value={value}
                    checked={selected}
                    onChange={() => setMode(value)}
                    className="sr-only"
                  />
                  <b className="block text-label font-semibold text-[var(--ink)] mb-0.5">
                    {tf(`mode.${value}.label`)}
                  </b>
                  <span className="text-caption text-[var(--ink-3)]">{tf(`mode.${value}.sub`)}</span>
                </label>
              );
            })}
          </div>
        </div>

        {mode !== 'virtual' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="location-input">{tf('locationLabel')}</Label>
              <Input
                id="location-input"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={tf('locationPlaceholder')}
              />
              <p className="text-caption text-[var(--ink-3)] mt-1">
                {tf('locationHint')}
              </p>
            </div>
            <div>
              <Label>{tf('onSiteDaysLabel')}</Label>
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
                          ? 'px-3 py-1.5 rounded-md text-label bg-[var(--ink)] text-white border border-[var(--ink)]'
                          : 'px-3 py-1.5 rounded-md text-label bg-[var(--surface)] text-[var(--ink-2)] border border-[var(--border-color)] hover:border-[var(--border-strong)]'
                      }
                    >
                      {tf(`day.${day}`)}
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
              {tf('startDateLabel')} <span className="text-[var(--danger)]">{tf('req')}</span>
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
              {tf('durationLabel')} <span className="text-[var(--danger)]">{tf('req')}</span>
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
            <p className="text-caption text-[var(--ink-3)] mt-1">
              {tf('durationHint', { endDate })}
            </p>
            <input type="hidden" name="endDate" value={endDate} />
          </div>
        </div>
      </section>

      {/* ---- Section: Goals + phases -------------------------------- */}
      <section id="goals" className="space-y-6 scroll-mt-24 pt-2 border-t border-[var(--border-color)]">
        <header className="pt-6">
          <h2 className="text-title text-[var(--ink)]">
            {tf('goalsHeading')}
          </h2>
          <p className="text-body text-[var(--ink-3)] mt-1">
            {tf('goalsIntro')}
          </p>
        </header>

        <div>
          <div className="sc-label-row">
            <Label>
              {tf('goalsLabel')}{' '}
              <span className="text-[var(--ink-3)] font-normal">
                {tf('goalsUsed', { filled: goalsFilled })}
              </span>
            </Label>
            <span className="sc-spacer" />
            {goalsAssisted && <AssistedTag />}
            <AssistButton
              label={ta('suggestGoals')}
              onClick={() => goalsAssist.run({ name, brief, duration })}
              loading={goalsAssist.state.status === 'loading'}
              disabled={name.trim().length === 0}
              title={ta('suggestGoalsHint')}
            />
          </div>
          <div className="flex flex-col gap-2 mt-1.5">
            {goals.map((g, i) => (
              <Input
                key={i}
                value={g}
                onChange={(e) => updateGoal(i, e.target.value)}
                placeholder={
                  i === 0
                    ? tf('goalPlaceholder1')
                    : i === 1
                      ? tf('goalPlaceholder2')
                      : tf('goalPlaceholder3')
                }
                maxLength={120}
                aria-label={tf('goalAria', { n: i + 1 })}
              />
            ))}
          </div>
          <p className="text-caption text-[var(--ink-3)] mt-1.5">
            {tf('goalsHint')}
          </p>
          {goalsAssist.state.status === 'loading' && <AssistThinking />}
          {goalsData && (
            <SuggestDraftPanel
              title={ta('suggestedGoals')}
              drafts={goalsData.goals.map((g) => ({ t: g }))}
              used={goalsData.goals.map((g) => goals.some((x) => x.trim() === g.trim()))}
              canAddMore={hasGoalRoom}
              onAdd={(i) => addGoalDraft(goalsData.goals[i])}
              onAddAll={() => addAllGoals(goalsData.goals)}
              onDismiss={goalsAssist.reset}
            />
          )}
          {goalsError && (
            <p className="text-caption text-[var(--danger)] mt-1.5">
              {assistError(goalsError)}
            </p>
          )}
        </div>

        <div className="relative">
          <div aria-hidden className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--border-color)]" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-[var(--background)] px-2 text-eyebrow uppercase font-mono text-[var(--ink-3)]">
              {tf('thenOptional')}
            </span>
          </div>
        </div>

        <div>
          <div className="sc-label-row">
            <h3 className="text-heading text-[var(--ink)]">{tf('phasesHeading')}</h3>
            <span className="sc-spacer" />
            {phasesAssisted && <AssistedTag />}
            <AssistButton
              label={ta('draftPhases')}
              onClick={() => phasesAssist.run({ name, brief, duration })}
              loading={phasesAssist.state.status === 'loading'}
              disabled={name.trim().length === 0}
              title={ta('draftPhasesHint')}
            />
          </div>
          <p className="text-caption text-[var(--ink-3)] mt-1 mb-3">
            {tf('phasesIntro')}
          </p>

          <DndContext
            sensors={phaseSensors}
            collisionDetection={closestCenter}
            onDragEnd={onPhaseDragEnd}
          >
            <SortableContext
              items={phases.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1.5">
                {phases.map((p, i) => (
                  <SortablePhaseRow
                    key={p.id}
                    phase={p}
                    index={i}
                    duration={duration}
                    reorderLabel={t('reorderPhase')}
                    onUpdate={(patch) => updatePhase(i, patch)}
                    onRemove={() => removePhase(i)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={addPhase}
              disabled={phases.length >= 12}
              className="text-label text-[var(--brand-600)] hover:text-[var(--brand-700)] disabled:text-[var(--ink-4)]"
            >
              {tf('addPhase')}
            </button>
            <span className="text-caption text-[var(--ink-3)]">{tf('skipSection')}</span>
          </div>

          {phasesAssist.state.status === 'loading' && <AssistThinking />}
          {phasesData && (
            <SuggestDraftPanel
              title={ta('draftedPhases')}
              drafts={phasesData.phases.map((p) => ({
                t: p.name,
                d: p.description,
                meta: ta('phaseWeekRange', { from: p.fromWeek, to: p.toWeek }),
              }))}
              used={phasesData.phases.map((p) =>
                phases.some(
                  (x) => x.name === p.name && x.fromWeek === p.fromWeek && x.toWeek === p.toWeek,
                ),
              )}
              canAddMore={canAddPhase}
              onAdd={(i) => addPhaseDraft(phasesData.phases[i])}
              onAddAll={() => addAllPhases(phasesData.phases)}
              onDismiss={phasesAssist.reset}
            />
          )}
          {phasesError && (
            <p className="text-caption text-[var(--danger)] mt-1.5">
              {assistError(phasesError)}
            </p>
          )}
        </div>
      </section>

      {/* ---- Section: Review ---------------------------------------- */}
      <section id="review" className="space-y-4 scroll-mt-24 pt-2 border-t border-[var(--border-color)]">
        <header className="pt-6">
          <h2 className="text-title text-[var(--ink)]">
            {t('reviewHeading')}
          </h2>
          <p className="text-body text-[var(--ink-3)] mt-1">
            {isEdit ? t('reviewSubheading') : tn('reviewSubheading')}
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
            <span className="text-caption text-[var(--ink-3)]">{t('saveHint')}</span>
          </div>
        ) : (
          <div className="rounded-lg p-5 bg-[var(--status-warn-bg)] border border-[color-mix(in_srgb,var(--status-warn-ink)_30%,transparent)]">
            <h3 className="text-heading text-[var(--status-warn-ink)]">
              {tn('ctaNextTitle')}
            </h3>
            <p className="text-caption text-[var(--status-warn-ink)] leading-relaxed mt-1.5 mb-3 max-w-[56ch]">
              {tn.rich('ctaNextBody', { b: (chunks) => <b>{chunks}</b> })}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="submit"
                className="bg-[var(--brand-500)] hover:bg-[var(--brand-600)] text-white"
              >
                {tn('ctaSave')}
                <ArrowRight size={15} strokeWidth={2.25} aria-hidden />
              </Button>
              <span className="text-caption text-[var(--status-warn-ink)]">
                {tn('ctaSaveHint')}
              </span>
            </div>
          </div>
        )}
      </section>
    </form>
  );
}

// ---- SortablePhaseRow -------------------------------------------------------
// Hoisted outside ProjectCreateForm so React sees a stable component identity.

type SortablePhaseRowProps = {
  phase: Phase;
  index: number;
  duration: number;
  reorderLabel: string;
  onUpdate: (patch: Partial<Phase>) => void;
  onRemove: () => void;
};

function SortablePhaseRow({ phase, index, duration, reorderLabel, onUpdate, onRemove }: SortablePhaseRowProps) {
  const tf = useTranslations('projects.form');
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: phase.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  const namePlaceholder =
    index === 0
      ? tf('phaseNamePlaceholder0')
      : index === 1
        ? tf('phaseNamePlaceholder1')
        : index === 2
          ? tf('phaseNamePlaceholder2')
          : tf('phaseNamePlaceholder3');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="grid grid-cols-[24px_minmax(0,1fr)_70px_70px_28px] gap-2 items-center p-2 border border-[var(--border-color)] rounded-md bg-[var(--surface)]"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="text-[var(--ink-4)] cursor-grab active:cursor-grabbing flex items-center justify-center h-8 touch-none"
        aria-label={reorderLabel}
        aria-roledescription="sortable phase"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="space-y-1 min-w-0">
        <Input
          value={phase.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder={namePlaceholder}
          aria-label={tf('phaseNameAria')}
          className="h-8 text-[13px] font-medium"
        />
        <Input
          value={phase.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder={tf('phaseDescPlaceholder')}
          aria-label={tf('phaseDescAria')}
          className="h-7 text-caption text-[var(--ink-3)]"
        />
      </div>
      <Input
        type="number"
        min={1}
        max={duration}
        value={phase.fromWeek}
        onChange={(e) =>
          onUpdate({
            fromWeek: Math.max(1, Math.min(duration, Number(e.target.value) || 1)),
          })
        }
        aria-label={tf('fromWeekAria')}
        className="h-8 text-[12px] text-center"
      />
      <Input
        type="number"
        min={1}
        max={duration}
        value={phase.toWeek}
        onChange={(e) =>
          onUpdate({
            toWeek: Math.max(1, Math.min(duration, Number(e.target.value) || 1)),
          })
        }
        aria-label={tf('toWeekAria')}
        className="h-8 text-[12px] text-center"
      />
      <button
        type="button"
        onClick={onRemove}
        className="flex items-center justify-center text-[var(--ink-4)] hover:text-[var(--ink-2)] h-8"
        aria-label={tf('removePhase')}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// Hoisted out of `SummaryCard` so React doesn't see them as new component
// types on each render (which would reset their internal state — see
// react-hooks/static-components lint rule).
function SummaryRow({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-4 items-baseline">
      <div className="text-eyebrow font-mono uppercase text-[var(--ink-3)]">
        {k}
      </div>
      <div className="text-body text-[var(--ink)] leading-relaxed">{children}</div>
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
  const tf = useTranslations('projects.form');
  return (
    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-muted)] p-5 flex flex-col gap-4">
      <SummaryRow k={tf('summaryName')}>
        <b className="font-semibold">
          {name || <span className="text-[var(--ink-4)]">{tf('summaryNotSet')}</span>}
        </b>
      </SummaryRow>
      <SummaryRow k={tf('summaryMode')}>
        <SummaryPill>{tf(`mode.${mode}.label`).toUpperCase()}</SummaryPill>
        {location && mode !== 'virtual' ? (
          <SummaryPill>{location.toUpperCase()}</SummaryPill>
        ) : null}
        {mode !== 'virtual' && onSiteDays.length ? (
          <SummaryPill>{onSiteDays.map((d) => tf(`day.${d}`)).join(' · ').toUpperCase()}</SummaryPill>
        ) : null}
      </SummaryRow>
      <SummaryRow k={tf('summarySchedule')}>
        <b className="font-semibold">
          {tf('scheduleRange', { start: startDate, end: endDate })}
        </b>{' '}
        {tf('summaryDuration', { n: duration })}
      </SummaryRow>
      <div className="h-px bg-[var(--border-color)]" />
      <SummaryRow k={tf('summaryGoals')}>
        {goals.length ? (
          <ul className="space-y-0.5">
            {goals.map((g, i) => (
              <li key={i}>{tf('summaryGoalItem', { goal: g })}</li>
            ))}
          </ul>
        ) : (
          <span className="text-[var(--ink-4)]">{tf('summaryNoneYet')}</span>
        )}
      </SummaryRow>
      <SummaryRow k={tf('summaryPhases')}>
        {phases.length ? (
          <div className="flex flex-wrap">
            {phases.map((p, i) => (
              <SummaryPill key={i}>
                {tf('summaryPhasePill', { name: p.name.toUpperCase(), from: p.fromWeek, to: p.toWeek })}
              </SummaryPill>
            ))}
          </div>
        ) : (
          <span className="text-[var(--ink-4)]">{tf('summarySkipped')}</span>
        )}
      </SummaryRow>
    </div>
  );
}
