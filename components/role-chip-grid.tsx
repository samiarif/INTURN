'use client';

import { ROLE_CATEGORIES, type RoleCategory } from '@/modules/profiles/validators';
import { cn } from '@/lib/utils';

export function RoleChipGrid({
  value,
  onChange,
  max = 3,
}: {
  value: RoleCategory[];
  onChange: (next: RoleCategory[]) => void;
  max?: number;
}) {
  function toggle(role: RoleCategory) {
    if (value.includes(role)) {
      onChange(value.filter((r) => r !== role));
    } else if (value.length < max) {
      onChange([...value, role]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {ROLE_CATEGORIES.map((role) => {
        const on = value.includes(role);
        const disabled = !on && value.length >= max;
        return (
          <button
            key={role}
            type="button"
            disabled={disabled}
            onClick={() => toggle(role)}
            className={cn(
              'px-3 py-1.5 rounded-full text-[13px] font-medium border transition-colors',
              on
                ? 'bg-[var(--ink)] text-white border-[var(--ink)]'
                : 'bg-[var(--surface)] text-[var(--ink-2)] border-[var(--border-color)] hover:border-[var(--border-strong)]',
              disabled && 'opacity-40 cursor-not-allowed',
            )}
          >
            {role}
          </button>
        );
      })}
    </div>
  );
}
