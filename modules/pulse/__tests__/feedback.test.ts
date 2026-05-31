import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the Anthropic SDK — a shared create spy backs every lazy client instance.
const create = vi.fn();
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create };
  },
}));
// Neutralize the transitive @/db import (gatherFeedbackContext uses it; the
// draftRevisionFeedback tests below never call gatherFeedbackContext).
vi.mock('@/db', () => ({ db: {} }));

import { draftRevisionFeedback } from '../feedback';
import type { FeedbackContext } from '../feedback-prompt';

const ctx: FeedbackContext = {
  locale: 'fr',
  deliverableTitle: 'Brand audit deck',
  deliverableDescription: null,
  version: 2,
  internFirstName: 'Arif',
  submissionNote: 'section concurrents pas complète',
  priorReviews: [],
  taskTitle: null,
  recentCheckins: [],
};

const savedKey = process.env.ANTHROPIC_API_KEY;
const savedFlag = process.env.PULSE_ENABLED;
afterEach(() => {
  process.env.ANTHROPIC_API_KEY = savedKey;
  process.env.PULSE_ENABLED = savedFlag;
});
beforeEach(() => create.mockReset());

describe('draftRevisionFeedback — AI path', () => {
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    delete process.env.PULSE_ENABLED;
  });

  it('returns the model prose with source ai', async () => {
    create.mockResolvedValueOnce({ content: [{ type: 'text', text: 'Bonjour Arif, deux points…' }] });
    const out = await draftRevisionFeedback(ctx);
    expect(out).toEqual({ text: 'Bonjour Arif, deux points…', source: 'ai' });
  });

  it('falls back to heuristic when the model errors', async () => {
    create.mockRejectedValueOnce(new Error('boom'));
    const out = await draftRevisionFeedback(ctx);
    expect(out.source).toBe('heuristic');
    expect(out.text).toContain('Arif');
  });

  it('falls back to heuristic when the model returns empty text', async () => {
    create.mockResolvedValueOnce({ content: [{ type: 'text', text: '   ' }] });
    const out = await draftRevisionFeedback(ctx);
    expect(out.source).toBe('heuristic');
  });
});

describe('draftRevisionFeedback — AI disabled', () => {
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    process.env.PULSE_ENABLED = '0';
  });

  it('returns a scaffold without calling the model (draft mode)', async () => {
    const out = await draftRevisionFeedback(ctx);
    expect(create).not.toHaveBeenCalled();
    expect(out.source).toBe('heuristic');
    expect(out.text).toContain('Arif');
  });

  it('reformulate with AI off returns the supervisor notes unchanged', async () => {
    const out = await draftRevisionFeedback(ctx, { draft: '  typo mieux. concurrents manque.  ' });
    expect(create).not.toHaveBeenCalled();
    expect(out).toEqual({ text: 'typo mieux. concurrents manque.', source: 'heuristic' });
  });
});
