'use client';

import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const PLATFORMS = [
  'GitHub',
  'Behance',
  'Dribbble',
  'LinkedIn',
  'Personal site',
  'X (Twitter)',
  'Other',
];

export type PortfolioLink = { platform: string; url: string };

export function LinkRepeater({
  value,
  onChange,
}: {
  value: PortfolioLink[];
  onChange: (next: PortfolioLink[]) => void;
}) {
  function add() {
    onChange([...value, { platform: 'GitHub', url: '' }]);
  }

  function update(i: number, patch: Partial<PortfolioLink>) {
    onChange(value.map((v, j) => (i === j ? { ...v, ...patch } : v)));
  }

  function remove(i: number) {
    onChange(value.filter((_, j) => j !== i));
  }

  return (
    <div className="flex flex-col gap-2">
      {value.map((link, i) => (
        <div key={i} className="grid grid-cols-[130px_1fr_32px] gap-2">
          <Select value={link.platform} onValueChange={(v) => update(i, { platform: v ?? 'Other' })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLATFORMS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={link.url}
            onChange={(e) => update(i, { url: e.target.value })}
            placeholder="https://…"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="flex items-center justify-center border border-[var(--border-color)] rounded-md text-[var(--ink-3)] hover:text-[var(--ink)]"
            aria-label="Remove link"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="text-[13px] text-[var(--brand-600)] font-medium self-start mt-1 hover:text-[var(--brand-700)]"
      >
        + Add another link
      </button>
    </div>
  );
}
