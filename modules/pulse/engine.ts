/**
 * Pulse engine. AI synthesis when ANTHROPIC_API_KEY is set (prod) and the
 * PULSE_ENABLED kill-switch isn't off; heuristic otherwise (local dev) and on
 * any AI error. React-cached so one render = one synthesis.
 *
 * ACTIVATION: nothing to wire — set ANTHROPIC_API_KEY (prod already has it).
 * KILL-SWITCH: PULSE_ENABLED=0 forces heuristic everywhere.
 *
 * Server-only (imports the Anthropic SDK). Persisted weekly cache = P1.
 */
import { cache } from 'react';
import Anthropic from '@anthropic-ai/sdk';
import { gatherPulseSignals } from './signals';
import { heuristicPulse } from './heuristic';
import { pulseSystem, pulseUserMessage } from './prompt';
import { pulseVerdictSchema, type Pulse, type PulseSignals } from './types';

let _client: Anthropic | null = null;
function client(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  if (!_client) _client = new Anthropic({ apiKey });
  return _client;
}

export function pulseAiEnabled(): boolean {
  return process.env.PULSE_ENABLED !== '0' && !!process.env.ANTHROPIC_API_KEY;
}

function extractJson(text: string): unknown {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('AI did not return parseable JSON');
  return JSON.parse(m[0]);
}

async function aiPulse(signals: PulseSignals): Promise<Pulse> {
  const c = client();
  if (!c) throw new Error('no anthropic client');
  const res = await c.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 600,
    system: pulseSystem(signals.locale),
    messages: [{ role: 'user', content: pulseUserMessage(signals) }],
  });
  const text = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
  const verdict = pulseVerdictSchema.parse(extractJson(text));
  return { ...verdict, source: 'ai', generatedAt: new Date().toISOString() };
}

export const getPulse = cache(
  async (workspaceId: string, locale: 'fr' | 'en'): Promise<Pulse | null> => {
    const signals = await gatherPulseSignals(workspaceId, locale);
    if (!signals) return null;
    if (!pulseAiEnabled()) return heuristicPulse(signals);
    try {
      return await aiPulse(signals);
    } catch {
      return heuristicPulse(signals); // never let a model hiccup break the page
    }
  },
);
