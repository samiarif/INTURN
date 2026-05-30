import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * BackLink — the standard "← Back to X" affordance. Encapsulates the
 * hand-rolled pattern that was copy-pasted across account / community /
 * admin pages (a caption-sized muted link with a leading ArrowLeft that
 * darkens on hover). Pure markup, so it works in both server and client
 * components.
 *
 *   <BackLink href="/company/projects">Back to projects</BackLink>
 */
function BackLink({
  href,
  children,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Link>, 'href'> & { href: string }) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-1.5 text-caption text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors',
        className,
      )}
      {...props}
    >
      <ArrowLeft size={14} strokeWidth={2} aria-hidden />
      {children}
    </Link>
  );
}

export { BackLink };
