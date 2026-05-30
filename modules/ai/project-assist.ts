/**
 * Inline AI assists for the smart manual project/internship creation flow.
 *
 * Five draft-generating helpers — one per assist Sam picked. Each mirrors the
 * task-clarity pattern (lazy client, JSON-from-text, claude-sonnet-4-5) and
 * **clamps its output to the exact same limits the form's zod schema enforces**
 * so an accepted draft can never produce an invalid form. Output is always a
 * draft: the form decides what to commit. Reply in the input's language.
 *
 * Server-only (imports the Anthropic SDK). The API route dispatches to these;
 * the client imports only the result *types* (`import type`, erased at build).
 */

import Anthropic from '@anthropic-ai/sdk';
import { requireEnv } from '@/lib/env';

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: requireEnv('ANTHROPIC_API_KEY') });
  return _client;
}

/* ----------------------------------------------------------- utilities ---- */

/** Pull the first JSON object out of the model's text reply. */
function extractJson<T>(text: string): T {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI did not return parseable JSON');
  return JSON.parse(match[0]) as T;
}

function clampStr(value: unknown, max: number): string {
  const s = typeof value === 'string' ? value.trim() : String(value ?? '').trim();
  return s.length > max ? s.slice(0, max).trimEnd() : s;
}

function clampInt(value: unknown, lo: number, hi: number, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(hi, Math.max(lo, Math.round(n)));
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

async function complete(system: string, user: string, maxTokens: number): Promise<string> {
  const res = await client().messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }],
  });
  return res.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
}

/* =========================================================== reformulate == */

export type ReformulateInput = { text: string };
export type ReformulateVariant = { key: 'balanced' | 'shorter' | 'warmer'; text: string };
export type ReformulateResult = { variants: ReformulateVariant[] };

const REFORMULATE_SYSTEM = `You refine a company's internship project description. Keep every concrete fact (tools, scope, audience) — improve clarity and flow only; never invent details.

Return three rewrites of the SAME description:
- "balanced": clear and professional, similar length
- "shorter": tighter, ~40% shorter, keeps the essentials
- "warmer": more inviting and human, speaks to a student intern

Each rewrite must be under 1500 characters. Reply in the SAME language as the input. Return JSON only:

{ "variants": [ { "key": "balanced", "text": "..." }, { "key": "shorter", "text": "..." }, { "key": "warmer", "text": "..." } ] }`;

export async function reformulateDescription(
  input: ReformulateInput,
): Promise<ReformulateResult> {
  const text = await complete(
    REFORMULATE_SYSTEM,
    `Description to refine:\n\n${input.text}`,
    900,
  );
  const raw = extractJson<{ variants?: unknown }>(text);
  const byKey = new Map<string, string>();
  for (const v of asArray(raw.variants)) {
    const obj = v as { key?: unknown; text?: unknown };
    const key = clampStr(obj.key, 20).toLowerCase();
    if ((key === 'balanced' || key === 'shorter' || key === 'warmer') && obj.text) {
      byKey.set(key, clampStr(obj.text, 2000));
    }
  }
  const order: ReformulateVariant['key'][] = ['balanced', 'shorter', 'warmer'];
  const variants = order
    .filter((k) => byKey.has(k))
    .map((k) => ({ key: k, text: byKey.get(k) as string }));
  if (variants.length === 0) throw new Error('AI returned no usable variants');
  return { variants };
}

/* ================================================================ goals === */

export type SuggestGoalsInput = { name: string; brief?: string; duration?: number };
export type SuggestGoalsResult = { goals: string[] };

const GOALS_SYSTEM = `You propose success goals for a company's internship project. Each goal is one concrete, outcome-focused statement an intern could be measured against by the end.

Rules:
- At most 3 goals.
- Each goal under 120 characters, one line, no numbering or bullet characters.
- Make them specific to the project, not generic filler.

Reply in the SAME language as the input. Return JSON only:

{ "goals": ["...", "...", "..."] }`;

export async function suggestGoals(input: SuggestGoalsInput): Promise<SuggestGoalsResult> {
  const user = [
    `Project: ${input.name}`,
    input.brief ? `Brief: ${input.brief}` : null,
    input.duration ? `Duration: ${input.duration} weeks` : null,
  ]
    .filter(Boolean)
    .join('\n');
  const text = await complete(GOALS_SYSTEM, user, 400);
  const raw = extractJson<{ goals?: unknown }>(text);
  const goals = asArray(raw.goals)
    .map((g) => clampStr(g, 120))
    .filter((g) => g.length > 0)
    .slice(0, 3);
  if (goals.length === 0) throw new Error('AI returned no usable goals');
  return { goals };
}

/* =============================================================== phases === */

export type DraftPhasesInput = { name: string; brief?: string; duration: number };
export type DraftPhase = {
  name: string;
  description?: string;
  fromWeek: number;
  toWeek: number;
};
export type DraftPhasesResult = { phases: DraftPhase[] };

const PHASES_SYSTEM = `You break an internship project into sequential phases mapped to its week clock.

Rules:
- At most 6 phases, in order, covering week 1 through the final week with no gaps or overlaps.
- Each phase: a short name (under 60 chars) and a one-line description (under 160 chars).
- fromWeek/toWeek are whole week numbers within the project's total weeks; fromWeek <= toWeek; the first phase starts at week 1; the last phase ends at the final week.

Reply in the SAME language as the input. Return JSON only:

{ "phases": [ { "name": "...", "description": "...", "fromWeek": 1, "toWeek": 2 } ] }`;

export async function draftPhases(input: DraftPhasesInput): Promise<DraftPhasesResult> {
  const weeks = clampInt(input.duration, 1, 52, 12);
  const user = [
    `Project: ${input.name}`,
    input.brief ? `Brief: ${input.brief}` : null,
    `Total duration: ${weeks} weeks`,
  ]
    .filter(Boolean)
    .join('\n');
  const text = await complete(PHASES_SYSTEM, user, 800);
  const raw = extractJson<{ phases?: unknown }>(text);
  const phases: DraftPhase[] = [];
  for (const p of asArray(raw.phases).slice(0, 6)) {
    const obj = p as { name?: unknown; description?: unknown; fromWeek?: unknown; toWeek?: unknown };
    const name = clampStr(obj.name, 60);
    if (!name) continue;
    const fromWeek = clampInt(obj.fromWeek, 1, weeks, 1);
    const toWeek = clampInt(obj.toWeek, fromWeek, weeks, fromWeek);
    const description = clampStr(obj.description, 160);
    phases.push({ name, fromWeek, toWeek, ...(description ? { description } : {}) });
  }
  if (phases.length === 0) throw new Error('AI returned no usable phases');
  return { phases };
}

/* ========================================================= deliverables === */

export type SuggestDeliverablesInput = {
  title: string;
  description: string;
  skills?: string[];
  duration: number;
};
export type SuggestedDeliverable = {
  name: string;
  description?: string;
  dueWeek: number;
};
export type SuggestDeliverablesResult = { deliverables: SuggestedDeliverable[] };

const DELIVERABLES_SYSTEM = `You propose concrete deliverables for an internship — the tangible artifacts an intern hands in.

Rules:
- Between 3 and 6 deliverables, ordered by due week (earliest first).
- Each: a short name (under 120 chars) and a one-line description of what "done" means (under 280 chars).
- dueWeek is a whole week number within the internship's total weeks; spread them across the timeline, last one at or before the final week.

Reply in the SAME language as the input. Return JSON only:

{ "deliverables": [ { "name": "...", "description": "...", "dueWeek": 4 } ] }`;

export async function suggestDeliverables(
  input: SuggestDeliverablesInput,
): Promise<SuggestDeliverablesResult> {
  const weeks = clampInt(input.duration, 1, 52, 12);
  const user = [
    `Internship: ${input.title}`,
    `Description: ${input.description}`,
    input.skills?.length ? `Skills: ${input.skills.join(', ')}` : null,
    `Total duration: ${weeks} weeks`,
  ]
    .filter(Boolean)
    .join('\n');
  const text = await complete(DELIVERABLES_SYSTEM, user, 800);
  const raw = extractJson<{ deliverables?: unknown }>(text);
  const deliverables: SuggestedDeliverable[] = [];
  for (const d of asArray(raw.deliverables).slice(0, 10)) {
    const obj = d as { name?: unknown; description?: unknown; dueWeek?: unknown };
    const name = clampStr(obj.name, 120);
    if (!name) continue;
    const dueWeek = clampInt(obj.dueWeek, 1, weeks, weeks);
    const description = clampStr(obj.description, 280);
    deliverables.push({ name, dueWeek, ...(description ? { description } : {}) });
  }
  if (deliverables.length === 0) throw new Error('AI returned no usable deliverables');
  return { deliverables };
}

/* ============================================================ questions === */

export type SuggestQuestionsInput = {
  title: string;
  description: string;
  skills?: string[];
};
export type SuggestQuestionsResult = { questions: string[] };

const QUESTIONS_SYSTEM = `You propose application questions a company asks internship applicants — questions that surface fit, motivation, and relevant experience for THIS role.

Rules:
- Between 1 and 3 questions.
- Each question under 400 characters, ends with a question mark, open-ended (not yes/no).
- Tailor them to the role and its skills; avoid generic "why do you want this job" filler.

Reply in the SAME language as the input. Return JSON only:

{ "questions": ["...", "..."] }`;

export async function suggestQuestions(
  input: SuggestQuestionsInput,
): Promise<SuggestQuestionsResult> {
  const user = [
    `Internship: ${input.title}`,
    `Description: ${input.description}`,
    input.skills?.length ? `Skills: ${input.skills.join(', ')}` : null,
  ]
    .filter(Boolean)
    .join('\n');
  const text = await complete(QUESTIONS_SYSTEM, user, 500);
  const raw = extractJson<{ questions?: unknown }>(text);
  const questions = asArray(raw.questions)
    .map((q) => clampStr(q, 400))
    .filter((q) => q.length > 0)
    .slice(0, 3);
  if (questions.length === 0) throw new Error('AI returned no usable questions');
  return { questions };
}
