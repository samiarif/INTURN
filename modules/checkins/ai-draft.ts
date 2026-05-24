import Anthropic from '@anthropic-ai/sdk';
import type { Event, Task, Deliverable } from '@/db/schema';

export type Draft = {
  shipped: string;
  stuck: string;
  next: string;
  source: 'ai' | 'template';
};

function templateDraft(input: {
  weekEvents: Event[];
  tasks: Task[];
  deliverables: Deliverable[];
}): Draft {
  const tasksDone = input.tasks.filter((t) => t.status === 'done');
  const tasksInProgress = input.tasks.filter((t) => t.status === 'in-progress' || t.status === 'review');
  const tasksTodo = input.tasks.filter((t) => t.status === 'todo');
  const delivsSubmitted = input.deliverables.filter((d) =>
    ['submitted', 'approved'].includes(d.status ?? ''),
  );
  const delivsRevision = input.deliverables.filter((d) => d.status === 'revision-requested');

  const shippedLines = [
    ...tasksDone.slice(0, 4).map((t) => `- Closed ${t.tag ?? ''} ${t.title}`),
    ...delivsSubmitted.slice(0, 3).map((d) => `- Submitted ${d.title} (v${d.version})`),
  ];

  const stuckLines = [
    ...tasksInProgress.slice(0, 2).map((t) => `- Still working through ${t.tag ?? ''} ${t.title}`),
    ...delivsRevision.slice(0, 2).map((d) => `- Need feedback on ${d.title} revisions`),
  ];

  const nextLines = [
    ...tasksTodo.slice(0, 3).map((t) => `- Start ${t.tag ?? ''} ${t.title}`),
  ];

  return {
    shipped: shippedLines.length > 0 ? shippedLines.join('\n') : '- (nothing this week)',
    stuck: stuckLines.length > 0 ? stuckLines.join('\n') : '- Nothing blocking',
    next: nextLines.length > 0 ? nextLines.join('\n') : '- Coordinate with supervisor',
    source: 'template',
  };
}

export async function generateCheckInDraft(input: {
  weekEvents: Event[];
  tasks: Task[];
  deliverables: Deliverable[];
  internshipTitle: string;
  internName: string;
}): Promise<Draft> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return templateDraft(input);

  const summary = {
    internshipTitle: input.internshipTitle,
    internName: input.internName,
    events: input.weekEvents.slice(0, 30).map((e) => ({
      type: e.type,
      at: new Date(e.createdAt).toISOString(),
      metadata: e.metadata ?? {},
    })),
    tasks: input.tasks.map((t) => ({
      tag: t.tag,
      title: t.title,
      status: t.status,
      dueDate: t.dueDate,
    })),
    deliverables: input.deliverables.map((d) => ({
      title: d.title,
      status: d.status,
      version: d.version,
    })),
  };

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: `You are drafting a weekly check-in for an intern at a Tunisian internship platform.
Output ONLY valid minified JSON with three keys: "shipped", "stuck", "next".
Each value is a single string with line-broken bullets (each line starting with "- ").
Be concrete and specific — reference task tags, deliverable titles, dates. No fluff.
Keep each section to 2-5 bullets. The intern will edit before sending — give them a strong starting point.`,
      messages: [
        {
          role: 'user',
          content: `Workspace summary:\n\n${JSON.stringify(summary, null, 2)}\n\nDraft the check-in now. Output JSON only.`,
        },
      ],
    });

    const textBlock = message.content.find((c) => c.type === 'text');
    if (!textBlock || textBlock.type !== 'text') return templateDraft(input);
    const raw = textBlock.text.trim();
    // Strip ```json fences if Claude added them
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
    const parsed = JSON.parse(cleaned);
    if (
      typeof parsed.shipped === 'string' &&
      typeof parsed.stuck === 'string' &&
      typeof parsed.next === 'string'
    ) {
      return { ...parsed, source: 'ai' };
    }
    return templateDraft(input);
  } catch (e) {
    console.error('AI draft failed, falling back to template', e);
    return templateDraft(input);
  }
}
