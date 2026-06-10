'use client';

/**
 * SprintsSection — company-facing sprint management for a single project.
 *
 * Features:
 *  - List sprints in order with name, goal, task count
 *  - Inline edit (name + goal) → updateSprintAction
 *  - Delete sprint → deleteSprintAction
 *  - Move up / move down → reorderSprintsAction
 *  - Add sprint (inline form) → createSprintAction
 *  - Generate plan with AI → POST /api/ai/project-assist { kind:'sprint-plan' }
 *    → editable review list → Accept → applySprintPlanAction
 *  - Per-sprint "Brainstorm tasks" → POST { kind:'sprint-tasks' }
 *    → editable task list → Save → setSprintTasksAction
 *  - Manual task blueprint editor on each sprint
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChevronUp, ChevronDown, Pencil, Trash2, ListChecks, Plus, X, Sparkles } from 'lucide-react';
import type { ProjectSprint, SprintTaskBlueprint } from '@/db/schema';
import {
  createSprintAction,
  updateSprintAction,
  deleteSprintAction,
  reorderSprintsAction,
  setSprintTasksAction,
  applySprintPlanAction,
} from '@/modules/sprints/server-actions';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DraftSprint = { name: string; goal?: string };
type DraftTask = { title: string; description?: string };

interface Props {
  projectId: string;
  projectName: string;
  brief?: string | null;
  goals?: string[] | null;
  sprints: ProjectSprint[];
}

// ---------------------------------------------------------------------------
// Task editor — inline list of blueprint tasks for a single sprint
// ---------------------------------------------------------------------------

function TaskEditor({
  tasks,
  t,
  onChange,
}: {
  tasks: DraftTask[];
  t: ReturnType<typeof useTranslations<'sprints'>>;
  onChange: (tasks: DraftTask[]) => void;
}) {
  function update(i: number, patch: Partial<DraftTask>) {
    onChange(tasks.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  }
  function remove(i: number) {
    onChange(tasks.filter((_, j) => j !== i));
  }
  function add() {
    onChange([...tasks, { title: '', description: '' }]);
  }

  return (
    <div className="flex flex-col gap-2">
      {tasks.map((task, i) => (
        <div
          key={i}
          className="flex flex-col gap-1 p-2 rounded border border-[var(--border-color)] bg-[var(--bg)]"
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={task.title}
              onChange={(e) => update(i, { title: e.target.value })}
              placeholder={t('taskTitlePlaceholder')}
              className="flex-1 text-label bg-transparent border-b border-[var(--border-color)] focus:border-[var(--brand-500)] outline-none py-0.5 text-[var(--ink)] placeholder:text-[var(--ink-4)]"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-[var(--ink-4)] hover:text-[var(--danger)] transition-colors"
              title={t('removeTask')}
            >
              <X size={14} />
            </button>
          </div>
          <input
            type="text"
            value={task.description ?? ''}
            onChange={(e) => update(i, { description: e.target.value })}
            placeholder={t('taskDescPlaceholder')}
            className="text-caption bg-transparent border-b border-transparent focus:border-[var(--border-color)] outline-none py-0.5 text-[var(--ink-3)] placeholder:text-[var(--ink-4)]"
          />
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1 text-caption text-[var(--brand-600)] hover:text-[var(--brand-500)] transition-colors w-fit"
      >
        <Plus size={12} />
        {t('addTask')}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SprintRow — one sprint in the list
// ---------------------------------------------------------------------------

function SprintRow({
  sprint,
  index,
  total,
  t,
  isPending,
  onMoveUp,
  onMoveDown,
  onDelete,
  onUpdate,
  onSaveTasks,
  projectName,
  brief,
}: {
  sprint: ProjectSprint;
  index: number;
  total: number;
  t: ReturnType<typeof useTranslations<'sprints'>>;
  isPending: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onUpdate: (name: string, goal: string) => void;
  onSaveTasks: (tasks: SprintTaskBlueprint[]) => void;
  projectName: string;
  brief?: string | null;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(sprint.name);
  const [editGoal, setEditGoal] = useState(sprint.goal ?? '');

  const [showTasks, setShowTasks] = useState(false);
  const [editTasks, setEditTasks] = useState<DraftTask[]>(sprint.taskBlueprint ?? []);
  const [tasksDirty, setTasksDirty] = useState(false);

  // AI brainstorm state for THIS sprint
  const [brainstormStatus, setBrainstormStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [brainstormTasks, setBrainstormTasks] = useState<DraftTask[]>([]);
  const [brainstormError, setBrainstormError] = useState<string | null>(null);

  function commitEdit() {
    if (!editName.trim()) return;
    onUpdate(editName.trim(), editGoal.trim());
    setIsEditing(false);
  }

  function cancelEdit() {
    setEditName(sprint.name);
    setEditGoal(sprint.goal ?? '');
    setIsEditing(false);
  }

  function handleTasksChange(tasks: DraftTask[]) {
    setEditTasks(tasks);
    setTasksDirty(true);
  }

  function saveTasks() {
    onSaveTasks(editTasks.filter((t) => t.title.trim()).map((t) => ({
      title: t.title.trim(),
      ...(t.description?.trim() ? { description: t.description.trim() } : {}),
    })));
    setTasksDirty(false);
  }

  async function triggerBrainstorm() {
    setBrainstormStatus('loading');
    setBrainstormError(null);
    try {
      const res = await fetch('/api/ai/project-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'sprint-tasks',
          sprintName: sprint.name,
          sprintGoal: sprint.goal ?? undefined,
          projectName,
          brief: brief ?? undefined,
        }),
      });
      if (!res.ok) {
        setBrainstormStatus('error');
        setBrainstormError(t('aiError'));
        return;
      }
      const data = (await res.json()) as { tasks?: DraftTask[] };
      setBrainstormTasks(data.tasks ?? []);
      setBrainstormStatus('ready');
    } catch {
      setBrainstormStatus('error');
      setBrainstormError(t('aiError'));
    }
  }

  function acceptBrainstorm() {
    const merged = [...editTasks, ...brainstormTasks.filter(
      (t) => !editTasks.some((e) => e.title.trim() === t.title.trim())
    )];
    setEditTasks(merged);
    setTasksDirty(true);
    setBrainstormStatus('idle');
    setBrainstormTasks([]);
  }

  function discardBrainstorm() {
    setBrainstormStatus('idle');
    setBrainstormTasks([]);
  }

  const taskCount = sprint.taskBlueprint?.length ?? 0;

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--bg)] overflow-hidden">
      {/* Main row */}
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Reorder buttons */}
        <div className="flex flex-col gap-0.5 mt-0.5 shrink-0">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0 || isPending}
            className="text-[var(--ink-4)] hover:text-[var(--ink-2)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title={t('moveUp')}
          >
            <ChevronUp size={14} />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1 || isPending}
            className="text-[var(--ink-4)] hover:text-[var(--ink-2)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title={t('moveDown')}
          >
            <ChevronDown size={14} />
          </button>
        </div>

        {/* Sprint number */}
        <span className="text-eyebrow font-mono text-[var(--ink-4)] shrink-0 mt-0.5 w-5 text-right">
          {String(index + 1).padStart(2, '0')}
        </span>

        {/* Name + goal */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder={t('sprintNamePlaceholder')}
                className="text-label font-semibold text-[var(--ink)] bg-transparent border-b border-[var(--brand-500)] outline-none pb-0.5"
                autoFocus
              />
              <input
                type="text"
                value={editGoal}
                onChange={(e) => setEditGoal(e.target.value)}
                placeholder={t('sprintGoalPlaceholder')}
                className="text-caption text-[var(--ink-3)] bg-transparent border-b border-[var(--border-color)] focus:border-[var(--brand-500)] outline-none pb-0.5"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={commitEdit}
                  disabled={!editName.trim() || isPending}
                  className="text-caption px-2 py-0.5 rounded bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)] disabled:opacity-50 transition-colors"
                >
                  {t('save')}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="text-caption text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors"
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-label font-semibold text-[var(--ink)] truncate">{sprint.name}</div>
              {sprint.goal && (
                <div className="text-caption text-[var(--ink-3)] mt-0.5 line-clamp-2">{sprint.goal}</div>
              )}
              <div className="text-caption text-[var(--ink-4)] mt-0.5">
                {t('tasks', { n: taskCount })}
              </div>
            </>
          )}
        </div>

        {/* Action buttons */}
        {!isEditing && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setShowTasks((s) => !s)}
              disabled={isPending}
              className={`p-1.5 rounded text-[var(--ink-3)] hover:text-[var(--brand-600)] hover:bg-[var(--surface)] transition-colors ${showTasks ? 'text-[var(--brand-600)] bg-[var(--surface)]' : ''}`}
              title={t('brainstormTasks')}
            >
              <ListChecks size={15} />
            </button>
            <button
              type="button"
              onClick={() => { setIsEditing(true); }}
              disabled={isPending}
              className="p-1.5 rounded text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-[var(--surface)] transition-colors"
              title={t('edit')}
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={isPending}
              className="p-1.5 rounded text-[var(--ink-4)] hover:text-[var(--danger)] hover:bg-[var(--surface)] transition-colors"
              title={t('delete')}
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Task panel (expandable) */}
      {showTasks && (
        <div className="border-t border-[var(--border-color)] px-4 py-3 bg-[var(--surface)]">
          {/* AI brainstorm */}
          {brainstormStatus === 'idle' && (
            <button
              type="button"
              onClick={triggerBrainstorm}
              className="flex items-center gap-1.5 text-caption text-[var(--brand-600)] hover:text-[var(--brand-500)] mb-3 transition-colors"
            >
              <Sparkles size={13} />
              {t('brainstormTasks')}
            </button>
          )}
          {brainstormStatus === 'loading' && (
            <div className="flex items-center gap-1.5 text-caption text-[var(--ink-3)] mb-3">
              <Sparkles size={13} className="animate-pulse" />
              {t('brainstorming')}
            </div>
          )}
          {brainstormStatus === 'error' && (
            <div className="flex items-center gap-2 text-caption text-[var(--danger)] mb-3">
              {brainstormError}
              <button
                type="button"
                onClick={triggerBrainstorm}
                className="underline hover:no-underline"
              >
                {t('retry')}
              </button>
            </div>
          )}
          {brainstormStatus === 'ready' && brainstormTasks.length > 0 && (
            <div className="mb-3 rounded border border-[var(--border-color)] p-3 bg-[var(--bg)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-caption font-semibold text-[var(--ink-2)]">
                  {t('aiSuggestions')}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={acceptBrainstorm}
                    className="text-caption px-2 py-0.5 rounded bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)] transition-colors"
                  >
                    {t('acceptPlan')}
                  </button>
                  <button
                    type="button"
                    onClick={discardBrainstorm}
                    className="text-caption text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors"
                  >
                    {t('discardPlan')}
                  </button>
                </div>
              </div>
              <ul className="flex flex-col gap-1">
                {brainstormTasks.map((bt, i) => (
                  <li key={i} className="text-caption text-[var(--ink-2)]">
                    <span className="font-medium">{bt.title}</span>
                    {bt.description && (
                      <span className="text-[var(--ink-4)] ml-1">{t('taskDescSeparator')}{bt.description}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Manual task editor */}
          <TaskEditor
            tasks={editTasks}
            t={t}
            onChange={handleTasksChange}
          />

          {tasksDirty && (
            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                onClick={saveTasks}
                disabled={isPending}
                className="text-caption px-3 py-1 rounded bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)] disabled:opacity-50 transition-colors"
              >
                {t('saveTasks')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SprintsSection — the top-level client component
// ---------------------------------------------------------------------------

export function SprintsSection({
  projectId,
  projectName,
  brief,
  goals,
  sprints: initialSprints,
}: Props) {
  const router = useRouter();
  const t = useTranslations('sprints');
  const [isPending, startTransition] = useTransition();

  // Local sprint list (optimistic)
  const [sprints, setSprints] = useState<ProjectSprint[]>(initialSprints);

  // Keep the local list in sync with the server: router.refresh() re-renders
  // the RSC tree and passes a fresh `sprints` prop, but React preserves
  // client-component state across refresh — adopt the new prop when it changes
  // (the official "adjusting state when a prop changes" render-phase pattern).
  const [prevInitial, setPrevInitial] = useState(initialSprints);
  if (prevInitial !== initialSprints) {
    setPrevInitial(initialSprints);
    setSprints(initialSprints);
  }

  const [actionError, setActionError] = useState<string | null>(null);

  // Add sprint form
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState('');
  const [addGoal, setAddGoal] = useState('');

  // AI sprint plan
  const [planStatus, setPlanStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [planDraft, setPlanDraft] = useState<DraftSprint[]>([]);
  const [planError, setPlanError] = useState<string | null>(null);
  const [duration, setDuration] = useState(12);

  // ---------------------------------------------------------------------------
  // Mutation helpers — call action, then refresh()
  // ---------------------------------------------------------------------------

  /** The sprint actions report failure by RESOLVING `{ ok: false }`, not by throwing. */
  function isActionFailure(res: unknown): boolean {
    return (
      typeof res === 'object' && res !== null && 'ok' in res && (res as { ok: unknown }).ok === false
    );
  }

  function mutate(action: () => Promise<unknown>) {
    setActionError(null);
    startTransition(async () => {
      try {
        const res = await action();
        if (isActionFailure(res)) {
          setActionError(t('actionError'));
        }
      } catch {
        setActionError(t('actionError'));
      } finally {
        // Always refresh: success pulls the fresh list; failure restores the
        // authoritative order after an optimistic move.
        router.refresh();
      }
    });
  }

  // ---------------------------------------------------------------------------
  // CRUD operations
  // ---------------------------------------------------------------------------

  function handleCreate() {
    if (!addName.trim()) return;
    const name = addName.trim();
    const goal = addGoal.trim() || undefined;
    mutate(() =>
      createSprintAction({ projectId, name, goal }).then((res) => {
        if (res.ok) {
          setAddName('');
          setAddGoal('');
          setShowAdd(false);
        }
        return res;
      })
    );
  }

  function handleUpdate(sprintId: string, name: string, goal: string) {
    mutate(() =>
      updateSprintAction({
        projectId,
        sprintId,
        name,
        goal: goal || null,
      })
    );
  }

  function handleDelete(sprintId: string) {
    mutate(() => deleteSprintAction({ projectId, sprintId }));
  }

  function handleMoveUp(index: number) {
    if (index === 0) return;
    const next = [...sprints];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    setSprints(next); // optimistic
    mutate(() => reorderSprintsAction({ projectId, orderedIds: next.map((s) => s.id) }));
  }

  function handleMoveDown(index: number) {
    if (index === sprints.length - 1) return;
    const next = [...sprints];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    setSprints(next); // optimistic
    mutate(() => reorderSprintsAction({ projectId, orderedIds: next.map((s) => s.id) }));
  }

  function handleSaveTasks(sprintId: string, tasks: SprintTaskBlueprint[]) {
    mutate(() => setSprintTasksAction({ projectId, sprintId, tasks }));
  }

  // ---------------------------------------------------------------------------
  // AI plan generation
  // ---------------------------------------------------------------------------

  async function triggerPlanGeneration() {
    setPlanStatus('loading');
    setPlanError(null);
    try {
      const res = await fetch('/api/ai/project-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'sprint-plan',
          name: projectName,
          brief: brief ?? undefined,
          goals: goals?.filter(Boolean) ?? undefined,
          duration,
        }),
      });
      if (!res.ok) {
        setPlanStatus('error');
        setPlanError(t('aiError'));
        return;
      }
      const data = (await res.json()) as { sprints?: DraftSprint[] };
      setPlanDraft(
        (data.sprints ?? []).map((s) => ({ name: s.name, goal: s.goal ?? '' }))
      );
      setPlanStatus('ready');
    } catch {
      setPlanStatus('error');
      setPlanError(t('aiError'));
    }
  }

  function updatePlanDraft(i: number, patch: Partial<DraftSprint>) {
    setPlanDraft(planDraft.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  }

  function acceptPlan() {
    const payload = planDraft
      .filter((s) => s.name.trim())
      .map((s) => ({ name: s.name.trim(), goal: s.goal?.trim() || undefined }));
    if (payload.length === 0) return;
    mutate(() =>
      applySprintPlanAction({ projectId, sprints: payload }).then((res) => {
        if (res.ok) {
          setPlanStatus('idle');
          setPlanDraft([]);
        }
        return res;
      })
    );
  }

  function discardPlan() {
    setPlanStatus('idle');
    setPlanDraft([]);
    setPlanError(null);
  }

  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--surface)] p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <ListChecks size={16} strokeWidth={2.25} className="text-[var(--brand-600)] shrink-0" />
        <h3 className="text-heading text-[var(--ink)] font-[family-name:var(--font-display)]">
          {t('title')}
        </h3>
        <span className="text-caption text-[var(--ink-4)] font-mono ml-1">
          {sprints.length}
        </span>

        {/* AI Generate Plan button (only shown when no plan is being reviewed) */}
        {planStatus === 'idle' && (
          <button
            type="button"
            onClick={triggerPlanGeneration}
            disabled={isPending}
            className="ml-auto flex items-center gap-1.5 text-caption text-[var(--ink-3)] hover:text-[var(--brand-600)] border border-[var(--border-color)] hover:border-[var(--brand-500)] px-2.5 py-1 rounded-md transition-colors disabled:opacity-50"
          >
            <Sparkles size={13} />
            {t('generatePlan')}
          </button>
        )}
        {planStatus === 'loading' && (
          <span className="ml-auto flex items-center gap-1.5 text-caption text-[var(--ink-3)]">
            <Sparkles size={13} className="animate-pulse" />
            {t('generating')}
          </span>
        )}
      </div>

      {/* Action error (CRUD/reorder failures) */}
      {actionError && (
        <div className="flex items-center gap-2 text-caption text-[var(--danger)] mb-3 px-3 py-2 rounded border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--danger)_6%,transparent)]">
          {actionError}
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="ml-auto text-[var(--ink-3)] hover:text-[var(--ink)]"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* AI plan error */}
      {planStatus === 'error' && planError && (
        <div className="flex items-center gap-2 text-caption text-[var(--danger)] mb-3 px-3 py-2 rounded border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--danger)_6%,transparent)]">
          {planError}
          <button
            type="button"
            onClick={triggerPlanGeneration}
            className="underline hover:no-underline"
          >
            {t('retry')}
          </button>
          <button
            type="button"
            onClick={discardPlan}
            className="ml-auto text-[var(--ink-3)] hover:text-[var(--ink)]"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* AI plan review */}
      {planStatus === 'ready' && planDraft.length > 0 && (
        <div className="mb-4 rounded border border-[var(--border-color)] p-4 bg-[var(--bg)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-label font-semibold text-[var(--ink)]">
              {t('aiPlanCount', { count: planDraft.length })}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={acceptPlan}
                disabled={isPending}
                className="text-label px-3 py-1 rounded bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)] disabled:opacity-50 transition-colors"
              >
                {t('acceptPlan')}
              </button>
              <button
                type="button"
                onClick={discardPlan}
                className="text-label text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors"
              >
                {t('discardPlan')}
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {planDraft.map((s, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded border border-[var(--border-color)] bg-[var(--surface)]"
              >
                <span className="text-eyebrow font-mono text-[var(--ink-4)] shrink-0 mt-1 w-5 text-right">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <input
                    type="text"
                    value={s.name}
                    onChange={(e) => updatePlanDraft(i, { name: e.target.value })}
                    className="text-label font-semibold text-[var(--ink)] bg-transparent border-b border-[var(--border-color)] focus:border-[var(--brand-500)] outline-none pb-0.5"
                  />
                  <input
                    type="text"
                    value={s.goal ?? ''}
                    onChange={(e) => updatePlanDraft(i, { goal: e.target.value })}
                    placeholder={t('sprintGoalPlaceholder')}
                    className="text-caption text-[var(--ink-3)] bg-transparent border-b border-transparent focus:border-[var(--border-color)] outline-none pb-0.5 placeholder:text-[var(--ink-4)]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setPlanDraft(planDraft.filter((_, j) => j !== i))}
                  className="text-[var(--ink-4)] hover:text-[var(--danger)] transition-colors mt-1"
                  title="Remove"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Duration picker for context (no-op after generation, helps set expectation) */}
          <div className="mt-3 flex items-center gap-2">
            <label className="text-caption text-[var(--ink-3)]">{t('durationLabel')}</label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(Math.max(1, Math.min(52, Number(e.target.value))))}
              min={1}
              max={52}
              className="w-16 text-caption text-[var(--ink)] bg-transparent border-b border-[var(--border-color)] focus:border-[var(--brand-500)] outline-none text-center"
            />
          </div>
        </div>
      )}

      {/* Duration picker (shown when idle, before generating) */}
      {planStatus === 'idle' && (
        <div className="flex items-center gap-2 mb-3">
          <label className="text-caption text-[var(--ink-3)]">{t('durationLabel')}</label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(Math.max(1, Math.min(52, Number(e.target.value))))}
            min={1}
            max={52}
            className="w-16 text-caption text-[var(--ink)] bg-transparent border-b border-[var(--border-color)] focus:border-[var(--brand-500)] outline-none text-center"
          />
        </div>
      )}

      {/* Sprint list */}
      {sprints.length === 0 && planStatus === 'idle' ? (
        <div className="text-center py-6 text-caption text-[var(--ink-3)] italic">
          {t('empty')}
        </div>
      ) : (
        <div className="flex flex-col gap-2 mb-3">
          {sprints.map((sprint, i) => (
            <SprintRow
              key={sprint.id}
              sprint={sprint}
              index={i}
              total={sprints.length}
              t={t}
              isPending={isPending}
              onMoveUp={() => handleMoveUp(i)}
              onMoveDown={() => handleMoveDown(i)}
              onDelete={() => handleDelete(sprint.id)}
              onUpdate={(name, goal) => handleUpdate(sprint.id, name, goal)}
              onSaveTasks={(tasks) => handleSaveTasks(sprint.id, tasks)}
              projectName={projectName}
              brief={brief}
            />
          ))}
        </div>
      )}

      {/* Add sprint */}
      {showAdd ? (
        <div className="flex flex-col gap-2 p-3 rounded border border-[var(--border-color)] bg-[var(--bg)]">
          <input
            type="text"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            placeholder={t('sprintNamePlaceholder')}
            className="text-label text-[var(--ink)] bg-transparent border-b border-[var(--brand-500)] outline-none pb-0.5"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') { setShowAdd(false); setAddName(''); setAddGoal(''); }
            }}
          />
          <input
            type="text"
            value={addGoal}
            onChange={(e) => setAddGoal(e.target.value)}
            placeholder={t('sprintGoalPlaceholder')}
            className="text-caption text-[var(--ink-3)] bg-transparent border-b border-[var(--border-color)] focus:border-[var(--brand-500)] outline-none pb-0.5 placeholder:text-[var(--ink-4)]"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') { setShowAdd(false); setAddName(''); setAddGoal(''); }
            }}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCreate}
              disabled={!addName.trim() || isPending}
              className="text-caption px-3 py-1 rounded bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)] disabled:opacity-50 transition-colors"
            >
              {t('save')}
            </button>
            <button
              type="button"
              onClick={() => { setShowAdd(false); setAddName(''); setAddGoal(''); }}
              className="text-caption text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          disabled={isPending}
          className="flex items-center gap-1.5 text-caption text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors mt-1"
        >
          <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-[var(--surface-muted)] text-[var(--ink-2)]">
            <Plus size={11} strokeWidth={2.5} aria-hidden />
          </span>
          {t('addSprint')}
        </button>
      )}
    </section>
  );
}
