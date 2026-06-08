'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { applySprintPlanAction } from '@/modules/workspace/sprint-actions';

export function ApplySprintPlanCallout({
  workspaceId,
  sprintCount,
}: {
  workspaceId: string;
  sprintCount: number;
}) {
  const t = useTranslations('sprintWorkspace');
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div
      style={{
        marginBottom: 16,
        borderRadius: 'var(--radius-md)',
        border: '1px dashed var(--border-color)',
        background: 'var(--surface)',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 13.5,
          color: 'var(--ink-2)',
          lineHeight: 1.45,
          flex: 1,
        }}
      >
        {t('applyCalloutBody', { count: sprintCount })}
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await applySprintPlanAction({ workspaceId });
            if (result.ok) router.refresh();
          })
        }
        className="ws-btn brand"
        style={{ flexShrink: 0, opacity: pending ? 0.5 : 1, cursor: pending ? 'not-allowed' : undefined }}
      >
        {pending ? t('applyingCta') : t('applyCta')}
      </button>
    </div>
  );
}
