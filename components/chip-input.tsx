'use client';

import { useState, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function ChipInput({
  value,
  onChange,
  min = 3,
  max = 8,
  placeholder = 'Add a skill',
}: {
  value: string[];
  onChange: (next: string[]) => void;
  min?: number;
  max?: number;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState('');
  const atMax = value.length >= max;

  function add() {
    const v = draft.trim();
    if (!v || value.includes(v) || atMax) return;
    onChange([...value, v]);
    setDraft('');
  }

  function remove(item: string) {
    onChange(value.filter((v) => v !== item));
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add();
    }
    if (e.key === 'Backspace' && !draft && value.length > 0) {
      remove(value[value.length - 1]);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 p-2 border border-[var(--border-color)] rounded-md bg-[var(--surface)] focus-within:border-[var(--brand-300)]">
        {value.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--brand-50)] text-[var(--brand-600)] text-[12.5px] font-medium"
          >
            {v}
            <button
              type="button"
              onClick={() => remove(v)}
              className="hover:text-[var(--brand-700)]"
              aria-label={`Remove ${v}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          placeholder={atMax ? 'Cap reached' : placeholder}
          disabled={atMax}
          className="border-0 shadow-none flex-1 min-w-[120px] focus-visible:ring-0 px-1 h-7"
        />
      </div>
      <p className="text-[12px] text-[var(--ink-3)] mt-1">
        {value.length} / {max} added · min {min}
      </p>
    </div>
  );
}
