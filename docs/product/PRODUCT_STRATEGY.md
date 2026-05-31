# Inturn — Product Strategy Review

> Written 2026-05-27 from the strategist + product-owner seat, not the
> engineering seat. The platform is **shippable** today; this document
> covers what it takes to make it **survive past launch + retain users**.

---

## TL;DR — the diagnosis

We have built a complete, polished, bilingual, GDPR-compliant internship
platform with workspaces, AI assistants, records, community, and admin
moderation. **The feature set is no longer the bottleneck.** What ships
next determines whether Inturn survives the cold-start problem and turns
first-time users into a habit.

Three things matter most over the next 6–8 weeks, in order:

1. **Solve the two-sided cold-start.** An empty marketplace kills both
   sides on first visit. We need controlled supply (10 vetted companies,
   30 quality internships) before broad acquisition.
2. **Remove the trust bottleneck.** Today Sam is the only person who can
   verify a company — that scales to ~5 orgs/day before it becomes the
   blocker on growth. Self-serve verification with optional manual review
   for flags is the unlock.
3. **Build the university partnership product.** This is the moat. A
   single university adoption auto-onboards every student, becomes a
   B2B revenue line, and creates structural retention through their
   academic calendar.

Everything else (Sentry, monetization, Arabic, mobile app) is a "yes
but later." The 6-week plan below sequences accordingly.

---

## Where we are today (honest inventory)

### What works end-to-end
- ✅ Intern: sign up → onboard → browse + filter + match + bookmark → apply → status pipeline → workspace (tasks, deliverables, comments, check-ins, AI unblocker) → records to share with future employers → withdraw / delete account
- ✅ Company: sign up → org verification → create projects with goals + phases → publish internships → review applications (with inbox + compare) → manage workspaces → issue end-of-internship records with star rating
- ✅ Admin: dashboard with KPIs → verify orgs → triage reports (with audit trail) → moderate users (suspend/reactivate) → view audit log with filters
- ✅ Cross: bilingual FR/EN, dark mode, mobile responsive, cookie consent, legal pages, GDPR rights (export + delete), email notifications, in-app bell

### What's broken or thin
- ❌ **Empty marketplace** — only ~9 seeded internships across 4 orgs. A real first visitor sees a ghost town.
- ❌ **Verification bottleneck** — Sam reviews every RNE document. Average review time is undefined. No SLAs.
- ❌ **No referral mechanic** — users have to be told to invite friends; no link to share.
- ❌ **No retention loop after first internship** — community is sparse, no alumni surfacing, records sharing is manual.
- ❌ **Admin is a person, not a system** — no playbook for moderation decisions, no public guidelines, no transparency.
- ❌ **Acquisition pages don't exist** — footer links to `/for-universities`, `/about`, `/contact` that 404. (Round 1 silenced the links by switching to SiteFooter, but the pages still don't exist.)

### What's correctly de-scoped (don't build this now)
- Mobile app (web is fine for Tunisia mobile-first)
- DMs / chat (intentional — workspace comments only)
- Algorithmic feed (not yet enough data)
- Skills assessments / coding challenges (later differentiator)

---

## The 5 strategic gaps (ordered by impact on survival)

### Gap 1 — Cold start (TWO-sided marketplace failure mode)

**Symptom**: First intern visits marketplace → sees 9 internships, most don't match their field → bounces and tells nobody.
First company visits → joins → sees no other companies, no proof anyone else uses it → posts one internship out of obligation, doesn't return.

**Root cause**: Marketplaces don't bootstrap themselves. We need a **launch supply** that looks credible before opening to broad acquisition.

**Recommended moves** (in order):
1. **Seed real supply manually.** Outreach to 15 Tunisian companies (use Sam's network — agencies, design studios, ENIT alumni networks). Goal: 30 published internships in 4 sectors before public launch.
2. **Quality bar over volume.** Each seed internship should have: real photo of office, real supervisor name + LinkedIn, real deliverables list, real compensation if paid. Generic templates kill trust.
3. **"Featured" curation surface.** Admin can mark 6 internships as featured → top of marketplace. Curated trust signal until algorithmic matching has enough data.
4. **Hide empty states.** Until 50+ internships are live, redirect `/marketplace?empty` to a "we're hand-picking the first cohort, here's what to expect" landing page.

### Gap 2 — Trust bottleneck (Sam is the rate limiter)

**Symptom**: Every new company needs admin verification before posting. Sam is the admin. Sam has 24 hours per day. Therefore: company onboarding rate ≤ Sam's verification capacity. This caps us at ~5 orgs/day, hard.

**Recommended moves**:
1. **Tiered trust model.**
   - **Auto-verify** orgs whose owner email matches a known domain (university `.utm.tn`, prior Inturn org, etc.)
   - **Self-serve verified** if they upload RNE + take a 4-question quiz about Tunisian internship law. We sample 10% for human review.
   - **Manual review** only for flagged orgs (no website, generic email, missing RNE)
2. **Public moderation guidelines** at `/trust` so companies know what to expect. Builds trust + reduces "where is my verification?" support load.
3. **SLA visible to the company**: "Your company is being verified. Average review time: 18 hours. We'll email you when done." Right now they see nothing.
4. **Auto-suspend on flag accumulation**: 3 open reports against an org → auto-archive their internships until admin reviews. Right now admin has to manually unpublish.

### Gap 3 — Activation depth (first 60 seconds in app)

**Symptom**: A signed-up intern completes onboarding, lands on dashboard, sees stat tiles at zero. They don't know what to do next. **First-session bounce rate will be high.**

**Recommended moves**:
1. **First-time experience (FTE) flow** for interns:
   - On dashboard first visit, show a 3-step checklist: ☐ Complete profile to 80% ☐ Bookmark 3 internships ☐ Apply to your first
   - Each step links directly to the next surface
   - Confetti / celebration moment on first application (we want to anchor the emotional reward)
2. **FTE for companies**:
   - First-time hub shows: ☐ Add company logo + description ☐ Post your first internship (with template picker) ☐ Invite your first supervisor (co-supervisor flow doesn't exist yet — fix)
3. **Template internships** — 8 pre-written templates ("Junior frontend engineer", "Bilingual editor", "UX research intern"…) that auto-fill the form. Companies copy + tweak instead of starting blank.
4. **Profile parsing from LinkedIn / CV** — drag a PDF, we extract university + field + skills. Removes the biggest activation friction for interns.

### Gap 4 — Habit loops & retention

**Symptom**: Once an internship ends, the intern has no reason to come back until their next internship 6 months later. Companies hire seasonally — May-July spike, then quiet. **The platform looks dead 8 months of the year per user.**

**Recommended moves**:
1. **Alumni mode** — after their first record is issued, interns become "Alumni" with:
   - A profile badge ("ENIT '26 · Acme Studio alum")
   - A community privilege (can mentor newer interns)
   - A monthly "what your cohort is doing" email
2. **Notification cadence** — daily digest at 8am, weekly summary on Sunday. Currently emails are transactional only; we need rhythmic touchpoints.
3. **Community editorial calendar** — Sam (or an intern moderator) posts a thread weekly: "Tips for stakeholder interviews", "What I learned from my first design crit", etc. Sparks engagement.
4. **"Recommend this internship to a friend"** — every intern can share a deep link to an internship they bookmarked. Tracked + attributed for referral rewards later.
5. **Multi-internship career arc** — surface "your next internship" recommendations 2 weeks before current one ends.

### Gap 5 — University partnership product (the real moat)

**Symptom**: Currently a university is a *field* on intern profiles, not a *customer*. But universities are where 100% of our supply originates — they should be a B2B customer with their own dashboard.

**Recommended moves** (this is a 3-week build, but the highest-ROI thing on the list):
1. **University role** (new) with:
   - Bulk-invite students by CSV upload of academic emails
   - Coordinator dashboard: how many of our students are placed? In what sectors? With what companies?
   - Internship convention generation: produce signed PDF conventions for the academic registry
   - Anonymized analytics: avg time-to-placement, common skills gaps, top hiring sectors
2. **Pricing**:
   - Free tier: < 100 students
   - Paid: 5 TND / student / year (ENIT alone has 2,500 students = 12.5K TND ARR)
3. **University landing page** at `/for-universities` with pricing + case studies + integration FAQ
4. **University admin auth** — must use `@university.tn` email, gets coordinator role

This single feature, if landed with 2 Tunisian universities (ENIT + ESPRIT are tractable via Sam's network), gives us:
- 5,000+ pre-onboarded interns
- Structural recurring revenue
- A defensible position no LinkedIn-style platform can replicate without local presence

---

## 6-week plan

### Week 1 — Foundation hardening + acquisition supply

**Theme**: Make sure the platform doesn't break under first real users, and have something to show them.

**Build**:
- [ ] **Sentry** instrumentation (errors invisible right now — unacceptable in prod)
- [ ] **Posthog** (or Vercel Analytics) — funnel tracking from sign-up → first apply
- [ ] **Status page** at /status (uptime, last deploy, known issues)
- [ ] **Public moderation guidelines** at /trust (Gap 2)
- [ ] **/for-universities** + **/about** + **/contact** pages (the broken footer links)
- [ ] **Featured internships** admin surface + marketplace highlight

**Outreach (Sam, non-engineering)**:
- [ ] List 15 target Tunisian companies, draft outreach script
- [ ] Manually contact + onboard 8–10 of them (over the next 2 weeks)
- [ ] Goal: 30 quality internships by end of week 2

**Ship criteria**: Sentry catches first prod error; Posthog shows first funnel; 15+ internships in marketplace; trust + about + universities pages live.

### Week 2 — Activation: first 60 seconds

**Build**:
- [ ] **First-time experience checklist** on intern dashboard (3 steps with celebrate-on-complete)
- [ ] **Same for company dashboard** (4 steps including first internship post)
- [ ] **Internship templates** — 8 pre-filled scaffolds in the internship-new form
- [ ] **Confetti on first application** (small, but anchors emotion)
- [ ] **Onboarding tour** with `react-joyride` or custom — 5-step walkthrough of dashboard
- [ ] **CV parsing** for intern profile — drop a PDF, autofill profile (use Claude as the parser)

**Ship criteria**: Funnel shows >40% activation rate (sign-up → first apply OR sign-up → first internship post).

### Week 3 — Trust at scale: self-serve verification

**Build**:
- [ ] **Auto-verify rule** for known domains (academic, prior orgs)
- [ ] **Verification SLA banner** — "Average review: 18h" visible to company
- [ ] **Email when verified** (already there for app status; needed for org verification)
- [ ] **4-question Tunisian-law quiz** for self-serve verification
- [ ] **Auto-suspend on report accumulation** (3 open reports → archive internships)
- [ ] **Verified badge** visible on internship cards + company profile

**Ship criteria**: Sam's verification queue is < 3 orgs at any time; companies see real-time status of their verification.

### Week 4 — Engagement: notifications + community editorial

**Build**:
- [ ] **Daily intern digest email** — 3 new internships matching your profile, 1 community post worth reading, 1 deadline approaching
- [ ] **Weekly company digest** — applications received, deliverables submitted, upcoming check-ins
- [ ] **In-app notifications when someone replies** to your community post (currently silent)
- [ ] **Notification preferences** in /account — let users tune cadence
- [ ] **WhatsApp notifications** (optional, via Twilio) — Tunisian users prefer WhatsApp over email
- [ ] **Community editorial calendar** — Sam writes 4 seed threads; track engagement

**Ship criteria**: Daily/weekly emails reach >90% open rate (real Tunisian engagement benchmark); 1 community thread per day from seeded content.

### Week 5–6 — University partnership product (the moat)

**Build (Sprint U)**:
- [ ] **University role** in roles enum + schema migration
- [ ] **University table**: name, slug, contact, paid status, student count
- [ ] **CSV bulk invite** of students (academic emails)
- [ ] **University coordinator dashboard** — placement stats, sector breakdown, anonymized funnel
- [ ] **Internship convention PDF generation** (Tunisian format) — biggest pain for university registrars
- [ ] **/for-universities** landing page with pricing + case study + signup flow
- [ ] **University auth** — must use `@*.tn` email matching their domain
- [ ] **Onboard ENIT + ESPRIT** through Sam's network (this is the soft launch)

**Ship criteria**: 2 universities onboarded with at least 200 students bulk-imported. First university-issued convention PDF generated.

### Week 7+ (post-soft-launch)

- **Stripe scaffolding** for the university tier
- **Alumni mode** + multi-internship career arc surface
- **Arabic locale** (RTL support is non-trivial — ~1 week's work)
- **Referral system** (track who referred whom, reward both)
- **Public success stories** + press kit
- **Mobile PWA** with install prompt
- **API for university SIS integration** (only after Stripe + university traction)

---

## What to ship Monday (concrete starting point)

If we agree on this plan, here's what gets the first commit Monday morning:

1. **Sentry integration** — non-negotiable. Without it, every prod bug is invisible. 2 hours of work, immediate ROI.
2. **`/about` and `/for-universities` placeholder pages** — even minimal copy is better than 404s. Lets us start outreach.
3. **Verification SLA banner** — copy a one-liner into the company dashboard during pending state. Cheapest trust improvement available.

Everything else flows from those + the outreach Sam runs in parallel.

---

## Risks & open questions (PM perspective)

These need decisions before week 1 closes:

1. **Who is the priority customer?** Universities are the moat but companies are the supply. If both can't have equal love → which first?
2. **Pricing for universities** — does 5 TND/student/year feel right? Cheaper than a SaaS but covers infrastructure + Sam's time?
3. **Are paid internships the norm or the exception in Tunisia?** This shapes how aggressive we are on the compensation field.
4. **Tunisian internship law** — do we need an embedded legal advisor or can templates cover 90% of cases?
5. **Do we want to be Glassdoor for companies?** (Public reviews are a defensible feature but high-risk early on.)
6. **Mobile app or PWA?** Tunisia is mobile-first. PWA is faster to ship; native app is a longer-term moat.
7. **AI ambitions** — task-clarity + intern-unblocker are tame uses. Do we want bigger AI features (CV parsing, interview prep, matching scoring) as a differentiator?

---

## What I am NOT recommending

Naming these explicitly to short-circuit scope creep:

- ❌ Building a chat / DM system (workspace comments are sufficient, lower abuse risk)
- ❌ Building a code editor / project sandbox (out of scope)
- ❌ Building a job board for full-time roles (different market entirely)
- ❌ Building a freelance marketplace (different model)
- ❌ Building a video interview tool (Jitsi link is plenty)
- ❌ Building our own auth (Clerk is great; don't rebuild)
- ❌ Building our own analytics (Posthog or Vercel Analytics)
- ❌ Building our own payment processor (Stripe when we monetize)

Stay focused on the unique value: **a Tunisia-native, university-integrated, records-as-moat internship platform.**

---

## Success metrics (track from week 1)

| Metric | Definition | Target by week 8 |
|---|---|---|
| Activation rate | (intern signups → first apply) / signups | 40% |
| Time to first apply | Median minutes from signup to first apply | < 30 min |
| Verification SLA | P90 hours from RNE upload to verified | < 24h |
| Marketplace depth | Published verified internships at any time | 50 |
| University signups | Distinct universities with ≥1 coordinator | 2 |
| Records issued | Cumulative end-of-internship records | 10 |
| WAU (weekly active users) | Distinct users with ≥1 page view in last 7d | 200 |
| NPS (sample) | After 3rd login, ask 1 question | > 30 |

---

## Final recommendation

We have a beautiful Ferrari and an empty road. The next 8 weeks are about
**building the road**, not adding turbo. The cheapest growth move is
Sam's outreach to companies + universities; the cheapest retention move
is the notification digests + community editorial; the cheapest trust
move is making verification self-serve + transparent.

If we ship Week 1-4 well, we'll have answered the most important
question: **will Tunisian students and companies actually use this?**
That's the only signal that matters before deciding Sprint U is worth
building or whether to pivot.
