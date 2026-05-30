/**
 * Rule-based Pulse — the fallback when no AI key (local dev), when the
 * kill-switch is off, or when an AI call errors. Encodes the same "open-loop
 * first, conservative on at-risk" logic as the prompt, in plain rules, with
 * locale-branched copy so the card is fully usable before the AI is live.
 */
import type { Pulse, PulseSignals, PulseVerdict } from './types';

const pick = (locale: 'fr' | 'en', fr: string, en: string) => (locale === 'fr' ? fr : en);

function truncate(s: string, n = 60): string {
  const one = s.replace(/\s+/g, ' ').trim();
  return one.length > n ? one.slice(0, n).trimEnd() + '…' : one;
}

export function heuristicVerdict(s: PulseSignals): PulseVerdict {
  const L = s.locale;
  const name = s.internName;

  // too-early — don't invent a flag on a fresh internship
  if (s.checkins.length === 0 && (s.tasks.total === 0 || s.weeksElapsed < 1)) {
    return {
      status: 'too-early',
      headline: pick(L, `${name} vient de démarrer`, `${name} just started`),
      why: pick(L, "Pas encore assez d'activité pour un vrai diagnostic.", 'Not enough activity yet to read.'),
      evidence: [pick(L, `${s.checkins.length} point(s) hebdo`, `${s.checkins.length} check-in(s)`)],
      action: pick(L, 'Revenez après le premier point hebdo.', 'Check back after the first check-in.'),
    };
  }

  // Signal extraction
  const staleDeliverable = s.deliverables.find(
    (d) => d.submittedAt && !d.hasFeedback && (d.daysSinceSubmit ?? 0) >= 2,
  );
  const supervisorAbsent = (s.daysSinceSupervisorTouch ?? 0) >= 5;
  const latestStuck = s.checkins[0]?.stuck?.trim() ?? '';
  const internFlaggedWait =
    !!latestStuck &&
    /attente|attend|wait|feedback|retour|direction|review|valider|décision|decision|réponse|response/i.test(
      latestStuck,
    );
  const heavyRevisions = s.deliverables.some((d) => d.status !== 'approved' && d.revisions >= 2);
  const tasksStalled = (s.tasks.daysSinceAnyUpdate ?? 0) >= 7 && s.tasks.total > 0;
  const negatives = [heavyRevisions, tasksStalled, supervisorAbsent && !!latestStuck].filter(Boolean).length;

  // at-risk — only on a clear, multi-signal decline
  if (negatives >= 2) {
    const ev: string[] = [];
    if (heavyRevisions) ev.push(pick(L, 'un livrable repris 2+ fois, non validé', 'a deliverable revised 2+ times, still not approved'));
    if (tasksStalled) ev.push(pick(L, `aucune tâche bougée depuis ${s.tasks.daysSinceAnyUpdate} j`, `no task moved in ${s.tasks.daysSinceAnyUpdate}d`));
    if (latestStuck) ev.push(pick(L, `blocage signalé : « ${truncate(latestStuck)} »`, `flagged blocker: "${truncate(latestStuck)}"`));
    return {
      status: 'at-risk',
      headline: pick(L, `${name} décroche — plusieurs signaux`, `${name} is slipping — multiple signals`),
      why: pick(L, 'Plusieurs signaux baissent en même temps. À traiter cette semaine, pas la prochaine.', 'Several signals are sliding at once. Worth handling this week, not next.'),
      evidence: ev.slice(0, 3),
      action: pick(L, 'Planifiez un vrai point 1:1 cette semaine.', 'Book a real 1:1 this week.'),
    };
  }

  // attention — the supervisor's own open loop
  if (staleDeliverable || (internFlaggedWait && supervisorAbsent)) {
    const ev: string[] = [];
    if (staleDeliverable) ev.push(pick(L, `« ${truncate(staleDeliverable.title)} » soumis, sans retour depuis ${staleDeliverable.daysSinceSubmit} j`, `"${truncate(staleDeliverable.title)}" submitted, no feedback for ${staleDeliverable.daysSinceSubmit}d`));
    if (internFlaggedWait) ev.push(pick(L, `${name} attendait : « ${truncate(latestStuck)} »`, `${name} was waiting on: "${truncate(latestStuck)}"`));
    else if (supervisorAbsent) ev.push(pick(L, `pas de retour superviseur depuis ${s.daysSinceSupervisorTouch} j`, `no supervisor activity in ${s.daysSinceSupervisorTouch}d`));
    return {
      status: 'attention',
      headline: pick(L, `${name} attend quelque chose de vous`, `${name} is waiting on you`),
      why: pick(L, `Une demande reste sans réponse de votre côté — et ${name} avance sans l'attendre. Risque de reprise.`, `An ask is unanswered on your side — and ${name} is moving on without it. Redo risk.`),
      evidence: ev.slice(0, 3),
      action: staleDeliverable
        ? pick(L, `Laissez un retour sur « ${truncate(staleDeliverable.title)} » aujourd'hui.`, `Leave feedback on "${truncate(staleDeliverable.title)}" today.`)
        : pick(L, `Répondez à ${name} sur ce point.`, `Get back to ${name} on this.`),
    };
  }

  // on-track
  return {
    status: 'on-track',
    headline: pick(L, `${name} avance bien`, `${name} is on track`),
    why: pick(L, 'Rythme régulier, rien en attente de votre côté.', 'Steady pace, nothing waiting on you.'),
    evidence: [
      pick(L, `${s.tasks.done}/${s.tasks.total} tâches faites`, `${s.tasks.done}/${s.tasks.total} tasks done`),
      ...(s.checkins.length ? [pick(L, `${s.checkins.length} point(s) hebdo`, `${s.checkins.length} check-in(s)`)] : []),
    ].slice(0, 3),
    action: pick(L, 'Rien à faire — laissez-le avancer.', 'Nothing needed — let them run.'),
  };
}

export function heuristicPulse(s: PulseSignals): Pulse {
  return { ...heuristicVerdict(s), source: 'heuristic', generatedAt: new Date().toISOString() };
}
