'use client';

// ProjectMultiselect — a scrollable, accessible checkbox list of projects.
// Controlled: parent owns `selectedIds` and gets the next array on each toggle.
// Used both by the invite modal (supervisor projects) and the per-member
// "Manage projects" dialog.
import type { ProjectLite } from './types';
import { teamStrings } from './strings';

export function ProjectMultiselect({
  projects,
  selectedIds,
  onChange,
  locale,
}: {
  projects: ProjectLite[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  locale: string;
}) {
  const t = teamStrings(locale);

  if (projects.length === 0) {
    return <p className="text-sm text-muted-foreground py-2">{t.noProjects}</p>;
  }

  function toggle(id: string, checked: boolean) {
    if (checked) {
      if (!selectedIds.includes(id)) onChange([...selectedIds, id]);
    } else {
      onChange(selectedIds.filter((x) => x !== id));
    }
  }

  return (
    <div className="max-h-52 overflow-y-auto rounded-lg border border-border bg-background p-1">
      {projects.map((p) => {
        const checked = selectedIds.includes(p.id);
        return (
          <label
            key={p.id}
            className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => toggle(p.id, e.target.checked)}
              className="size-4 shrink-0 rounded border-input text-primary accent-[var(--brand-500)] focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <span className="min-w-0 truncate text-foreground">{p.name}</span>
          </label>
        );
      })}
    </div>
  );
}
