'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { publishInternshipAction } from '@/modules/internships/server-actions';

export function PublishInternshipButton({ internshipId }: { internshipId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      className="bg-[var(--brand-500)] hover:bg-[var(--brand-600)]"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await publishInternshipAction(internshipId);
        });
      }}
    >
      {pending ? 'Publishing…' : 'Publish'}
    </Button>
  );
}
