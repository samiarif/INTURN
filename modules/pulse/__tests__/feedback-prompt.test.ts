import { describe, it, expect } from 'vitest';
import { feedbackSystem, feedbackUserMessage, type FeedbackContext } from '../feedback-prompt';

const ctx: FeedbackContext = {
  locale: 'fr',
  deliverableTitle: 'Brand audit deck',
  deliverableDescription: null,
  version: 2,
  internFirstName: 'Arif',
  submissionNote: 'section concurrents pas complète',
  priorReviews: ['Manque une hiérarchie visuelle.'],
  taskTitle: 'Audit',
  recentCheckins: [{ shipped: 'v2', stuck: 'rien', next: 'concurrents' }],
};

describe('feedbackSystem', () => {
  it('injects the locale and keeps the honesty guardrail', () => {
    const fr = feedbackSystem('fr');
    expect(fr).toContain('fr (fr = French');
    expect(fr).toMatch(/NOT seen|Never invent/);
    const en = feedbackSystem('en');
    expect(en).toContain('en (fr = French');
  });
});

describe('feedbackUserMessage', () => {
  it('draft mode: no supervisor notes, mode=draft, carries context', () => {
    const msg = feedbackUserMessage(ctx);
    const parsed = JSON.parse(msg);
    expect(parsed.mode).toBe('draft');
    expect(parsed.supervisorNotes).toBeUndefined();
    expect(parsed.intern).toBe('Arif');
    expect(parsed.internSubmissionNote).toBe('section concurrents pas complète');
    expect(parsed.priorReviews).toEqual(['Manque une hiérarchie visuelle.']);
  });

  it('reformulate mode: carries the supervisor notes and flips the mode', () => {
    const msg = feedbackUserMessage(ctx, { draft: 'typo mieux. concurrents manque.' });
    const parsed = JSON.parse(msg);
    expect(parsed.mode).toBe('reformulate');
    expect(parsed.supervisorNotes).toBe('typo mieux. concurrents manque.');
  });

  it('treats whitespace-only draft as draft mode', () => {
    const parsed = JSON.parse(feedbackUserMessage(ctx, { draft: '   ' }));
    expect(parsed.mode).toBe('draft');
    expect(parsed.supervisorNotes).toBeUndefined();
  });
});
