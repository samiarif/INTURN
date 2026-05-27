# Inturn — Dev Roadmap (12 weeks of ambition)

> Sam handles outreach, partnerships, pricing, content seeding.
> This doc is purely what Claude Code will build. Ambitious by design.

Source of truth: this branch (`sprint-b-phase-1-closure`). All work
flows into here unless a phase warrants its own branch.

---

## Phase 1 — Production essentials (Week 1–2)

Make every prod deploy land safely + give us a window into what's
actually happening with real users.

### E1. Sentry observability
- `@sentry/nextjs` install + instrumentation.ts + sentry.client/server.config
- Source maps uploaded on Vercel build
- PII scrubbing (no emails, no body content)
- DSN env-gated → no-op if `SENTRY_DSN` absent
- Replace `console.error` in critical paths with `Sentry.captureException`

### E2. Product analytics (Posthog or Vercel Analytics)
- Choose Posthog (richer funnels) or Vercel Analytics (simpler, free)
- Event taxonomy: `signup`, `onboarding_step_completed`, `application_submitted`, `record_issued`, `workspace_created`, `community_post_created`
- Funnel pages: signup → first_apply, signup → first_post
- 30-day retention chart per role

### E3. CV parser (Claude-powered)
- `/api/ai/cv-parse` endpoint — accepts PDF upload
- Uses Claude Sonnet with vision to extract: name, university, year, field, city, skills, languages, portfolio links
- Returns confidence per field
- Wired into `/account/edit` (intern only) as "Import from CV" button
- 50/min rate limit per user

### E4. Internship templates
- `lib/internship-templates.ts` with 8 pre-filled scaffolds (Visual designer, UX researcher, Frontend dev, Marketing intern, Bilingual editor, Data analyst, Motion designer, Content strategist)
- Picker UI on `/company/projects/[id]/internships/new` → click template → form fields auto-fill
- Each template has: title, description, sector, skills, duration, locationType suggestions

### E5. First-time experience checklists
- Intern dashboard: 3-step checklist banner when `profileStep !== 'complete' || applications === 0`
  - ☐ Complete profile to 80%
  - ☐ Bookmark 3 internships
  - ☐ Apply to your first
- Company dashboard: 4-step checklist when no published internships
  - ☐ Add logo + description
  - ☐ Create first project
  - ☐ Post first internship
  - ☐ Invite co-supervisor (after we add co-supervisor flow)
- Dismissible per role per user (localStorage flag)
- Confetti animation on each step completion (`canvas-confetti` lib)

### E6. Verification SLA visibility
- During `pending` status, company dashboard shows a top banner:
  - "Your organization is being verified. Average review: 18h."
- Email to company owner when status flips to `verified` or `suspended` (already wired for app status; just need org variant)

### E7. Admin verification queue health
- `/admin/dashboard` adds a "Oldest unreviewed" stat
- Verification list sorts by `created_at ASC` so oldest gets attention first
- Email Sam when queue exceeds 10 pending orgs

**Ship criteria**: 1 prod error captured by Sentry, 1 funnel visible in Posthog, CV parsing works on a real PDF, all 8 templates render, FTE checklists track to localStorage.

---

## Phase 2 — AI moat (Week 3–4)

Anthropic-native features that make the platform feel distinctly
better than any competitor that wraps a marketplace around a job board.

### E8. AI matching score (better than naive intersection)
- Replace `lib/match.ts` matchScore with Claude-based semantic scoring
- Input: intern profile (skills, roles, field, year) + internship (title, description, skills, sector)
- Output: 0-100 score + 1-sentence explanation
- Cached per (intern, internship) pair (lru-cache, 1h TTL)
- Surfaces on marketplace cards + intern dashboard "Recommended for you"

### E9. AI candidate summary (company side)
- On `/company/projects/[id]/applications/[appId]`, add an "AI summary" panel
- Claude generates: 3 strengths, 1 concern, 2 suggested interview questions
- Streams in via `@ai-sdk/react` `useChat`
- Rate-limited 5/min per company user
- "Regenerate with focus on X" button

### E10. AI mock interview (intern side)
- New page `/intern/applications/[id]/practice` — only available for shortlisted/interview status apps
- Claude plays interviewer based on the internship description
- 5-question session, text or voice
- Transcript saved to intern's profile
- Anthropic Claude Sonnet, max 20 turns per session

### E11. AI deliverable feedback assistant (supervisor side)
- On deliverable detail, "Draft feedback" button for supervisor
- Claude reads the deliverable (PDF + image extraction with vision) + the brief + previous revisions
- Generates 3-paragraph draft feedback that supervisor can edit + send
- Mode toggle: "encouraging" / "rigorous" / "critique-style"

### E12. AI weekly check-in synthesizer
- On `/intern/workspaces/[id]/check-in`, after the intern types raw bullets in 3 sections (shipped, stuck, next), Claude synthesizes:
  - A 2-sentence summary
  - Suggested supervisor focus areas
- Intern can edit before submitting
- Already partially wired (D3 task-clarity uses similar pattern); this extends to check-ins

### E13. AI project brief expander (company side)
- On `/company/projects/new`, after the user types a 1-sentence project idea, Claude expands to:
  - Project brief (3 paragraphs)
  - 3 suggested goals
  - 4 suggested phases with weeks
  - 2 suggested internship roles (with skills + duration)
- User reviews + edits before saving

### E14. AI smart task suggestions
- On workspace tasks board, "AI suggest tasks" button (supervisor only)
- Claude reads existing tasks + deliverables + brief
- Generates 5 candidate tasks with title, tag, priority, due date
- Multi-select to add to board

**Ship criteria**: All 7 AI features wired with rate limits, prompts versioned in `modules/ai/prompts/`, tests for prompt-input/output shape, fallback when ANTHROPIC_API_KEY missing.

---

## Phase 3 — Engagement loops (Week 5–6)

The reason users come back, not just sign up.

### E15. Daily/weekly digest emails
- New cron endpoint `/api/cron/digest-daily` (Vercel Cron, 8am Tunis time)
- Intern digest: 3 new matching internships, 1 community post, deadlines this week
- Company digest (Mondays only): apps received last 7d, deliverables submitted, upcoming syncs
- Per-user opt-out in `/account` notification preferences

### E16. Notification preferences page
- New section in `/account` for notification preferences
- Per-channel toggles (email, in-app, WhatsApp later)
- Per-category toggles (applications, deliverables, comments, community, marketing)
- Persist in new `notification_preferences` table

### E17. WhatsApp notifications (Twilio)
- Add `phoneNumber` field to profiles
- Verification flow (SMS code via Twilio)
- Critical notifications can opt-in to WhatsApp: application accepted, internship offered, deliverable feedback received
- Twilio Tunisia number provisioning

### E18. Community: reply notifications
- When someone replies to your post, you get an in-app notification
- Dispatcher already exists (`dispatchNotificationsFor`); add `community.comment.added` handler

### E19. Public intern profile pages
- New route `/p/[username]` (username generated from name + 4-digit suffix)
- Shows: name, university, field, skills, records issued, public portfolio links
- Privacy toggle in `/account` ("Make profile public" — default off)
- Used for sharing in apps + LinkedIn
- Records appear with view-count + share URL

### E20. Public company pages
- New route `/c/[orgSlug]`
- Shows: org info, current internships, alumni interns count, avg rating (from records signature)
- Used as link target when companies share their listings externally

### E21. Multi-internship career arc
- 2 weeks before current internship ends, show on intern dashboard:
  - "Your internship at {org} ends in 12 days. Here are 3 next steps:"
  - Recommended next internships (based on progression: junior → mid)
  - "Mark this as alumni" toggle (when status = completed)

### E22. Community editorial mode
- Admin can pin a post to top of feed
- Admin can set "Topic of the week" banner
- New schema field `pinnedAt` + `topicOfWeek` on community_posts
- Admin surface at `/admin/community`

### E23. Alumni mode
- After first record issued, profile gets "Alumni" badge
- Alumni can answer community posts with a special "Alumni reply" highlight
- Alumni opt-in to mentor matchmaking (Phase 7)
- Monthly digest "What your cohort is doing"

**Ship criteria**: Cron jobs running, opt-out works, WhatsApp delivers a test message, public profile page renders with proper SEO meta, alumni badge appears for users with ≥1 record.

---

## Phase 4 — University partnership product (Week 7–8)

The B2B moat. A new role + dashboard + bulk onboarding.

### E24. University schema + role
- Migration 0012: `universities` table (id, name, slug, contact, country, city, student_count, plan, verified, created_at)
- Migration 0013: add `university` to `users.role` enum + add `university_id` FK to profiles (for student linking)
- New seeded universities: ENIT, INSAT, ESPRIT, ESSEC Tunis (already in profile dropdown — wire to real entities)

### E25. University onboarding flow
- `/onboarding/university` wizard: institution name, coordinator email, student count, .tn domain
- Auto-create slug, redirect to `/university/dashboard`

### E26. Bulk CSV student invite
- `/university/students/import` page — drop CSV with columns: email, first_name, last_name, year, field
- Server action validates + inserts pending invite rows (`student_invites` table)
- Send batch email "Your university has invited you to Inturn" with sign-up magic link
- Track conversion (invite_sent → signup → activated)

### E27. University coordinator dashboard
- `/university/dashboard` shows:
  - Total students invited / signed up / placed
  - Placement rate by sector
  - Anonymized top hiring companies
  - Avg time-to-placement (signup → first accepted)
  - Pipeline view: students waiting on responses, in interview, accepted
- All anonymized — individual student data hidden, aggregates only

### E28. Internship convention PDF generator
- Tunisian internship law requires a signed "convention de stage" between university + company + intern
- Auto-generate PDF when intern is accepted (status='accepted')
- Template includes: intern name, university, company, project, duration, start/end dates, supervisor, signatures section
- Both intern + company can download from workspace
- Optional: digital signature via DocuSign/HelloSign (Phase 5)

### E29. /for-universities landing page
- Pricing table (free under 100 students, 5 TND/student/year over that)
- "How it works" 4-step flow
- 2 case study placeholders (filled by Sam later)
- Sign-up CTA → /onboarding/university

### E30. University auth + permissions
- Coordinators can: view aggregated stats, bulk import, message students
- Coordinators cannot: see individual student profiles without consent, access companies' internal data
- `requireUniversityRole` helper in auth module

**Ship criteria**: 1 test university (Inturn-Internal University) seeded, CSV import works for 100 fake students, coordinator dashboard renders with seed data, convention PDF generated for sample workspace.

---

## Phase 5 — Trust at scale (Week 9–10)

Self-serve verification + abuse handling so admin work scales.

### E31. Tiered verification rules
- Auto-verify orgs where owner email is on the allow-list (academic .tn, prior Inturn orgs, hand-curated trusted orgs)
- Auto-verify orgs where owner has previously had verified org
- Otherwise: require RNE upload + 4-question quiz, then auto-verify if quiz passes
- Manual review only for: missing RNE, suspicious org name, owner with prior reports

### E32. Verification quiz
- 4 multiple-choice questions on Tunisian internship law basics
- Pass = 4/4 (low-bar, just confirms they read the rules)
- New page `/onboarding/company/quiz`
- Failure: see correct answers + retry once after 24h

### E33. Auto-suspend on report accumulation
- Threshold: 3 open reports against same subject_id → auto-archive + email admin
- For internships: status='archived'
- For orgs: verificationStatus='suspended'
- For users: suspendedAt=now
- Audit log entry recorded

### E34. Public moderation guidelines at /trust
- Public page covering: what's not allowed, how reports are reviewed, response SLAs, appeals process
- Static page, FR + EN, link from footer

### E35. Records verification (QR + public lookup)
- Add QR code to record PDF that links to `/records/[token]/verify`
- Public page shows: "This record was issued by {org} for {intern} on {date}. Currently {status}."
- Lets employers trust records without needing the intern logged in

### E36. 2FA encouragement (not enforcement)
- New `/account/security` page
- Surface Clerk's built-in 2FA flow
- Show "2FA enabled" badge on profile if active
- Send periodic reminder email if not enabled

### E37. Rate-limited report submission
- Currently no server-side rate limit on `submitReportAction`
- Add: max 5 reports per user per 24h
- Prevents abuse of the reporting system itself

**Ship criteria**: Quiz works, 1 auto-verified company in seed, QR code renders on PDF, /trust page live, 5-reports-per-day rate limit enforced.

---

## Phase 6 — Arabic + PWA (Week 11–12)

Real Tunisian market reach + install-on-phone experience.

### E38. Arabic locale
- New `locales/ar.json` (use Claude to translate the existing keys)
- Add `ar` to `routing.locales`
- Test every page renders without layout breaks
- Arabic name in language switcher

### E39. RTL support
- CSS logical properties throughout (replace `padding-left` with `padding-inline-start`, etc.)
- Test every component in `dir="rtl"`
- Workspace canvas (`.ws-*`) needs full RTL pass
- Tailwind RTL support via plugin

### E40. PWA install prompt
- `manifest.json` with icons (192, 512, maskable)
- Service worker for offline shell
- "Install Inturn" prompt that fires after 3rd session (not first — too aggressive)
- iOS Safari instructions modal

### E41. Push notifications (web push API)
- Service worker registration + push subscription
- Permission ask at right moment (after first applied/accepted, not on first visit)
- Server: store push subscriptions, send via web-push
- Granular per-category (replicate notification preferences)

### E42. Mobile-first deliverable upload
- Replace drag-drop with camera-first flow on mobile
- "Take photo of work" → uploads with compression
- "Record voice note" for stuck pill (mobile mic)

**Ship criteria**: All 3 locales work end-to-end, RTL renders cleanly, PWA installs on Android + iOS, push notification delivered to a test device.

---

## Phase 7 — Records ecosystem + alumni network (Week 13–14)

Make records the actual moat.

### E43. Records LinkedIn share button
- "Add to LinkedIn profile" button on record page
- Opens LinkedIn share flow with proper meta (title, image, link)
- Track share events

### E44. Records public discovery
- Search engine `/records/search?skill=React&sector=Design&...`
- Employers can browse records by skill/sector (with opt-in from interns)
- Public records ranked by recency + reviewer rating

### E45. Intern public portfolio page
- `/p/[username]/portfolio` — chronological internship records + projects
- Auto-generated case study from records (title, brief, deliverables, outcome)
- "Hire me" CTA → contact form to intern

### E46. Mentor matchmaking
- Alumni opt in to mentor
- Current interns can request a mentor (matched by sector + university)
- 3-month mentorship period with monthly check-ins (calendar invites)

### E47. Cohort benchmarks
- Show on workspace overview: "You're 14 days into a 12-week internship. Cohort avg: 4 tasks done by this point, you've done 6 ✓"
- Aggregates anonymized — cohort defined as same sector + duration

### E48. Records on company profile
- Show on `/c/[orgSlug]`: "32 records issued, avg rating 4.6/5"
- Builds company reputation over time

---

## Phase 8 — Power features (Week 15–16)

Polish features that mature users will demand.

### E49. Drafts auto-save (all long forms)
- New project, new internship, application — auto-save every 5s
- Restore on next visit with banner
- `localStorage` + server-side draft endpoint for cross-device

### E50. CSV export of applications
- Company can export their applications list as CSV
- Includes: applicant name, university, status, applied_at, cover_note_excerpt
- New endpoint `/api/company/applications/export.csv`

### E51. Bulk actions
- Company application inbox: select multiple, bulk reject / shortlist / interview
- Confirmation modal with summary
- Server action handles transactional update + dispatches notifications

### E52. Saved searches with alerts
- Intern can save a marketplace search
- New `saved_searches` table (filter JSON, frequency)
- Email alert when new internships match (cron, dedupe vs last sent)

### E53. Internship publish scheduling
- New `publishAt` field on internships
- Status `scheduled` until `publishAt`
- Cron promotes scheduled → published at the right time

### E54. Multi-org support
- One user can own multiple companies
- Switcher in platform header
- Currently 1:1 organizations.owner_id → users.id (relaxed via `organization_members` table)

### E55. Custom application questions per internship
- Already partially exists (`customQuestions` jsonb). Audit the UI flow + polish.
- Question types: short text, long text, single select, file upload

### E56. Internal company chat (not intern-facing)
- Team channel for supervisors to discuss candidates pre-decision
- Per-application threads
- Not visible to interns ever (clear data separation)

---

## Phase 9 — Trust differentiation (Week 17–18)

Things that make Inturn more legitimate than alternatives.

### E57. Public company reviews
- Interns leave a review after their internship completes (1-5 stars + text)
- Reviews visible on company profile page (after 24h delay for moderation)
- Companies can publish response
- Reviews can be reported via existing reports system

### E58. Insurance + legal helper
- Tunisia requires student internship insurance via the university — auto-generate the right document
- Tax helper for paid internships (tax form generation)
- Static legal advisor page

### E59. Verified academic record import
- Optional integration with university SIS (Student Information System)
- Pull transcripts / current courses
- Adds trust signal

### E60. Identity verification (premium)
- Selfie + ID upload → Onfido / Veriff
- Verified intern badge
- Optional, paid for premium accounts only

---

## Phase 10 — Monetization (Week 19–20)

Stripe + tiers. Only after we have traction.

### E61. Stripe scaffolding
- @stripe/stripe-js install + webhook handler
- Customer creation on company sign-up
- `subscriptions` table

### E62. Pricing tiers
- Companies: Free (3 active internships), Pro (unlimited, featured listings, analytics), 99 TND/mo
- Universities: 5 TND/student/year (Phase 4)
- Annual discounts (-20%)

### E63. Featured listing upsell
- Pro companies' internships show "Featured" badge + top of marketplace
- Limited to 3 featured at a time (rotated)

### E64. Company analytics (Pro feature)
- Time-to-fill, application rate, conversion funnel
- Comparable benchmarks (anonymized vs sector avg)

### E65. Billing portal in /account
- Stripe billing portal embed
- Invoice history
- Update payment method
- Plan switching

---

## Phase 11 — Mobile native app (Month 6+)

After PWA proves the demand for mobile.

### E66. React Native / Expo app
- Shared bizz logic via API routes (already structured well)
- Native push notifications
- Camera-first deliverable flow
- Offline-first for workspace browsing

---

## Phase 12 — AI native (continuous)

Beyond what's in Phase 2 — bigger, weirder ideas.

### E67. AI career advisor (chat)
- Persistent chat in /intern/career-advisor
- Claude with full context of intern's profile, applications, records
- Answers: "what skills should I focus on", "which sectors am I best for", "how do I get into product"

### E68. AI HR copilot (bulk candidate screening)
- Company uploads 100 applications, AI ranks them with reasoning
- Time-saver for high-volume orgs
- Bias audit — reports its own reasoning

### E69. AI project scoper
- Already in Phase 2 (E13) — expand with iteration ("regenerate", "shorter", "more technical")

### E70. AI compliance auto-checker
- Reads new internship listings, flags Tunisia legal issues (unpaid mandatory work, excessive hours, missing supervisor info)

---

## Cross-cutting work (continuous, no specific phase)

### Tests
- Coverage target: 250 tests by Week 4, 400 by Week 8
- E2E with Playwright (currently zero E2E coverage)
- Visual regression with Chromatic or Percy

### Performance
- Lighthouse audits per major route, target ≥90 mobile
- Image optimization audit (some places still use raw img)
- Database query audits — slow query log on /admin
- React Server Components review — push more to RSC, reduce client bundle

### Accessibility
- Run axe-core on every page in CI
- Keyboard-only walkthrough — every flow must complete without mouse
- Screen reader testing (NVDA / VoiceOver)
- Focus management on route changes

### Security
- Quarterly dependency audit
- CSP headers
- Rate limit audit (currently 5 buckets — likely need more)
- OWASP top 10 walkthrough
- Penetration test before public launch

### DX
- Storybook for component library
- shadcn/ui upgrade as components evolve
- Drizzle Studio for prod DB inspection
- Local dev seed = production-like data volume

---

## Tracking

Each phase ships on `sprint-b-phase-1-closure` (will branch when scope warrants). HANDOFF.md updated weekly. New TaskCreate at start of each E# item; TaskUpdate to in_progress on start, completed on merge.

This roadmap is the source of truth — if priorities shift, edit this doc first, then talk about it.

---

## Why this order

- **Phases 1-2 first** because observability + AI moat compound: every other phase benefits from analytics + better matching.
- **Phase 3-4 mid** because engagement loops + universities are the retention story; can't measure them without Phase 1.
- **Phase 5-6 late mid** because trust at scale + Arabic are nice-to-have until we have traction.
- **Phase 7+ last** because records ecosystem + monetization only make sense once we have users + revenue intent.

Don't reorder within a phase unless there's a hard dependency reason.
