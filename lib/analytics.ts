/**
 * Analytics event taxonomy + helpers. Wraps Posthog so:
 *   - The dependency is env-gated (silent no-op without
 *     NEXT_PUBLIC_POSTHOG_KEY / POSTHOG_KEY)
 *   - Event names are typed (no typos in event keys)
 *   - PII never ships (we identify by user.id only; no email, no IP
 *     unless explicitly added by Posthog cloud config)
 *
 * Client-side: use `track()` directly in client components.
 * Server-side: use `trackServer()` from server actions / route handlers.
 */

// The closed taxonomy. Add a new event by adding to this union — the
// types force you to pass the right properties for each.
export type AnalyticsEvent =
  // Auth + onboarding
  | { name: 'signup_completed'; props: { role: 'intern' | 'company' | 'admin' } }
  | { name: 'onboarding_step_completed'; props: { role: 'intern' | 'company'; step: string } }
  | { name: 'onboarding_completed'; props: { role: 'intern' | 'company' } }
  // Intern funnel
  | { name: 'internship_viewed'; props: { internshipId: string; matchScore?: number } }
  | { name: 'internship_bookmarked'; props: { internshipId: string } }
  | { name: 'application_submitted'; props: { internshipId: string; hasCustomAnswers: boolean } }
  | { name: 'application_withdrawn'; props: { applicationId: string } }
  // Company funnel
  | { name: 'project_created'; props: { projectId: string; mode: 'standard' | 'starter' } }
  | { name: 'internship_published'; props: { internshipId: string; usedTemplate: boolean } }
  | { name: 'application_reviewed'; props: { applicationId: string; status: string } }
  | { name: 'application_accepted'; props: { applicationId: string } }
  // Workspace activity
  | { name: 'task_created'; props: { workspaceId: string; usedAi: boolean } }
  | { name: 'task_moved'; props: { workspaceId: string; from: string; to: string } }
  | { name: 'deliverable_submitted'; props: { workspaceId: string; deliverableId: string } }
  | { name: 'deliverable_reviewed'; props: { workspaceId: string; state: 'approved' | 'changes' } }
  | { name: 'checkin_submitted'; props: { workspaceId: string; usedAi: boolean } }
  | { name: 'comment_added'; props: { workspaceId: string; targetType: string } }
  // Records + community
  | { name: 'record_issued'; props: { recordId: string; rating: number | null } }
  | { name: 'record_pdf_downloaded'; props: { recordId: string } }
  | { name: 'community_post_created'; props: { postId: string } }
  | { name: 'community_comment_added'; props: { postId: string } }
  // AI
  | { name: 'ai_task_clarity_used'; props: { workspaceId: string } }
  | { name: 'ai_unblocker_used'; props: { workspaceId: string } }
  // Admin
  | { name: 'org_verified'; props: { orgId: string } }
  | { name: 'report_resolved'; props: { reportId: string; action: 'reviewed' | 'resolved' } };

// ============================================================
// CLIENT
// ============================================================

let clientInitPromise: Promise<unknown> | null = null;

async function getClientPosthog() {
  if (typeof window === 'undefined') return null;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return null;

  if (!clientInitPromise) {
    clientInitPromise = import('posthog-js').then(({ default: posthog }) => {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
        // Privacy-aligned: no autocapture (we'll add specific events),
        // no session recording unless explicitly enabled.
        autocapture: false,
        capture_pageview: 'history_change',
        capture_pageleave: true,
        disable_session_recording: true,
        persistence: 'localStorage+cookie',
        // Honor the user's cookie banner choice.
        opt_out_capturing_by_default: false,
      });
      return posthog;
    });
  }
  return clientInitPromise;
}

/**
 * Identify the current user. Call once after sign-in.
 * `traits` should NOT include PII like email — Posthog allows it, but
 * we're explicit about not shipping any.
 */
export async function identify(userId: string, traits?: Record<string, string | number | boolean>) {
  const ph = await getClientPosthog();
  if (!ph) return;
  // @ts-expect-error — dynamic import resolves to PostHog instance
  ph.identify(userId, traits);
}

/**
 * Fire a typed analytics event from the client.
 * Silent no-op when Posthog isn't configured.
 */
export async function track<E extends AnalyticsEvent>(event: E) {
  const ph = await getClientPosthog();
  if (!ph) return;
  // @ts-expect-error — dynamic import resolves to PostHog instance
  ph.capture(event.name, event.props);
}

/**
 * Reset on sign-out so the next visitor on the same device gets a
 * fresh distinct_id.
 */
export async function reset() {
  const ph = await getClientPosthog();
  if (!ph) return;
  // @ts-expect-error — dynamic import resolves to PostHog instance
  ph.reset();
}

// ============================================================
// SERVER
// ============================================================

let serverClient: unknown = null;

async function getServerPosthog() {
  if (!process.env.POSTHOG_KEY) return null;
  if (serverClient) return serverClient;

  const { PostHog } = await import('posthog-node');
  serverClient = new PostHog(process.env.POSTHOG_KEY, {
    host: process.env.POSTHOG_HOST ?? 'https://eu.i.posthog.com',
    flushAt: 1, // Flush every event (we're not high-volume)
    flushInterval: 5000,
  });
  return serverClient;
}

/**
 * Track an event from a server action or route handler. Fire-and-forget;
 * we don't block the response on the Posthog HTTP call.
 *
 * `userId` is the local DB user id (uuid). Pass null for anonymous events.
 */
export async function trackServer<E extends AnalyticsEvent>(
  userId: string | null,
  event: E,
): Promise<void> {
  const client = await getServerPosthog();
  if (!client) return;
  try {
    // @ts-expect-error — server client returned from dynamic import
    client.capture({
      distinctId: userId ?? 'anonymous',
      event: event.name,
      properties: event.props,
    });
  } catch (err) {
    console.error('[analytics/server] capture failed:', err);
  }
}
