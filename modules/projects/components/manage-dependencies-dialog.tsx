'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link2, X, Plus, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  addDeliverableDependencyAction,
  removeDeliverableDependencyAction,
  type DependencyActionError,
} from '@/modules/deliverables/dependency-actions';
import type {
  LinkableDeliverable,
  ProjectDependencyEdge,
} from '@/modules/deliverables/dependencies';

// Action error codes that map to a localized message under
// projectHub.dependencies.errors.* (unknown_error / not_found fall back to a
// generic line).
const KNOWN_ERRORS = new Set<DependencyActionError>([
  'forbidden',
  'wrong_project',
  'self',
  'cycle',
  'duplicate',
]);

/**
 * Supervisor-only dependency editor. Lists the project's existing edges (each
 * removable) and offers an add row with two deliverable selects. Reuses the
 * shared Dialog; mirrors ManageProjectsDialog's useTransition + router.refresh
 * pattern. All data (deliverables, existing edges, projectId) is passed in by
 * the project hub — this component never fetches.
 */
export function ManageDependenciesDialog({
  projectId,
  deliverables,
  edges,
  triggerClassName,
}: {
  projectId: string;
  deliverables: LinkableDeliverable[];
  edges: ProjectDependencyEdge[];
  triggerClassName?: string;
}) {
  const t = useTranslations('projectHub.dependencies');
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [upstreamId, setUpstreamId] = useState<string | null>(null);
  const [downstreamId, setDownstreamId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const byId = useMemo(
    () => new Map(deliverables.map((d) => [d.id, d])),
    [deliverables],
  );

  const label = (d: LinkableDeliverable) => `${d.title} · ${d.internName}`;

  function resolveError(code: DependencyActionError): string {
    return KNOWN_ERRORS.has(code) ? t(`errors.${code}`) : t('errors.generic');
  }

  function handleAdd() {
    setError(null);
    if (!upstreamId || !downstreamId) return;
    startTransition(async () => {
      const res = await addDeliverableDependencyAction({
        projectId,
        upstreamId,
        downstreamId,
      });
      if (res.ok) {
        setUpstreamId(null);
        setDownstreamId(null);
        router.refresh();
      } else {
        setError(resolveError(res.error));
      }
    });
  }

  function handleRemove(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await removeDeliverableDependencyAction(id);
      if (res.ok) {
        router.refresh();
      } else {
        setError(t('errors.generic'));
      }
    });
  }

  const canSubmit = !!upstreamId && !!downstreamId && !pending;

  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            className={
              triggerClassName ??
              'inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-label border border-[var(--border-color)] text-[var(--ink-2)] hover:border-[var(--border-strong)] hover:text-[var(--ink)]'
            }
          />
        }
      >
        <Link2 size={14} strokeWidth={2} aria-hidden />
        {t('manageTitle')}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogTitle>{t('manageTitle')}</DialogTitle>
        <p className="text-caption text-[var(--ink-3)] -mt-2">{t('manageHint')}</p>

        {/* ----- Existing edges ----- */}
        <div className="flex flex-col gap-1.5">
          {edges.length === 0 ? (
            <div className="rounded-md border border-dashed border-[var(--border-color)] px-3 py-4 text-center text-caption text-[var(--ink-3)]">
              {t('empty')}
            </div>
          ) : (
            <ul className="flex flex-col gap-1.5" aria-label={t('existingLabel')}>
              {edges.map((edge) => (
                <li
                  key={edge.id}
                  className="flex items-center gap-2 rounded-md border border-[var(--border-color)] bg-[var(--surface)] px-2.5 py-2 text-label"
                >
                  <span className="min-w-0 flex-1 flex items-center gap-1.5 flex-wrap">
                    <span className="truncate text-[var(--ink)] font-medium">
                      {edge.upstream.title}
                    </span>
                    <span className="text-[var(--ink-4)]">{'·'}</span>
                    <span className="truncate text-[var(--ink-3)]">
                      {edge.upstream.internName}
                    </span>
                    <ArrowRight
                      size={13}
                      strokeWidth={2.25}
                      className="text-[var(--ink-4)] shrink-0"
                      aria-hidden
                    />
                    <span className="truncate text-[var(--ink)] font-medium">
                      {edge.downstream.title}
                    </span>
                    <span className="text-[var(--ink-4)]">{'·'}</span>
                    <span className="truncate text-[var(--ink-3)]">
                      {edge.downstream.internName}
                    </span>
                  </span>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => handleRemove(edge.id)}
                    aria-label={t('remove')}
                    className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded text-[var(--ink-3)] hover:text-[var(--danger)] hover:bg-[var(--surface-muted)] disabled:opacity-50"
                  >
                    <X size={14} strokeWidth={2.25} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ----- Add row ----- */}
        {deliverables.length >= 2 ? (
          <div className="flex flex-col gap-2 border-t border-[var(--border-color)] pt-3">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-2 items-center">
              <div className="flex flex-col gap-1 min-w-0">
                <label className="text-eyebrow font-mono uppercase text-[var(--ink-3)]">
                  {t('upstreamLabel')}
                </label>
                <Select
                  value={upstreamId}
                  onValueChange={(v) => setUpstreamId(v ?? null)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('selectPlaceholder')}>
                      {upstreamId ? label(byId.get(upstreamId)!) : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {deliverables.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {label(d)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <ArrowRight
                size={15}
                strokeWidth={2.25}
                className="text-[var(--ink-4)] mt-5 mx-auto hidden sm:block"
                aria-hidden
              />
              <div className="flex flex-col gap-1 min-w-0">
                <label className="text-eyebrow font-mono uppercase text-[var(--ink-3)]">
                  {t('downstreamLabel')}
                </label>
                <Select
                  value={downstreamId}
                  onValueChange={(v) => setDownstreamId(v ?? null)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('selectPlaceholder')}>
                      {downstreamId ? label(byId.get(downstreamId)!) : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {deliverables.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {label(d)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {error ? <p className="text-caption text-[var(--danger)]">{error}</p> : null}
            <div className="flex justify-end">
              <Button type="button" size="sm" onClick={handleAdd} disabled={!canSubmit}>
                <Plus size={14} strokeWidth={2.25} aria-hidden />
                {pending ? t('adding') : t('addLabel')}
              </Button>
            </div>
          </div>
        ) : (
          <p className="border-t border-[var(--border-color)] pt-3 text-caption text-[var(--ink-3)]">
            {t('needTwo')}
          </p>
        )}

        <div className="flex justify-end">
          <DialogClose render={<Button type="button" variant="outline" size="sm" />}>
            {t('close')}
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
