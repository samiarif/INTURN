/**
 * Pulse — the AI co-supervisor read on one internship.
 *
 * Both the AI engine and the heuristic fallback produce the SAME shape, so the
 * UI never branches on source. `why` / `headline` / `action` are already in the
 * supervisor's locale (the AI is prompted in-locale; the heuristic templates
 * are locale-branched).
 */
import { z } from 'zod';

export const PULSE_STATUSES = ['on-track', 'attention', 'at-risk', 'too-early'] as const;
export type PulseStatus = (typeof PULSE_STATUSES)[number];

/** Severity order for sorting the dashboard worst-first. */
export const PULSE_SEVERITY: Record<PulseStatus, number> = {
  'at-risk': 0,
  attention: 1,
  'on-track': 2,
  'too-early': 3,
};

/** The model's (or heuristic's) structured verdict. Validated before use. */
export const pulseVerdictSchema = z.object({
  status: z.enum(PULSE_STATUSES),
  headline: z.string().min(1).max(120),
  why: z.string().max(600),
  evidence: z.array(z.string().max(200)).max(4).default([]),
  action: z.string().min(1).max(240),
});
export type PulseVerdict = z.infer<typeof pulseVerdictSchema>;

export type Pulse = PulseVerdict & {
  source: 'ai' | 'heuristic';
  generatedAt: string; // ISO
};

/** Everything the engine reads about one workspace. Derived, model-ready. */
export type PulseSignals = {
  locale: 'fr' | 'en';
  internName: string;
  internshipTitle: string;
  orgName: string;
  weeksElapsed: number;
  weeksTotal: number | null;
  checkins: Array<{ at: string; shipped: string; stuck: string; next: string }>;
  deliverables: Array<{
    title: string;
    status: string;
    version: number;
    revisions: number;
    hasFeedback: boolean;
    submittedAt: string | null;
    daysSinceSubmit: number | null;
  }>;
  tasks: {
    total: number;
    done: number;
    inProgress: number;
    review: number;
    todo: number;
    daysSinceAnyUpdate: number | null;
  };
  /** Days since the supervisor (anyone but the intern) last did anything here. */
  daysSinceSupervisorTouch: number | null;
};
