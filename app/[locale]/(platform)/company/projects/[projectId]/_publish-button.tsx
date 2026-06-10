'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { publishInternshipAction } from '@/modules/internships/server-actions';

export function PublishInternshipButton({ internshipId }: { internshipId: string }) {
  const t = useTranslations('company.internshipStatus');
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="brand"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await publishInternshipAction(internshipId);
        });
      }}
    >
      {pending ? t('publishing') : t('publish')}
    </Button>
  );
}
