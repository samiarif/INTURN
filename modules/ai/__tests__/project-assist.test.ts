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
  generateSprintPlan,
  brainstormSprintTasks,
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

describe('generateSprintPlan', () => {
  it('returns parsed sprints with name and goal', async () => {
    reply({
      sprints: [
        { name: 'Sprint 1', goal: 'Set up project foundations' },
        { name: 'Sprint 2', goal: 'Build core feature' },
        { name: 'Sprint 3', goal: 'Testing and polish' },
      ],
    });
    const out = await generateSprintPlan({ name: 'Brand Redesign' });
    expect(out.sprints).toHaveLength(3);
    expect(out.sprints[0].name).toBe('Sprint 1');
    expect(out.sprints[0].goal).toBe('Set up project foundations');
  });

  it('caps at 8 sprints and drops extras', async () => {
    reply({
      sprints: Array.from({ length: 10 }, (_, i) => ({
        name: `Sprint ${i + 1}`,
        goal: 'Do something',
      })),
    });
    const out = await generateSprintPlan({ name: 'Long Project' });
    expect(out.sprints).toHaveLength(8);
  });

  it('clamps name to 80 chars and goal to 160 chars', async () => {
    reply({
      sprints: [{ name: 'n'.repeat(100), goal: 'g'.repeat(200) }],
    });
    const out = await generateSprintPlan({ name: 'Test' });
    expect(out.sprints[0].name.length).toBe(80);
    expect(out.sprints[0].goal?.length).toBe(160);
  });

  it('drops sprints with no name', async () => {
    reply({
      sprints: [
        { name: '', goal: 'Orphan goal' },
        { name: 'Valid Sprint', goal: 'Real goal' },
      ],
    });
    const out = await generateSprintPlan({ name: 'Test' });
    expect(out.sprints).toHaveLength(1);
    expect(out.sprints[0].name).toBe('Valid Sprint');
  });

  it('omits goal key when goal is empty string', async () => {
    reply({ sprints: [{ name: 'Sprint 1', goal: '' }] });
    const out = await generateSprintPlan({ name: 'Test' });
    expect(out.sprints[0]).not.toHaveProperty('goal');
  });

  it('throws when AI returns no usable sprints', async () => {
    reply({ sprints: [] });
    await expect(generateSprintPlan({ name: 'Test' })).rejects.toThrow(
      'AI returned no usable sprints',
    );
  });

  it('throws when AI returns only nameless sprints', async () => {
    reply({ sprints: [{ name: '', goal: 'something' }, { name: '   ', goal: 'other' }] });
    await expect(generateSprintPlan({ name: 'Test' })).rejects.toThrow(
      'AI returned no usable sprints',
    );
  });

  it('throws when AI returns garbage (no JSON)', async () => {
    reply('I cannot generate a sprint plan right now.');
    await expect(generateSprintPlan({ name: 'Test' })).rejects.toThrow();
  });

  it('extracts JSON even when wrapped in prose', async () => {
    reply({ sprints: [{ name: 'Discovery', goal: 'Understand the scope' }] }, { prose: true });
    const out = await generateSprintPlan({ name: 'Test' });
    expect(out.sprints[0].name).toBe('Discovery');
  });
});

describe('brainstormSprintTasks', () => {
  it('returns parsed tasks with title and description', async () => {
    reply({
      tasks: [
        { title: 'Set up repo', description: 'Initialize git and CI' },
        { title: 'Write specs', description: 'Define acceptance criteria' },
        { title: 'Implement feature', description: 'Build the core logic' },
      ],
    });
    const out = await brainstormSprintTasks({
      sprintName: 'Sprint 1',
      projectName: 'Brand Redesign',
    });
    expect(out.tasks).toHaveLength(3);
    expect(out.tasks[0].title).toBe('Set up repo');
    expect(out.tasks[0].description).toBe('Initialize git and CI');
  });

  it('caps at 8 tasks and drops extras', async () => {
    reply({
      tasks: Array.from({ length: 12 }, (_, i) => ({
        title: `Task ${i + 1}`,
        description: 'Do the thing',
      })),
    });
    const out = await brainstormSprintTasks({
      sprintName: 'Sprint 1',
      projectName: 'Test Project',
    });
    expect(out.tasks).toHaveLength(8);
  });

  it('clamps title to 120 chars and description to 240 chars', async () => {
    reply({
      tasks: [{ title: 't'.repeat(150), description: 'd'.repeat(300) }],
    });
    const out = await brainstormSprintTasks({
      sprintName: 'Sprint 1',
      projectName: 'Test',
    });
    expect(out.tasks[0].title.length).toBe(120);
    expect(out.tasks[0].description?.length).toBe(240);
  });

  it('drops tasks with no title', async () => {
    reply({
      tasks: [
        { title: '', description: 'Orphan task' },
        { title: 'Real task', description: 'Valid' },
      ],
    });
    const out = await brainstormSprintTasks({
      sprintName: 'Sprint 1',
      projectName: 'Test',
    });
    expect(out.tasks).toHaveLength(1);
    expect(out.tasks[0].title).toBe('Real task');
  });

  it('omits description key when description is empty string', async () => {
    reply({ tasks: [{ title: 'Do something', description: '' }] });
    const out = await brainstormSprintTasks({
      sprintName: 'Sprint 1',
      projectName: 'Test',
    });
    expect(out.tasks[0]).not.toHaveProperty('description');
  });

  it('throws when AI returns no usable tasks', async () => {
    reply({ tasks: [] });
    await expect(
      brainstormSprintTasks({ sprintName: 'Sprint 1', projectName: 'Test' }),
    ).rejects.toThrow('AI returned no usable tasks');
  });

  it('throws when AI returns only titleless tasks', async () => {
    reply({ tasks: [{ title: '', description: 'x' }, { title: '  ', description: 'y' }] });
    await expect(
      brainstormSprintTasks({ sprintName: 'Sprint 1', projectName: 'Test' }),
    ).rejects.toThrow('AI returned no usable tasks');
  });

  it('throws when AI returns garbage (no JSON)', async () => {
    reply('I cannot help with that.');
    await expect(
      brainstormSprintTasks({ sprintName: 'Sprint 1', projectName: 'Test' }),
    ).rejects.toThrow();
  });

  it('extracts JSON even when wrapped in prose', async () => {
    reply({ tasks: [{ title: 'Research competitors', description: 'Analyse top 5' }] }, { prose: true });
    const out = await brainstormSprintTasks({
      sprintName: 'Sprint 1',
      projectName: 'Test',
    });
    expect(out.tasks[0].title).toBe('Research competitors');
  });
});
