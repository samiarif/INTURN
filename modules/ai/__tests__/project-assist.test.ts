import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Mock the Anthropic SDK so no network call happens. The module constructs the
 * client lazily, so a single shared `create` spy backs every instance; each
 * test queues the next reply with `reply()`.
 */
const create = vi.fn();
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create };
  },
}));

import {
  reformulateDescription,
  suggestGoals,
  draftPhases,
  suggestDeliverables,
  suggestQuestions,
} from '../project-assist';

/** Queue the model's next text reply (object is JSON-stringified). */
function reply(payload: unknown, { prose = false } = {}) {
  const text =
    typeof payload === 'string'
      ? payload
      : prose
        ? `Sure! Here you go:\n\n${JSON.stringify(payload)}\n\nHope that helps.`
        : JSON.stringify(payload);
  create.mockResolvedValueOnce({ content: [{ type: 'text', text }] });
}

beforeEach(() => {
  create.mockReset();
  process.env.ANTHROPIC_API_KEY = 'test-key';
});

describe('reformulateDescription', () => {
  it('returns the three variants in balanced/shorter/warmer order', async () => {
    reply({
      variants: [
        { key: 'warmer', text: 'Warm version' },
        { key: 'balanced', text: 'Balanced version' },
        { key: 'shorter', text: 'Short' },
      ],
    });
    const out = await reformulateDescription({ text: 'A description worth refining.' });
    expect(out.variants.map((v) => v.key)).toEqual(['balanced', 'shorter', 'warmer']);
    expect(out.variants[0].text).toBe('Balanced version');
  });

  it('drops unknown keys and clamps text to 2000 chars', async () => {
    reply({
      variants: [
        { key: 'balanced', text: 'x'.repeat(2500) },
        { key: 'spicy', text: 'should be dropped' },
      ],
    });
    const out = await reformulateDescription({ text: 'seed text here please' });
    expect(out.variants).toHaveLength(1);
    expect(out.variants[0].key).toBe('balanced');
    expect(out.variants[0].text.length).toBe(2000);
  });

  it('extracts JSON even when wrapped in prose', async () => {
    reply({ variants: [{ key: 'balanced', text: 'ok' }] }, { prose: true });
    const out = await reformulateDescription({ text: 'seed text here please' });
    expect(out.variants[0].text).toBe('ok');
  });

  it('throws when no JSON is present', async () => {
    reply('I cannot help with that.');
    await expect(reformulateDescription({ text: 'seed text here please' })).rejects.toThrow();
  });

  it('throws when there are no usable variants', async () => {
    reply({ variants: [{ key: 'nonsense', text: 'x' }] });
    await expect(reformulateDescription({ text: 'seed text here please' })).rejects.toThrow();
  });
});

describe('suggestGoals', () => {
  it('caps at 3 goals and truncates each to 120 chars', async () => {
    reply({ goals: ['g1', 'y'.repeat(200), 'g3', 'g4 should be dropped'] });
    const out = await suggestGoals({ name: 'Brand audit' });
    expect(out.goals).toHaveLength(3);
    expect(out.goals[1].length).toBe(120);
  });

  it('drops empty strings', async () => {
    reply({ goals: ['', '  ', 'real goal'] });
    const out = await suggestGoals({ name: 'Brand audit' });
    expect(out.goals).toEqual(['real goal']);
  });

  it('throws when no usable goals', async () => {
    reply({ goals: [] });
    await expect(suggestGoals({ name: 'Brand audit' })).rejects.toThrow();
  });
});

describe('draftPhases', () => {
  it('caps at 6 phases and clamps weeks into [1, duration]', async () => {
    reply({
      phases: Array.from({ length: 8 }, (_, i) => ({
        name: `Phase ${i + 1}`,
        description: 'desc',
        fromWeek: i + 1,
        toWeek: 99, // out of range -> clamped to duration
      })),
    });
    const out = await draftPhases({ name: 'Brand audit', duration: 10 });
    expect(out.phases).toHaveLength(6);
    for (const p of out.phases) {
      expect(p.fromWeek).toBeGreaterThanOrEqual(1);
      expect(p.toWeek).toBeLessThanOrEqual(10);
      expect(p.toWeek).toBeGreaterThanOrEqual(p.fromWeek);
    }
  });

  it('drops phases with no name and omits empty descriptions', async () => {
    reply({
      phases: [
        { name: '', fromWeek: 1, toWeek: 2 },
        { name: 'Discovery', fromWeek: 1, toWeek: 3 },
      ],
    });
    const out = await draftPhases({ name: 'Brand audit', duration: 12 });
    expect(out.phases).toHaveLength(1);
    expect(out.phases[0].name).toBe('Discovery');
    expect(out.phases[0]).not.toHaveProperty('description');
  });

  it('clamps name to 60 and description to 160', async () => {
    reply({ phases: [{ name: 'n'.repeat(80), description: 'd'.repeat(200), fromWeek: 1, toWeek: 2 }] });
    const out = await draftPhases({ name: 'Brand audit', duration: 12 });
    expect(out.phases[0].name.length).toBe(60);
    expect(out.phases[0].description?.length).toBe(160);
  });
});

describe('suggestDeliverables', () => {
  it('caps at 10, clamps dueWeek into [1, duration], truncates fields', async () => {
    reply({
      deliverables: Array.from({ length: 12 }, (_, i) => ({
        name: 'n'.repeat(140),
        description: 'd'.repeat(300),
        dueWeek: i === 0 ? 0 : 99,
      })),
    });
    const out = await suggestDeliverables({
      title: 'Visual designer',
      description: 'Design marketing assets for campaigns.',
      duration: 8,
    });
    expect(out.deliverables).toHaveLength(10);
    expect(out.deliverables[0].name.length).toBe(120);
    expect(out.deliverables[0].description?.length).toBe(280);
    for (const d of out.deliverables) {
      expect(d.dueWeek).toBeGreaterThanOrEqual(1);
      expect(d.dueWeek).toBeLessThanOrEqual(8);
    }
  });

  it('throws when no usable deliverables', async () => {
    reply({ deliverables: [{ name: '', dueWeek: 2 }] });
    await expect(
      suggestDeliverables({ title: 'x', description: 'y', duration: 8 }),
    ).rejects.toThrow();
  });
});

describe('suggestQuestions', () => {
  it('caps at 3 and truncates each to 400 chars', async () => {
    reply({ questions: ['q1?', 'z'.repeat(500), 'q3?', 'q4 dropped?'] });
    const out = await suggestQuestions({ title: 'Visual designer', description: 'desc' });
    expect(out.questions).toHaveLength(3);
    expect(out.questions[1].length).toBe(400);
  });

  it('throws when no usable questions', async () => {
    reply({ questions: ['', '   '] });
    await expect(
      suggestQuestions({ title: 'Visual designer', description: 'desc' }),
    ).rejects.toThrow();
  });
});
