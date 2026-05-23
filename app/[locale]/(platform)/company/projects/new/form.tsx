'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { createProjectAction } from '@/modules/projects/server-actions';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

const today = () => new Date().toISOString().slice(0, 10);
const in12Weeks = () => new Date(Date.now() + 12 * 7 * 86400_000).toISOString().slice(0, 10);

export function ProjectCreateForm() {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);

  return (
    <form action={createProjectAction} className="space-y-5">
      <div>
        <Label htmlFor="name">Project name *</Label>
        <Input
          id="name"
          name="name"
          value={name}
          onChange={(e) => {
            const next = e.target.value;
            setName(next);
            if (!slugTouched) setSlug(slugify(next));
          }}
          placeholder="Brand audit & system refresh"
          required
        />
      </div>
      <div>
        <Label htmlFor="slug">URL slug *</Label>
        <Input
          id="slug"
          name="slug"
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugTouched(true);
          }}
          pattern="[a-z0-9-]+"
          required
        />
        <p className="text-[12px] text-[var(--ink-3)] mt-1">
          Used in URLs. Lowercase letters, digits, hyphens only.
        </p>
      </div>
      <div>
        <Label htmlFor="brief">Brief</Label>
        <Textarea
          id="brief"
          name="brief"
          rows={4}
          maxLength={2000}
          placeholder="One paragraph: what the project is, what success looks like."
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startDate">Start date *</Label>
          <Input id="startDate" name="startDate" type="date" defaultValue={today()} required />
        </div>
        <div>
          <Label htmlFor="endDate">End date *</Label>
          <Input id="endDate" name="endDate" type="date" defaultValue={in12Weeks()} required />
        </div>
      </div>
      <div className="flex justify-end pt-2">
        <Button type="submit" className="bg-[var(--brand-500)] hover:bg-[var(--brand-600)]">
          Create draft project →
        </Button>
      </div>
    </form>
  );
}
