# inturn — Project Brief for Claude Code

> Read this file every session. This is the source of truth for what we're building.
> Last updated: 2026-05-23 · Owner: Sam (CEO/COO)

---

## What we're building

**inturn** is the early-talent operating system for Tunisia and beyond. A platform where:

- **Students** discover internships (real, virtual, structured), apply through one profile, work inside dedicated project workspaces, and build a verified track record
- **Companies** post internships, recruit talent, run structured programs inside the platform (not in WhatsApp), and access performance data from real work
- **Universities** supervise their students' internships in real time, handle conventions and compliance, and access institutional reporting

### Three pillars that make us different from competitors (Hi Interns, Tanitjobs, iAgora)

1. **Marketplace** — interns discover and apply
2. **Virtual Internships** — structured async work happens natively inside inturn (new in Tunisia)
3. **Community** — interns belong to something, learn together, stay engaged beyond a single internship

All three sit on top of one core: **The Project Workspace** — where real work happens and the data moat is built.

### What inturn is NOT

- Not a CV generator
- Not a career consulting service
- Not a pure job board
- Not "AI matching" as a feature (table stakes)

### The moat

Performance data from real work. After 12 months of operation, inturn knows things about Tunisian early-talent no competitor can replicate. This data compounds and cannot be back-filled.

---

## Current state (May 2026)

- 3+ design partner companies already committed
- Brand and landing page already designed
- Domain: **inturn-hub.com**
- Team: Sam (CEO/COO, decisions + some code), 2 part-time WMIG devs
- Phase 1 goal: 20 companies + 200 interns + 50 completed internships in 6 months

---

## Phase 1 scope — Full feature set (8-12 weeks)

This is what we're building. We're not doing a minimal MVP — we're shipping Phase 1 fully, but in the right sprint order so design partners can use it from week 6.

### Sprint 1 (Week 1-2) — Foundation
- Auth: magic link + email/password, 3 roles (intern/company/admin)
- Profile creation for both roles
- Database schema for: users, profiles, organizations, internships, applications, workspaces, tasks, deliverables, events
- Landing page polish (existing design refined)
- Project infra: Vercel deploy, Neon Postgres, GitHub Actions CI

### Sprint 2 (Week 3-4) — The Workspace
- Workspace auto-created on intern acceptance
- Six tabs: Overview, Tasks, Deliverables, Timeline, Activity, Comments
- Role-aware views (intern vs company see same data, framed differently)
- Activity event stream (foundation of performance signals)
- File upload (deliverables) via UploadThing

### Sprint 3 (Week 5-6) — Company side
- Post internship form (scope, skills, duration, on-site/virtual, deliverables, deadline, intern count, custom questions)
- Applications inbox with filters
- Candidate comparison view (up to 4 side by side)
- Status pipeline: New → Reviewed → Shortlisted → Interview → Accepted → Rejected
- Internal company notes on candidates
- Accept candidate → triggers workspace creation

### Sprint 4 (Week 7-8) — Marketplace
- Public listing page (no login required for SEO)
- Filters: sector, duration, location, on-site vs virtual, skills, paid/unpaid, language
- Internship detail page
- One-click apply + cover note + custom questions
- Application tracker for interns
- Save/bookmark internships

### Sprint 5 (Week 9-10) — Virtual Internship layer
- Weekly check-in form (intern fills, notifies supervisor)
- Async-first task templates with clear scope/output/deadline
- "Schedule a check-in" → generates Google Meet/Jitsi link (we don't build video)
- Deliverable-driven progression
- Timezone-aware scheduling

### Sprint 6 (Week 11-12) — Polish + AI + Community v1 + Admin
- **AI features (Claude API):**
  1. Task clarity assistant (flags vague tasks when company writes them)
  2. Intern unblocker (helps articulate problem when intern marks "stuck")
  3. Weekly summary drafter (drafts intern status report from workspace activity)
- **Notifications:** in-app + email digests + WhatsApp via Twilio (critical events only)
- **End-of-internship records:** PDF + shareable link, structured rubric, intern self-reflection
- **Community v1:**
  - Intern feed (inturn-published content)
  - Internship announcements channel
  - Public discussion threads on internship listings
  - NO DMs, NO group chats, NO general forum
- **Admin panel:** user management, company verification queue, internship moderation, reclamations, basic analytics

### Out of scope for Phase 1 (defer to Phase 2+)
- University Portal (admin onboards universities manually for now)
- Convention generation / e-signing
- Premium Talent Shortlisting as a product (deliver manually if requested)
- Learning paths and courses
- Mobile apps (responsive web is enough)
- Public skill assessments
- Multi-currency, international payments

---

## Architecture principles (non-negotiable)

1. **Modular monolith.** One Next.js app, organized by domain. Clean module boundaries. Each module has its own types, queries, business logic, components. NOT microservices — wrong for our team size.

2. **Data-first design.** Every action generates a structured event. Comments, task moves, deliverable uploads — all rows in an `events` table. This is the performance moat foundation.

3. **Human-in-the-loop for any consequential decision.** AI suggests; humans decide. Never auto-accept/reject candidates. Never publish a score without explanation.

4. **Role-aware UI, single data model.** Don't build separate apps for interns vs companies. One product, role-aware views.

5. **Mobile-responsive web first.** Native apps are a Phase 2 decision (after 5,000+ active users).

6. **French + English from day 1.** Most Tunisian professional content is in French. English for international reach. Arabic deferred to Phase 2.

7. **Performance + security first-class.** Pages under 2s. Encrypted in transit + at rest. GDPR-aligned.

8. **Audit-ability.** Every action logged with who/what/when. Universities and companies will demand this.

---

## Stack decisions (Claude Code may revise with reasoning)

Suggested baseline — Claude Code can challenge any of these if it has a better reason:

- **Framework:** Next.js 15 App Router + TypeScript strict
- **Database:** Postgres on Neon (free tier with branching)
- **ORM:** Drizzle (type-safe, SQL-friendly)
- **Auth:** Clerk (3 roles, magic link + Google, GDPR-ready, organizations support)
- **UI:** shadcn/ui + Tailwind v4
- **File storage:** UploadThing (built on R2)
- **Email:** Resend
- **WhatsApp:** Twilio
- **Realtime (later):** Pusher or native Postgres subscriptions
- **AI:** Anthropic API direct (already a Max user)
- **Monitoring:** Sentry + Vercel Analytics
- **Hosting:** Vercel
- **Package manager:** pnpm

---

## Folder structure (proposed — Claude Code may adapt)

```
inturn/
├── app/                    # Next.js routes
│   ├── (marketing)/        # landing, about, pricing
│   ├── (auth)/             # signup, login, magic link
│   ├── (intern)/           # intern dashboard, workspace, applications
│   ├── (company)/          # company dashboard, post listing, inbox
│   ├── (admin)/            # admin panel
│   └── api/                # API routes (webhooks, AI, uploads)
├── modules/                # domain logic, isolated
│   ├── auth/
│   ├── profiles/
│   ├── marketplace/
│   ├── workspace/
│   ├── community/
│   ├── notifications/
│   └── ai/
├── components/             # shared UI primitives (shadcn lives here)
├── db/                     # Drizzle schema + queries
├── lib/                    # shared utils, helpers
├── locales/                # i18n FR + EN
└── docs/                   # this file + specs
```

---

## How I want Claude Code to work on this project

- **Always plan multi-file changes** before coding. Use Superpowers `/brainstorm` and `/write-plan` for any feature that touches more than 2 files.
- **Read the brief** (this file) at start of any session that involves product decisions.
- **Run lint + typecheck + tests** after every meaningful change.
- **Commit per logical change**, Conventional Commits format (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`).
- **Don't add packages without explaining** the alternative we're choosing against.
- **Ask, don't assume** when scope is ambiguous. Reference the doc.
- **French + English** in all user-facing strings from day one. Use `next-intl` or similar.
- **No emoji** in code, commit messages, or docs (unless this file has them — and it doesn't).

---

## Honest risks (from the strategy doc — don't ignore)

1. **Companies don't move workflow into inturn.** They stay in WhatsApp. → First 10 companies onboarded personally, setup under 15 min.
2. **Virtual internships don't take off in Tunisia.** → Start hybrid as default, virtual as opt-in.
3. **Hi Interns moves into workspace space.** → Be 12 months ahead on quality + brand.
4. **Universities are slow.** → Don't depend on them in Phase 1.
5. **Team can't ship fast enough.** → Claude Code aggressively, keep team small.
6. **Monetization too slow.** → Start charging in month 8 even if pricing is wrong.

---

## Success metrics for Phase 1

- 20 companies with at least one completed internship
- 200 active interns with profiles
- 50 completed internships with full workspace usage
- 30%+ of completed internships are virtual
- 70% of interns rate workspace 4/5 or higher
- 5+ companies post a second internship
- 100+ active listings at any given time

---

## Glossary (so we agree on terms)

- **Workspace** — the per-internship surface where the actual work happens. Six tabs.
- **Internship** — a listing posted by a company. Becomes a workspace when an intern is accepted.
- **Application** — an intern applying to an internship. Status pipeline tracked.
- **Event** — any logged action (task moved, comment added, deliverable uploaded). Foundation of the performance moat.
- **Performance Signal** — a metric derived from events (completion rate, on-time delivery, response time).
- **Intern Record** — the verified PDF + shareable link generated at end of internship.
- **Design Partner** — one of the first 10 companies we onboard personally.

---

## Don't forget

The product will change as we learn from real users. **Frames matter more than features.** What does NOT change:

- Three pillars: marketplace + virtual internships + community
- Workspace at the center
- Performance data as the long-term moat
- Human-in-the-loop for every decision
- Tunisia first, then Morocco
