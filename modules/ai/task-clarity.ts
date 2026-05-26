import Anthropic from '@anthropic-ai/sdk';
import { requireEnv } from '@/lib/env';

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: requireEnv('ANTHROPIC_API_KEY') });
  return _client;
}

const SYSTEM = `You help company supervisors write clearer internship task descriptions.

Given a draft task, return a refined version with:
- A clear, action-oriented scope (one sentence, max 120 chars)
- Concrete deliverable (what produces "done", max 100 chars)
- Suggested deadline if missing (YYYY-MM-DD or null)
- One-sentence "notes" explaining your reasoning

Reply in the SAME language as the input. Return JSON only:

{ "scope": "...", "deliverable": "...", "suggestedDeadline": "YYYY-MM-DD or null", "notes": "..." }

If the task is already clear, return the same fields with the original content and notes: "already clear".`;

export type TaskClarityInput = {
  title: string;
  description?: string | null;
  deadline?: string | null;
};

export type TaskClarityResponse = {
  scope: string;
  deliverable: string;
  suggestedDeadline: string | null;
  notes: string;
};

export async function suggestTaskClarity(
  input: TaskClarityInput,
): Promise<TaskClarityResponse> {
  const userMsg = `Title: ${input.title}\nDescription: ${input.description ?? '(empty)'}\nCurrent deadline: ${input.deadline ?? '(none)'}`;

  const res = await client().messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 600,
    system: SYSTEM,
    messages: [{ role: 'user', content: userMsg }],
  });

  const text = res.content
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join('');

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI did not return parseable JSON');

  return JSON.parse(match[0]) as TaskClarityResponse;
}
