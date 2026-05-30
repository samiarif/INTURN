'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { assignStudentCoordinatorAction } from '@/modules/university/server-actions';

export function AssignCoordinatorSelect({
  studentMemberId,
  current,
  coordinators,
  unassignedLabel,
}: {
  studentMemberId: string;
  current: string | null;
  coordinators: { userId: string; name: string }[];
  unassignedLabel: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(current ?? '');
  const [pending, start] = useTransition();

  return (
    <select
      value={value}
      disabled={pending}
      aria-label={unassignedLabel}
      onChange={(e) => {
        const next = e.target.value;
        setValue(next);
        start(async () => {
          await assignStudentCoordinatorAction({
            studentMemberId,
            coordinatorUserId: next || null,
          });
          router.refresh();
        });
      }}
      className="h-8 rounded-md border border-[var(--border-color)] bg-[var(--surface)] px-2 text-caption text-[var(--ink-2)] disabled:opacity-60"
    >
      <option value="">{unassignedLabel}</option>
      {coordinators.map((c) => (
        <option key={c.userId} value={c.userId}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
