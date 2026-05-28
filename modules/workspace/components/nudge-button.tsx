'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { NudgeModal } from './nudge-modal';

type Props = {
  workspaceId: string;
};

export function NudgeButton({ workspaceId }: Props) {
  const t = useTranslations('workspace.nudge');
  const [open, setOpen] = useState(false);

  return (
    <>
      <a
        role="button"
        className="ws-link"
        style={{ color: '#92400E', textDecoration: 'underline', cursor: 'pointer' }}
        onClick={() => setOpen(true)}
      >
        {t('trigger')}
      </a>
      {open && (
        <NudgeModal workspaceId={workspaceId} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
