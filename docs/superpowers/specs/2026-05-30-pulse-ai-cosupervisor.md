# Pulse — AI Co-Supervisor (PRD)

**Date:** 2026-05-30
**Status:** Draft — validated via prototype on seed data; sequenced after deploy + i18n
**Track:** AI moat (Phase 2). Supersedes the generic "E11 deliverable feedback / E12 check-in synthesizer" roadmap items by fusing them into one supervisor-facing wedge.

---

## Problem Statement

Company supervisors take on interns but **fly blind between weekly check-ins** — they discover an internship is off-track only when a deliverable lands late or wrong, by which point it's a costly redo. The pain is acute because the supervisor is the **recruiting/paying side**: if managing interns feels like a time-sink with no visibility, they churn — which is existential, not cosmetic. Today inturn surfaces raw activity (check-ins, tasks, a heuristic "quiet flag") but nothing tells the supervisor *what actually needs their attention this week, and why.*

**Validated insight (prototype, 2026-05-30):** run against the real seed internship, the synthesis surfaced a non-obvious pattern a busy supervisor would miss — the intern reported "nothing blocking," but had a week-old unanswered request (direction call + an unreviewed deliverable) and had quietly stopped waiting and started building on a guess. The killer reframe: **Pulse flags the *supervisor's* open loops, not the intern's slacking.** "I've got your back," not surveillance.

## Goals

1. Supervisors catch a stalled/at-risk internship **≥1 week earlier** than unaided — before the bad deliverable lands.
2. Reduce "stay on top of my intern" to a **<60-second weekly read**.
3. Drive the corrective action (overdue feedback / direction call) — measured by **Pulse → action conversion**.
4. Lift **supervisor retention / active-supervision** vs a no-Pulse baseline.
5. Start accumulating **labeled outcome data** (was the flag right?) to seed future matching — the compounding moat.

## Non-Goals

1. **Not intern surveillance / a productivity score** — framed as the supervisor's open loops. (Sticky, not creepy; this *is* the product wedge.)
2. **Not cross-internship benchmarks** ("better than 78% of interns") — needs cohort data we don't have. Later.
3. **Not auto-actions** — Pulse recommends; the supervisor acts. (Trust; one wrong auto-send and they're gone.)
4. **Not a new data model** — reads existing signals (check-ins / events / deliverables / tasks). (Speed + no cold-start.)
5. **Not intern-facing in v1** — the wedge is the supervisor.

## User Stories

- As an **overwhelmed supervisor**, I want a weekly read of which interns need my attention and why, so I can act without digging through every workspace.
- As a **supervisor**, I want Pulse to flag when an intern is proceeding *without* something they asked me for, so I prevent a redo before it happens.
- As a **supervisor**, I want each flag to **cite its evidence**, so I trust it and can verify in two clicks.
- As a **supervisor**, I want an explicit **"nothing needs you — they're on track"** when true, so I can stop worrying about that intern.
- As a **supervisor**, I want the **one concrete action** to take, so I don't have to diagnose the fix myself.
- *(Edge)* As a **supervisor of a brand-new internship**, I want Pulse to say "too early to read" rather than invent a flag, so it never cries wolf.

## Requirements

### Must-Have (P0) — the demoable MVP

- **Synthesis engine** — a server function: given one workspace's signals (check-ins `{shipped,stuck,next}`, deliverables `{status,version,revisions,feedback,submittedAt}`, tasks `{status,velocity}`, recent events, internship week-clock), call Claude and return structured `Pulse { status: 'on-track'|'attention'|'at-risk'|'too-early', headline, why, evidence[], action }`. Output generated in the **recipient's locale** (prompt-driven FR/EN).
  - *Given* an intern raised a request in a check-in with no matching supervisor feedback/response and has since moved on, *when* Pulse runs, *then* status ≥ `attention`, the `why` names the open loop, and `action` targets the **supervisor**.
  - *Given* a workspace with < 1 check-in, *when* Pulse runs, *then* status = `too-early` (no false flag).
  - Output always includes ≥ 1 `evidence` line referencing a real signal.
- **Conservative severity** — bias hard against false `at-risk` (precision > recall at top severity).
  - *Given* a genuinely-fine internship (shipping, no open loops), *when* Pulse runs, *then* status = `on-track`, `action` = "nothing needed".
- **Surface: rail upgrade** — replace the heuristic "performance signal" / "quiet flag" in `modules/workspace/components/rail-supervisor.tsx` with the Pulse card (status · headline · why · action · evidence).
- **Cost guard + caching** — Pulse is cached per workspace and regenerated weekly **or** on a meaningful signal change (new check-in/deliverable), never per page-load. Rate-limited (reuse `lib/ratelimit.ts`). Model configurable.

### Nice-to-Have (P1) — fast follow

- **Weekly push** — scheduled job generates Pulse per active workspace + notifies the supervisor (in-app + email, honoring notification prefs + `users.localePref`).
- **On-demand "Refresh Pulse"** button.
- **Multi-intern digest** — one weekly email summarizing all of a supervisor's interns, sorted by who needs attention most.
- **"Was this useful?"** on each flag — collects the trust-label data while improving UX.

### Future (P2) — design for, don't build

- **Outcome labeling → matching:** persist flag + eventual outcome to seed intern↔internship matching (the real long-game moat).
- **Cross-internship benchmarks** once cohort data exists.
- **Intern-facing self-coaching** version.

## Success Metrics

**Leading (days–weeks):**
- **Pulse → action conversion:** % of `attention`/`at-risk` Pulses where the supervisor acts (feedback/comment/sync) within 48h. **Target ≥ 40%.**
- **False-alarm rate:** `at-risk` flags the supervisor marks "not really". **Target < 15%.** (This is the trust kill-switch metric.)
- **Weekly Pulse open rate** (email/notification). **Target ≥ 50%.**

**Lagging (weeks–months):**
- Supervisor retention / active-supervision uplift vs no-Pulse baseline.
- Redo reduction (proxy: deliverable revision counts after missed open-loops trend down).
- Qualitative: design-partner supervisors name Pulse as a reason they stay.

## Open Questions

- **[Product — blocking quality]** How reliably can the prompt detect the "intern asked X, supervisor didn't respond, intern moved on" pattern? This is THE differentiating insight — needs a prompt-eval on ≥ 5 real internships (or hand-built scenarios now).
- **[Eng/Data — non-blocking]** Model: Haiku (cheap, weekly × N workspaces) vs Sonnet (the "whoa")? Start Sonnet, optimize cost later.
- **[Eng — blocking the push only]** Where does the weekly job run (Vercel cron)? Cadence — fixed day vs each internship's week-anniversary? (The rail card ships synchronously without this.)
- **[Data — informs gating]** Is signal density on a *real* internship enough (vs the seed)? Unvalidated until real usage — may gate Pulse behind a minimum-signal threshold.
- **[Design — non-blocking]** Rail card vs a dedicated Pulse surface vs both?

## Timeline / Sequencing

- **After:** production deploy of the current build + the i18n foundation (so Pulse's chrome + emails are bilingual, and Pulse output is locale-prompted from day one). Coordinate with the i18n project's `rail-supervisor.tsx` work so Pulse lands with/after the localization, not conflicting with it.
- **Depends on (all exist):** Anthropic key in prod, the notification dispatcher + email infra, `lib/ratelimit.ts`, the rail-supervisor component.
- **Phasing:** **Phase 1** = synthesis engine + rail card (synchronous, on-demand) — provable + demoable, the design-partner magnet. **Phase 2** = weekly scheduled push + multi-intern digest. **Phase 3** = trust-label loop + matching seed.
- **Cheapest next validation before building:** prompt-eval the synthesis on ~5 internships (hand-built scenarios now, real ones once you have design partners) to confirm the open-loop insight fires reliably and doesn't cry wolf.
