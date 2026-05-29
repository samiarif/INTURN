import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * PageHeader — the standard top band for every route. Gives a consistent
 * rhythm: optional brand eyebrow, optional lucide icon beside a display-font
 * title, an optional description, and a right-aligned actions slot.
 *
 *   <PageHeader
 *     eyebrow="Projects"
 *     icon={<Milestone size={22} />}
 *     title="Brand audit"
 *     description="Three internships across two phases."
 *     actions={<Button>New internship</Button>}
 *   />
 */
function PageHeader({
  eyebrow,
  icon,
  title,
  description,
  actions,
  className,
  ...props
}: Omit<React.ComponentProps<'div'>, 'title'> & {
  eyebrow?: React.ReactNode;
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div
      data-slot="page-header"
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
      {...props}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <div className="text-eyebrow uppercase text-[var(--brand-600)] mb-1.5">
            {eyebrow}
          </div>
        ) : null}
        <div className="flex items-center gap-2.5">
          {icon ? (
            <span className="shrink-0 text-[var(--brand-600)]" aria-hidden>
              {icon}
            </span>
          ) : null}
          <h1 className="text-display font-[family-name:var(--font-display)] text-[var(--ink)] min-w-0">
            {title}
          </h1>
        </div>
        {description ? (
          <p className="text-body text-[var(--ink-3)] mt-2 max-w-prose">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex items-center gap-2 shrink-0 sm:pt-0.5">{actions}</div>
      ) : null}
    </div>
  );
}

export { PageHeader };
