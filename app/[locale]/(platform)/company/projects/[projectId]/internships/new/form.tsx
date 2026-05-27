'use client';

import { useMemo, useState } from 'react';
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
import { WizardStepsInline } from '@/components/ui/wizard-steps-inline';
import { DraftBanner } from '@/components/ui/draft-banner';
import { createInternshipAction } from '@/modules/internships/server-actions';
import { TemplatePicker } from '@/modules/internships/components/template-picker';
import { useTranslations } from 'next-intl';
import type { InternshipTemplate } from '@/lib/internship-templates';

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
type Deliverable = { name: string; description: string; dueWeek: number };
type Mode = 'on-site' | 'virtual' | 'hybrid';
type Visibility = 'public' | 'private';

const MODE_OPTIONS: Array<{ value: Mode; label: string; sub: string }> = [
  { value: 'hybrid', label: 'Hybrid', sub: 'On-site + remote' },
  { value: 'virtual', label: 'Remote', sub: 'Fully distributed' },
  { value: 'on-site', label: 'On-site', sub: 'Office every day' },
];

const SLOT_OPTIONS = [1, 2, 3] as const;

const DEFAULT_DELIVERABLES: Deliverable[] = [
  { name: '', description: '', dueWeek: 4 },
  { name: '', description: '', dueWeek: 8 },
  { name: '', description: '', dueWeek: 12 },
];

export function PostInternshipForm({
  projectId,
  projectName,
  projectStartDate,
  orgName,
  orgLocation,
  supervisorName,
}: {
  projectId: string;
  projectName: string;
  projectStartDate: string | null;
  orgName: string;
  orgLocation: string;
  supervisorName: string;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sector, setSector] = useState('Design');
  const [skills, setSkills] = useState<string[]>([]);
  const [duration, setDuration] = useState(12);
  const [internCount, setInternCount] = useState(1);
  const [locationType, setLocationType] = useState<Mode>('hybrid');
  const [location, setLocation] = useState(orgLocation);
  const [language, setLanguage] = useState<'fr' | 'en' | 'ar'>('fr');
  const [isPaid, setIsPaid] = useState(true);
  const [compensation, setCompensation] = useState('800');
  const [compensationUnit, setCompensationUnit] = useState('TND / month');
  const [deadline, setDeadline] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 21);
    return d.toISOString().slice(0, 10);
  });
  const [deliverables, setDeliverables] = useState<Deliverable[]>(DEFAULT_DELIVERABLES);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [visibility, setVisibility] = useState<Visibility>('public');
  const tTpl = useTranslations('internshipTemplates');

  function applyTemplate(template: InternshipTemplate) {
    setTitle(tTpl(`${template.id}.title`));
    setDescription(tTpl(`${template.id}.description`));
    setSector(template.sector);
    setSkills(template.skillsBySector);
    setDuration(template.duration);
    setLocationType(template.locationType);
    setLanguage(template.language);
    setIsPaid(template.isPaid);
  }

  // ---- Live preview derived state -------------------------------------
  const filledDeliverables = deliverables.filter((d) => d.name.trim().length > 0).length;
  const compensationDisplay = isPaid
    ? `${compensation || '—'} ${compensationUnit.replace(' / ', '/').replace('month', 'mo').replace('week', 'wk')}`
    : 'Unpaid';
  const startLabel = projectStartDate
    ? new Date(projectStartDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
    : 'TBD';
  const modeLabel =
    locationType === 'hybrid'
      ? 'Hybrid'
      : locationType === 'virtual'
        ? 'Remote'
        : 'On-site';

  // Deliverables payload (drop empties, clamp dueWeek to project duration).
  const deliverablesPayload = useMemo(
    () =>
      deliverables
        .filter((d) => d.name.trim().length > 0)
        .map((d) => ({
          name: d.name.trim(),
          description: d.description.trim() || undefined,
          dueWeek: Math.max(1, Math.min(duration, d.dueWeek)),
        })),
    [deliverables, duration],
  );

  function updateDeliverable(i: number, patch: Partial<Deliverable>) {
    setDeliverables(deliverables.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  }

  function addDeliverable() {
    if (deliverables.length >= 10) return;
    const last = deliverables[deliverables.length - 1];
    const week = last ? Math.min(duration, last.dueWeek + 1) : 1;
    setDeliverables([...deliverables, { name: '', description: '', dueWeek: week }]);
  }

  function removeDeliverable(i: number) {
    setDeliverables(deliverables.filter((_, j) => j !== i));
  }

  function addQuestion() {
    if (questions.length >= 3) return;
    setQuestions([...questions, { question: '', required: false }]);
  }

  const boundAction = createInternshipAction.bind(null, projectId);
  const combinedCompensation = isPaid ? `${compensation} ${compensationUnit}` : '';

  return (
    <form action={boundAction} className="space-y-6">
      {/* Hidden inputs that wire complex state into FormData ----------- */}
      <input type="hidden" name="skills" value={JSON.stringify(skills)} />
      <input type="hidden" name="customQuestions" value={JSON.stringify(questions)} />
      <input
        type="hidden"
        name="deliverables"
        value={JSON.stringify(deliverablesPayload)}
      />
      <input type="hidden" name="sector" value={sector} />
      <input type="hidden" name="locationType" value={locationType} />
      <input type="hidden" name="language" value={language} />
      <input type="hidden" name="isPaid" value={String(isPaid)} />
      <input type="hidden" name="compensation" value={combinedCompensation} />
      <input type="hidden" name="visibility" value={visibility} />

      <DraftBanner
        title="Draft mode"
        message={`saving here won't publish — ${projectName} stays private until you hit Publish.`}
      />

      {/* Templates picker — only shown when title is blank to avoid
          overwriting work in progress. Companies looking at a fresh
          internship form get an instant scaffold to start from. */}
      {title.trim().length === 0 && <TemplatePicker onPick={applyTemplate} />}

      <WizardStepsInline
        steps={[
          { id: 'role', label: 'Role & skills' },
          { id: 'deliverables', label: 'Deliverables & publish' },
        ]}
        active="role"
      />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-8">
        {/* ============================================================
            Left column: form
            ============================================================ */}
        <div className="space-y-8 min-w-0">
          {/* ---- Role + skills ----------------------------------------- */}
          <section id="role" className="space-y-5 scroll-mt-24">
            <header>
              <h1 className="text-[22px] font-semibold tracking-tight text-[var(--ink)]">
                Add an internship to{' '}
                <span className="text-[var(--brand-600)]">{projectName}</span>
              </h1>
              <p className="text-[14px] text-[var(--ink-3)] mt-1">
                One role, one set of deliverables. You can add more roles to this project
                anytime — research, copywriting, dev support, etc.
              </p>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_220px] gap-4">
              <div>
                <Label htmlFor="title">
                  Role title <span className="text-[var(--danger)]">*</span>
                </Label>
                <Input
                  id="title"
                  name="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Visual designer"
                  required
                />
                <p className="text-[12px] text-[var(--ink-3)] mt-1">
                  This is what interns search for — be specific.
                </p>
              </div>
              <div>
                <Label>Discipline</Label>
                <Select value={sector} onValueChange={(v) => setSector(v ?? 'Design')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Discipline" />
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
            </div>

            <div>
              <Label htmlFor="description">
                Scope <span className="text-[var(--danger)]">*</span>
              </Label>
              <Textarea
                id="description"
                name="description"
                rows={5}
                required
                maxLength={4000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What this intern owns — concrete, specific. Different from the project description."
              />
              <p className="text-[12px] text-[var(--ink-3)] mt-1">
                What this intern owns. Different from the project description — be concrete
                about scope.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label>
                  Slots <span className="text-[var(--danger)]">*</span>
                </Label>
                <div className="inline-flex items-center w-full rounded-md bg-[var(--surface-muted)] border border-[var(--border-color)] p-[2px] text-[13px] mt-1.5">
                  {SLOT_OPTIONS.map((n) => {
                    const selected = internCount === n;
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setInternCount(n)}
                        className={
                          selected
                            ? 'flex-1 text-center px-3 py-1 rounded-[4px] font-medium bg-white shadow-sm text-[var(--ink)]'
                            : 'flex-1 text-center px-3 py-1 rounded-[4px] font-medium text-[var(--ink-3)]'
                        }
                      >
                        {n === 3 ? '3+' : n}
                      </button>
                    );
                  })}
                </div>
                <input type="hidden" name="internCount" value={internCount} />
                <p className="text-[12px] text-[var(--ink-3)] mt-1">
                  How many interns work this role in parallel.
                </p>
              </div>
              <div>
                <Label>
                  Supervisor <span className="text-[var(--danger)]">*</span>
                </Label>
                <Input value={`${supervisorName} (you)`} disabled />
              </div>
              <div>
                <Label htmlFor="duration">
                  Duration (weeks) <span className="text-[var(--danger)]">*</span>
                </Label>
                <Input
                  id="duration"
                  name="duration"
                  type="number"
                  min={4}
                  max={52}
                  value={duration}
                  onChange={(e) =>
                    setDuration(Math.max(4, Math.min(52, Number(e.target.value) || 12)))
                  }
                  required
                />
                <p className="text-[12px] text-[var(--ink-3)] mt-1">
                  Can&apos;t exceed project length.
                </p>
              </div>
            </div>

            <div>
              <Label>
                Mode <span className="text-[var(--danger)]">*</span>
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1.5">
                {MODE_OPTIONS.map((opt) => {
                  const selected = locationType === opt.value;
                  return (
                    <label
                      key={opt.value}
                      className={
                        selected
                          ? 'rounded-md p-3 cursor-pointer bg-[var(--surface-muted)] border-2 border-[var(--ink)]'
                          : 'rounded-md p-3 cursor-pointer bg-[var(--surface)] border border-[var(--border-color)] hover:border-[var(--border-strong)] transition-colors'
                      }
                    >
                      <input
                        type="radio"
                        name="mode-picker"
                        value={opt.value}
                        checked={selected}
                        onChange={() => setLocationType(opt.value)}
                        className="sr-only"
                      />
                      <b className="block text-[13px] font-semibold text-[var(--ink)] mb-0.5">
                        {opt.label}
                      </b>
                      <span className="text-[11.5px] text-[var(--ink-3)]">{opt.sub}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_220px] gap-4">
              <div>
                <Label htmlFor="location">
                  Location{' '}
                  {locationType !== 'virtual' && <span className="text-[var(--danger)]">*</span>}
                </Label>
                <Input
                  id="location"
                  name="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Tunis"
                  disabled={locationType === 'virtual'}
                  required={locationType !== 'virtual'}
                />
              </div>
              <div>
                <Label>Listing language</Label>
                <Select
                  value={language}
                  onValueChange={(v) => setLanguage((v ?? 'fr') as typeof language)}
                >
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

            <SectionDivider label="required skills" />

            <div>
              <Label>Skills the intern should have</Label>
              <ChipInput
                value={skills}
                onChange={setSkills}
                min={1}
                max={12}
                placeholder="Add a skill"
              />
              <p className="text-[12px] text-[var(--ink-3)] mt-1">
                Used to surface this listing in marketplace search. Don&apos;t gate —
                preferred &gt; required.
              </p>
            </div>

            <div>
              <Label>
                Compensation <span className="text-[var(--danger)]">*</span>
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-[110px_1fr_220px] gap-3 items-stretch mt-1.5">
                <div className="inline-flex items-center rounded-md bg-[var(--surface-muted)] border border-[var(--border-color)] p-[2px] text-[13px]">
                  <button
                    type="button"
                    onClick={() => setIsPaid(true)}
                    className={
                      isPaid
                        ? 'flex-1 text-center px-3 py-1 rounded-[4px] font-medium bg-white shadow-sm text-[var(--ink)]'
                        : 'flex-1 text-center px-3 py-1 rounded-[4px] font-medium text-[var(--ink-3)]'
                    }
                  >
                    Paid
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPaid(false)}
                    className={
                      !isPaid
                        ? 'flex-1 text-center px-3 py-1 rounded-[4px] font-medium bg-white shadow-sm text-[var(--ink)]'
                        : 'flex-1 text-center px-3 py-1 rounded-[4px] font-medium text-[var(--ink-3)]'
                    }
                  >
                    Unpaid
                  </button>
                </div>
                <Input
                  value={compensation}
                  onChange={(e) => setCompensation(e.target.value)}
                  placeholder="800"
                  inputMode="numeric"
                  disabled={!isPaid}
                  aria-label="Compensation amount"
                />
                <Select
                  value={compensationUnit}
                  onValueChange={(v) => setCompensationUnit(v ?? 'TND / month')}
                  disabled={!isPaid}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TND / month">TND / month</SelectItem>
                    <SelectItem value="TND / week">TND / week</SelectItem>
                    <SelectItem value="EUR / month">EUR / month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-[12px] text-[var(--ink-3)] mt-1">
                Inturn shows this on the listing. Hiding pay is not allowed for paid roles.
              </p>
            </div>

            <div>
              <Label htmlFor="deadline">
                Application deadline <span className="text-[var(--danger)]">*</span>
              </Label>
              <Input
                id="deadline"
                name="deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                required
              />
            </div>
          </section>

          {/* ---- Deliverables ----------------------------------------- */}
          <section
            id="deliverables"
            className="space-y-5 scroll-mt-24 pt-6 border-t border-[var(--border-color)]"
          >
            <header>
              <h2 className="text-[22px] font-semibold tracking-tight text-[var(--ink)]">
                What will they deliver?
              </h2>
              <p className="text-[14px] text-[var(--ink-3)] mt-1">
                Be specific. Deliverables anchor the workspace — vague briefs lead to drift.
                Required at post-time, not after.
              </p>
            </header>

            <div>
              <Label>
                Required deliverables{' '}
                <span className="text-[var(--ink-3)] font-normal">
                  · {filledDeliverables} of 10 used
                </span>
              </Label>
              <div className="space-y-1.5 mt-1.5">
                {deliverables.map((d, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[28px_minmax(0,1fr)_88px_28px] gap-2 items-start p-2.5 border border-[var(--border-color)] rounded-md bg-[var(--surface)]"
                  >
                    <span className="font-mono text-[11px] font-semibold text-[var(--brand-700)] bg-[#DDD6FE] w-7 h-7 rounded flex items-center justify-center mt-0.5">
                      D{i + 1}
                    </span>
                    <div className="space-y-1 min-w-0">
                      <Input
                        value={d.name}
                        onChange={(e) => updateDeliverable(i, { name: e.target.value })}
                        placeholder={
                          i === 0
                            ? 'Brand audit · stakeholder findings'
                            : i === 1
                              ? 'Visual exploration · moodboards'
                              : i === 2
                                ? 'System library handoff'
                                : 'Deliverable name'
                        }
                        aria-label={`Deliverable ${i + 1} name`}
                        className="h-8 text-[13px] font-medium"
                      />
                      <Input
                        value={d.description}
                        onChange={(e) =>
                          updateDeliverable(i, { description: e.target.value })
                        }
                        placeholder="Short note (optional)"
                        aria-label={`Deliverable ${i + 1} description`}
                        className="h-7 text-[12px] text-[var(--ink-3)]"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-[10px] text-[var(--ink-3)] uppercase">
                        Wk
                      </span>
                      <Input
                        type="number"
                        min={1}
                        max={duration}
                        value={d.dueWeek}
                        onChange={(e) =>
                          updateDeliverable(i, {
                            dueWeek: Math.max(
                              1,
                              Math.min(duration, Number(e.target.value) || 1),
                            ),
                          })
                        }
                        aria-label={`Deliverable ${i + 1} due week`}
                        className="h-8 text-[12px] text-center"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDeliverable(i)}
                      className="flex items-center justify-center text-[var(--ink-4)] hover:text-[var(--ink-2)] h-8 self-start mt-0.5"
                      aria-label={`Remove deliverable ${i + 1}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-2.5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={addDeliverable}
                  disabled={deliverables.length >= 10}
                  className="text-[12.5px] font-medium text-[var(--brand-600)] hover:text-[var(--brand-700)] disabled:text-[var(--ink-4)]"
                >
                  + Add deliverable
                </button>
                <span className="text-[12px] text-[var(--ink-3)]">Min 3 · max 10</span>
              </div>
            </div>

            <SectionDivider label="application questions" />

            <div>
              <Label>Ask applicants 1–3 short questions</Label>
              <div className="space-y-1.5 mt-1.5">
                {questions.map((q, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[28px_minmax(0,1fr)_auto_28px] gap-2 items-center"
                  >
                    <span className="font-mono text-[11px] font-semibold text-[var(--ink)] bg-[var(--surface-muted)] w-7 h-7 rounded flex items-center justify-center">
                      Q{i + 1}
                    </span>
                    <Input
                      value={q.question}
                      onChange={(e) =>
                        setQuestions(
                          questions.map((qq, j) =>
                            j === i ? { ...qq, question: e.target.value } : qq,
                          ),
                        )
                      }
                      placeholder={
                        i === 0
                          ? "Share a brand system you've worked on (link or attachment)."
                          : i === 1
                            ? "What's a brand you think gets identity right? In one sentence, why?"
                            : 'Question text'
                      }
                      aria-label={`Question ${i + 1}`}
                      className="h-9"
                    />
                    <label className="inline-flex items-center gap-1.5 text-[12px] text-[var(--ink-3)] whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={q.required}
                        onChange={(e) =>
                          setQuestions(
                            questions.map((qq, j) =>
                              j === i ? { ...qq, required: e.target.checked } : qq,
                            ),
                          )
                        }
                      />
                      Required
                    </label>
                    <button
                      type="button"
                      onClick={() => setQuestions(questions.filter((_, j) => j !== i))}
                      className="flex items-center justify-center text-[var(--ink-4)] hover:text-[var(--ink-2)] h-9"
                      aria-label="Remove question"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addQuestion}
                disabled={questions.length >= 3}
                className="mt-2 text-[12.5px] font-medium text-[var(--brand-600)] hover:text-[var(--brand-700)] disabled:text-[var(--ink-4)]"
              >
                + Add question {questions.length >= 3 ? '(max 3)' : `(${3 - questions.length} left)`}
              </button>
            </div>

            <SectionDivider label="visibility" />

            <div>
              <Label>Where this listing appears</Label>
              <div className="flex flex-col gap-2 mt-1.5">
                <VisibilityChoice
                  selected={visibility === 'public'}
                  onSelect={() => setVisibility('public')}
                  title="Public marketplace"
                  subtitle="Anyone can apply. Inturn handles the inbox."
                />
                <VisibilityChoice
                  selected={visibility === 'private'}
                  onSelect={() => setVisibility('private')}
                  title="Private link only"
                  subtitle="Share with named candidates. No marketplace presence."
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-between items-center gap-3 pt-4 border-t border-[var(--border-color)]">
              <Button
                type="button"
                variant="ghost"
                onClick={() => window.history.back()}
                className="text-[var(--ink-3)]"
              >
                ← Back
              </Button>
              <div className="flex gap-2">
                <Button type="submit" variant="outline">
                  Save as draft
                </Button>
                <Button
                  type="submit"
                  className="bg-[var(--brand-500)] hover:bg-[var(--brand-600)] text-white"
                >
                  Publish to marketplace →
                </Button>
              </div>
            </div>
          </section>
        </div>

        {/* ============================================================
            Right rail: live marketplace-card preview
            Stacks below on mobile (lg breakpoint).
            ============================================================ */}
        <aside className="space-y-4 lg:sticky lg:top-24 self-start">
          <div className="font-mono text-[10px] tracking-widest uppercase text-[var(--ink-3)]">
            Live preview · marketplace card
          </div>

          <div className="rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--surface)] p-5">
            <span className="inline-block font-mono text-[10px] tracking-wider uppercase text-[var(--brand-700)] bg-[#DDD6FE] px-2 py-0.5 rounded mb-2.5 font-medium">
              {sector || 'Discipline'}
            </span>
            <h3 className="text-[17px] font-semibold tracking-tight text-[var(--ink)] mb-1 leading-snug">
              {title || 'Role title'} · {projectName}
            </h3>
            <p className="text-[13px] text-[var(--ink-3)] mb-3">
              {orgName} · {orgLocation || 'Tunis'}
            </p>
            <div className="space-y-1 text-[12px] text-[var(--ink-2)] pb-3 mb-3 border-b border-dashed border-[var(--border-color)]">
              <div>
                <b className="font-medium text-[var(--ink)]">{compensationDisplay}</b>{' '}
                · {isPaid ? 'paid' : 'unpaid'}
              </div>
              <div>
                {duration} weeks · {modeLabel}
                {locationType !== 'virtual' && location ? ` · ${location}` : ''}
              </div>
              <div>
                {internCount === 3 ? '3+ slots' : `${internCount} slot${internCount > 1 ? 's' : ''}`}
                {' · starts '}
                {startLabel}
              </div>
              <div>
                Supervisor: <b className="font-medium text-[var(--ink)]">{supervisorName}</b>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mb-3.5">
              {skills.slice(0, 3).map((s) => (
                <span
                  key={s}
                  className="text-[10.5px] bg-[var(--surface-muted)] text-[var(--ink-2)] px-2 py-0.5 rounded-full"
                >
                  {s}
                </span>
              ))}
              {skills.length > 3 ? (
                <span className="text-[10.5px] bg-[var(--surface-muted)] text-[var(--ink-2)] px-2 py-0.5 rounded-full">
                  +{skills.length - 3}
                </span>
              ) : skills.length === 0 ? (
                <span className="text-[10.5px] text-[var(--ink-4)] italic">
                  Add skills →
                </span>
              ) : null}
            </div>
            <div className="bg-[var(--ink)] text-white rounded-md py-2 px-3 text-center text-[12.5px] font-medium">
              Apply →
            </div>
          </div>

          <div className="flex items-start gap-3 px-3.5 py-3 rounded-md bg-[#FFFBEB] border border-[#FDE68A]">
            <span className="w-2 h-2 rounded-full bg-[#F59E0B] flex-shrink-0 mt-1.5" />
            <div className="text-[12px] text-[#78350F] leading-relaxed">
              <b className="text-[#92400E] font-semibold block mb-0.5">
                Publishing activates the project.
              </b>
              {projectName} goes from Draft → Active the moment this listing is live.
            </div>
          </div>

          <div className="px-3.5 py-3 rounded-md bg-[var(--surface-muted)] border border-[var(--border-color)] text-[12px] text-[var(--ink-2)] leading-relaxed">
            <b className="text-[var(--ink)] block mb-1 text-[12.5px]">
              What interns see next
            </b>
            · Public landing page with full scope &amp; deliverables
            <br />· 1-click apply (profile auto-attaches)
            <br />· Your {questions.length || 0} question
            {questions.length === 1 ? '' : 's'} on the apply form
            <br />· &ldquo;Expected response by&rdquo; date on their tracker
          </div>
        </aside>
      </div>
    </form>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="relative pt-1">
      <div aria-hidden className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-[var(--border-color)]" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-[var(--background)] px-2 text-[10.5px] uppercase tracking-wider font-mono text-[var(--ink-3)]">
          {label}
        </span>
      </div>
    </div>
  );
}

function VisibilityChoice({
  selected,
  onSelect,
  title,
  subtitle,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <label
      onClick={onSelect}
      className={
        selected
          ? 'flex gap-3 items-start py-2.5 px-3 border border-[var(--ink)] rounded-md bg-[var(--surface-muted)] cursor-pointer'
          : 'flex gap-3 items-start py-2.5 px-3 border border-[var(--border-color)] rounded-md cursor-pointer hover:border-[var(--border-strong)] transition-colors'
      }
    >
      <span
        className={
          selected
            ? 'w-4 h-4 rounded-full border-[5px] border-[var(--ink)] mt-0.5 flex-shrink-0'
            : 'w-4 h-4 rounded-full border border-[var(--border-strong)] mt-0.5 flex-shrink-0'
        }
        aria-hidden
      />
      <div>
        <b className="text-[13px] font-semibold text-[var(--ink)] block">{title}</b>
        <span className="text-[12px] text-[var(--ink-3)]">{subtitle}</span>
      </div>
    </label>
  );
}
