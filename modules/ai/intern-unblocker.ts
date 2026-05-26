import Anthropic from '@anthropic-ai/sdk';
import { requireEnv } from '@/lib/env';

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: requireEnv('ANTHROPIC_API_KEY') });
  return _client;
}

const SYSTEM = `You help an intern articulate what they're stuck on so their supervisor can help quickly.

Given the intern's free-form description of what's blocking them, draft a short comment (under 80 words) that:
- Restates the problem clearly
- Lists what they've already tried (if mentioned)
- Asks one specific question the supervisor can answer

Tone: respectful, concrete, no apologies. Reply in the SAME language as the input.
Return plain text only — no JSON, no preamble.`;

export async function draftUnblockerMessage(
  blockerText: string,
  taskContext: string,
): Promise<string> {
  const res = await client().messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 400,
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Task context:\n${taskContext}\n\nIntern's blocker description:\n${blockerText}`,
      },
    ],
  });

  return res.content
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join('')
    .trim();
}
