'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChipInput } from '@/components/chip-input';
import { createInternshipAction } from '@/modules/internships/server-actions';

const SECTORS = [
  'Design',
  'Software & tech',
  'Marketing & comms',
  'Product',
  'Data',
  'Operations',
  'Finance',
  'Content',
  'Other',
];

type Question = { question: string; required: boolean };

export function PostInternshipForm({ projectId }: { projectId: string }) {
  const [skills, setSkills] = useState<string[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sector, setSector] = useState('');
  const [locationType, setLocationType] = useState<'on-site' | 'virtual' | 'hybrid'>('hybrid');
  const [language, setLanguage] = useState<'fr' | 'en' | 'ar'>('fr');
  const [isPaid, setIsPaid] = useState(true);

  const boundAction = createInternshipAction.bind(null, projectId);

  return (
    <form action={boundAction} className="space-y-5">
      <input type="hidden" name="skills" value={JSON.stringify(skills)} />
      <input type="hidden" name="customQuestions" value={JSON.stringify(questions)} />
      <input type="hidden" name="sector" value={sector} />
      <input type="hidden" name="locationType" value={locationType} />
      <input type="hidden" name="language" value={language} />
      <input type="hidden" name="isPaid" value={String(isPaid)} />

      <div>
        <Label htmlFor="title">Title *</Label>
        <Input id="title" name="title" required placeholder="Visual designer — Brand audit" />
      </div>
      <div>
        <Label htmlFor="description">Description * (min 20 chars)</Label>
        <Textarea id="description" name="description" rows={5} required maxLength={4000} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Sector *</Label>
          <Select value={sector} onValueChange={(v) => setSector(v ?? '')}>
            <SelectTrigger>
              <SelectValue placeholder="Pick a sector" />
            </SelectTrigger>
            <SelectContent>
              {SECTORS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Language *</Label>
          <Select value={language} onValueChange={(v) => setLanguage((v ?? 'fr') as typeof language)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fr">Français</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="ar">العربية</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Skills *</Label>
        <ChipInput value={skills} onChange={setSkills} min={1} max={12} placeholder="Add a skill" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="duration">Duration (weeks) *</Label>
          <Input id="duration" name="duration" type="number" min={4} max={52} defaultValue={12} required />
        </div>
        <div>
          <Label htmlFor="internCount">Intern slots *</Label>
          <Input id="internCount" name="internCount" type="number" min={1} max={10} defaultValue={1} required />
        </div>
        <div>
          <Label htmlFor="deadline">Application deadline *</Label>
          <Input id="deadline" name="deadline" type="date" required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Location type *</Label>
          <Select
            value={locationType}
            onValueChange={(v) => setLocationType((v ?? 'hybrid') as typeof locationType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="on-site">On-site</SelectItem>
              <SelectItem value="hybrid">Hybrid</SelectItem>
              <SelectItem value="virtual">Virtual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="location">
            Location {locationType !== 'virtual' && '*'}
          </Label>
          <Input
            id="location"
            name="location"
            placeholder="Tunis"
            required={locationType !== 'virtual'}
          />
        </div>
      </div>
      <div className="grid grid-cols-[auto_1fr] gap-4 items-end">
        <div>
          <Label>Paid?</Label>
          <div className="inline-flex items-center rounded-md bg-[var(--surface-muted)] border border-[var(--border-color)] p-[2px] text-[13px]">
            <button
              type="button"
              onClick={() => setIsPaid(true)}
              className={isPaid ? 'px-3 py-1 rounded-[4px] font-medium bg-white shadow-sm' : 'px-3 py-1 rounded-[4px] font-medium text-[var(--ink-3)]'}
            >
              Paid
            </button>
            <button
              type="button"
              onClick={() => setIsPaid(false)}
              className={!isPaid ? 'px-3 py-1 rounded-[4px] font-medium bg-white shadow-sm' : 'px-3 py-1 rounded-[4px] font-medium text-[var(--ink-3)]'}
            >
              Unpaid
            </button>
          </div>
        </div>
        <div>
          <Label htmlFor="compensation">Compensation</Label>
          <Input id="compensation" name="compensation" placeholder="800 TND / mo" disabled={!isPaid} />
        </div>
      </div>

      <div>
        <Label>Custom questions (optional)</Label>
        <p className="text-[12px] text-[var(--ink-3)] mb-2">
          Up to 8 questions. Applicants answer these on the apply form.
        </p>
        <div className="flex flex-col gap-2">
          {questions.map((q, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto_32px] gap-2 items-center">
              <Input
                value={q.question}
                onChange={(e) =>
                  setQuestions(questions.map((qq, j) => (j === i ? { ...qq, question: e.target.value } : qq)))
                }
                placeholder="Question text"
              />
              <label className="inline-flex items-center gap-2 text-[13px] text-[var(--ink-2)]">
                <input
                  type="checkbox"
                  checked={q.required}
                  onChange={(e) =>
                    setQuestions(
                      questions.map((qq, j) => (j === i ? { ...qq, required: e.target.checked } : qq)),
                    )
                  }
                />
                Required
              </label>
              <button
                type="button"
                onClick={() => setQuestions(questions.filter((_, j) => j !== i))}
                className="flex items-center justify-center border border-[var(--border-color)] rounded-md text-[var(--ink-3)] hover:text-[var(--ink)] h-9"
                aria-label="Remove question"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          {questions.length < 8 && (
            <button
              type="button"
              onClick={() => setQuestions([...questions, { question: '', required: false }])}
              className="text-[13px] text-[var(--brand-600)] font-medium self-start mt-1 hover:text-[var(--brand-700)]"
            >
              + Add a question
            </button>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-2 border-t border-[var(--border-color)]">
        <Button type="submit" className="bg-[var(--brand-500)] hover:bg-[var(--brand-600)]">
          Save as draft →
        </Button>
      </div>
    </form>
  );
}
