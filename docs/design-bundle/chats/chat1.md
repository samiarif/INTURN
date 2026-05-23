# Inturn Design Foundations

_Started 2026-05-23 13:45 UTC_

---

## User

I'm building inturn — context attached. Before I have Claude Code build screens, I need design clarity. Three deliverables, in this order:

1. **Brand foundations doc**
   - Logo usage rules
   - Color palette (primary, secondary, neutrals, semantic — success/warning/error)
   - Typography scale (display, heading, body, mono)
   - Spacing system (4 or 8px base, scale)
   - Border radius scale
   - Shadow scale
   - Output as a single page I can paste into my codebase as design tokens

2. **The 4 critical user journeys mapped**
   - Intern: signup → profile complete → discover internship → apply
   - Intern (post-acceptance): receive invite → enter workspace → complete first task
   - Company: signup → post first internship → review applications → accept candidate
   - Company (post-acceptance): supervise workspace → review deliverables → end-of-internship evaluation
   - Per journey: list the screens, the user's emotional state, the friction points, the moment of value
   - No pixel-perfect mockups yet — just flow + screen list

3. **The design system primitives spec** — a list of UI components my product needs in priority order
   - Forms (input, select, multi-select, file upload, etc.)
   - Navigation (sidebar, top bar, breadcrumbs, tabs)
   - Data display (table, list, card, empty state, loading state)
   - Feedback (toast, alert, dialog, drawer)
   - Workspace-specific (task card, deliverable upload, activity item, comment thread)
   - For each: which shadcn/ui primitive maps to it (or "custom — needed because X")

Do these as 3 separate artifacts so I can hand each to Claude Code as needed.

Don't design every screen yet. Don't lock in a visual style yet — propose 2-3 directions for me to pick.

## Assistant

_[tool: read_file]_

_[tool: fig_read]_

_[tool: list_files]_

_[tool: list_files]_

_[tool: fig_ls]_

_[tool: fig_ls]_

_[tool: fig_ls]_

_[tool: fig_read]_

_[tool: fig_ls]_

_[tool: fig_ls]_

_[tool: fig_ls]_

_[tool: fig_ls]_

_[tool: fig_read]_

_[tool: fig_read]_

_[tool: fig_screenshot]_

_[tool: fig_screenshot]_

_[tool: fig_ls]_

_[tool: fig_ls]_

_[tool: fig_ls]_

_[tool: fig_ls]_

_[tool: fig_ls]_

_[tool: fig_grep]_

_[tool: fig_ls]_

_[tool: fig_read]_

_[tool: fig_ls]_

_[tool: fig_copy_files]_

_[tool: update_todos]_

_[tool: write_file]_

Now I have enough context. Existing brand DNA: violet (#8F1FFE) → magenta (#E467FE) → cyan gradient star, "Inturn" wordmark, cream backgrounds (#F4F2F1), Inter + Poppins + Bauziet display, soft shadows, 12px radius cards.

I'll build three docs that share a small "doc system" style. Let me start with the shared CSS and the landing page.

_[tool: write_file]_

Now the landing index linking the three deliverables.

_[tool: write_file]_

Now the meaty Brand Foundations doc — three full directions, each paste-able.

_[tool: write_file]_

_[tool: update_todos]_

_[tool: show_html]_

Let me quick-check the brand foundations doc renders cleanly, then write the journeys doc.

_[tool: write_file]_

Now the user journeys doc.

_[tool: write_file]_

_[tool: update_todos]_

_[tool: write_file]_

Now the component spec.

_[tool: write_file]_

_[tool: update_todos]_

_[tool: register_assets]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Done. Three docs ready, linked from `index.html`:

- **01 · Brand foundations** — logo rules + three full direction proposals (Studio, Workshop, Atlas), each with paste-able CSS-variable token blocks for colors, type, spacing, radii, shadows. Default recommendation: **B · Workshop** if you're stuck.
- **02 · User journeys** — all four arcs mapped with stage strip, emotion curve, screen-by-screen flow (with friction flags and value-moment cards), then a full screen list mapped to Sprints 1–6.
- **03 · Component spec** — 52 components in priority order, each tagged shadcn-or-custom with rationale, plus a Sprint 1 install block and 8 build rules for Claude Code.

When you've picked a direction in 01, strike through the other two and that token block becomes the only one Claude Code reads.

## User

wich direction exactely , what should i choose ?

## Assistant

**Pick B · Workshop. Keep the existing Studio-style landing page you already have.**

Here's the honest reasoning, given what you actually have to ship:

**Why B wins for Inturn specifically**

1. **The workspace is the moat, not the marketing site.** You wrote it five times in the brief. The workspace is where data accrues, where companies either stay or revert to WhatsApp, where the real product lives. Workshop is optimized for workspace density under load. Studio and Atlas both drag here.

2. **You have no full-time designer.** Sam + 2 part-time devs + Claude Code. Workshop pairs 1:1 with shadcn/ui defaults — you ship faster, refactor less, and the UI looks intentional even when no one polished it. Atlas in particular is a 1.5–2× design tax you can't afford right now.

3. **The marketing site is already done.** You said it yourself: "Brand and landing page already designed." That existing landing is already Studio-flavored (cream, gradient, Bauziet serif). Keep it. The product app behind the signup is what we're picking a direction for — and the app should be Workshop.

4. **French copy.** Tunisian/French copy runs ~18% longer than English. Geist Sans at 14–28px handles this gracefully. Bricolage Grotesque at display sizes gets cramped fast. Instrument Serif (Studio) is beautiful but slower to scan in dense screens.

5. **Mobile-first on 360px Tunisian Android.** Workshop's tight density (8px radii, 14px body, slate neutrals) reads cleanly at small sizes. Atlas's 84px display headlines fight the viewport.

**The trade-off you're accepting**

Workshop's risk is "looks like another SaaS." Three things mitigate it:

- The Inturn gradient star stays on every screen — the wordmark and brand mark are direction-agnostic.
- The existing landing page does the brand-impression work for you at the top of the funnel.
- Bring violet in deliberately at moments of value — the match score chip, "application accepted" toast, the Intern Record artifact. Strategic color > everywhere color.

**When you'd reconsider**

- If you decide to redesign the landing page from scratch → reconsider A or C.
- If you start selling to universities directly in Phase 2 → A reads more trustworthy to institutional buyers.
- If Hi Interns starts copying your workspace UI in 6 months → C becomes worth the design tax.

For now: **B**, paste the token block from the Workshop section into `app/globals.css`, and tell Claude Code that's the system. Want me to strike through A and C in the doc and consolidate the recommendation?

## User

B

## Assistant

_[tool: str_replace_edit]_

Locking it in. I'll strike through A and C, mark B as chosen, and pull its tokens up to the top of the doc so Claude Code can't miss them.

_[tool: read_file]_

_[tool: str_replace_edit]_

Now mark up A and C as struck-through, mark B as chosen, give the B token block an anchor id, and update the comparison cards + decision table.

_[tool: str_replace_edit]_

Now anchor B's token block + update the decision section copy.

_[tool: grep]_

_[tool: grep]_

_[tool: read_file]_

_[tool: str_replace_edit]_

_[tool: grep]_

_[tool: read_file]_

_[tool: str_replace_edit]_

Now the CSS for the decision banner, chosen/rejected states, and the strike-through effects.

_[tool: str_replace_edit]_

Now update the index card for 01 to show the decision is locked in.

_[tool: str_replace_edit]_

_[tool: done]_

Locked in. **B · Workshop** is now the system of record:

- **Top of the brand doc** has a chosen-direction banner with a one-click jump to the token block — that's what Claude Code pastes into `app/globals.css`.
- **A and C are struck through** but kept below as a reasoning trail in case you want to revisit later.
- **Index card for 01** shows the decision so future-you doesn't forget.
- **"Why B won" section** (formerly "How to decide") preserves the comparison table as the rationale record.

Hand `01-brand-foundations.html` to Claude Code first thing in the next session and tell it to ignore everything that isn't B.

## User

what else now ?

## Assistant

You're in a good place — Claude Code can start Sprint 1 with what you have. But there are a few design artifacts that will save you real time if I do them before code ships, ranked by leverage:

**1. One full screen mocked in Workshop direction — workspace shell (highest leverage)**
The 6-tab workspace is the unknown territory and the biggest sprint (S2). Mocking just the Overview tab at full fidelity does three jobs at once: validates Workshop feels right before any code gets written, gives Claude Code a target instead of a guess, and surfaces real layout decisions (sidebar density, how the supervisor face anchors the page, where activity surfaces).

**2. Sprint 1 wireframes — auth + profile creation flow**
The 5 screens that ship week 1–2: signup, profile basics, skills+CV, org profile, landing polish notes. Low-fi layout sketches, not full mockups. This is what Claude Code's first PR pushes against. Without it you'll get a generic shadcn flow.

**3. The 5 critical empty states, designed**
Your component spec calls these out as "emotional empty states, not generic" — they're a custom primitive. Worth designing them as a small set: empty workspace, empty applications inbox, no tasks yet, profile incomplete, no internships matched. ~1hr of work, becomes a library.

**4. Logo as SVG**
Right now I only have a PNG export from Figma. At 24px in the sidebar that'll be fuzzy. Either extract a clean SVG from your Figma source, or send me the original.

**5. Email templates — acceptance + weekly digest**
J2's first user-facing surface is an email, not a screen. The acceptance email + Friday digest are high-impact and Resend-templated, so they're fast to nail.

**My pick if you only do one:** mock the workspace overview in Workshop. Want me to start there?

## User

2. Sprint 1 wireframes — auth + profile creation flow The 5 screens that ship week 1–2: signup, profile basics, skills+CV, org profile, landing polish notes. Low-fi layout sketches, not full mockups. This is what Claude Code's first PR pushes against. Without it you'll get a generic shadcn flow.

## Assistant

_[tool: copy_starter_component]_

_[tool: update_todos]_

Good call. Let me set up the canvas.

_[tool: read_file]_

_[tool: write_file]_

_[tool: write_file]_

Now the entry HTML.

_[tool: write_file]_

Now add the wireframes card to the index landing.

_[tool: str_replace_edit]_

_[tool: grep]_

_[tool: str_replace_edit]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Sprint 1 wireframes are live. Five annotated artboards on a pan-zoom canvas at `04-sprint-1-wireframes.html`, also linked from the index:

- **01 · Signup** — single screen, role toggle, magic-link primary, password as escape hatch
- **02 · Profile basics** — 30-second target, university combobox, FR/EN as a profile field
- **03 · Skills + CV** — chip-input capped at 8, role chips capped at 3, optional CV with AI hook noted
- **04 · Org profile** — verification deferred to first acceptance per J3, design-partner override called out
- **05 · Landing polish notes** — surgical change list with a "do not change" section so Claude Code doesn't redesign

Each artboard has annotations in a right rail tying the layout decisions back to the journeys doc. Pan/zoom + drag-reorder + focus-mode work out of the box. Hand it to Claude Code with: *"Build these five screens in Workshop direction. Annotations are decisions, not suggestions."*

## User

Verifier agent check completed

## Assistant

All clean — verifier confirmed five artboards mount correctly with 42 callouts total. Ready for handoff.

## User

continue

## Assistant

_[tool: update_todos]_

_[tool: copy_starter_component]_

Continuing with the next-highest-leverage deliverable: **workspace overview at full fidelity, Workshop direction, both intern and supervisor views side-by-side.** This is the J2/J4 anchor screen — the moat surface. Doing it now validates Workshop visually and gives Claude Code an exact target for the biggest sprint (S2).

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: str_replace_edit]_

_[tool: grep]_

_[tool: read_file]_

_[tool: str_replace_edit]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Workspace overview live. Two artboards on the canvas — intern view and supervisor view, same data, role-aware framing. The cyan performance-signal block and "Better than 78% of interns" benchmark are surfaced to the supervisor only; the intern gets "I'm stuck" + the weekly check-in CTA instead. Both views run on the same component tree.

Open `05-workspace-overview.html` to validate the Workshop direction at full fidelity. If this lands, Sprint 2 has its target.

## User

Verifier agent check completed

## Assistant

_[tool: snip]_

_[tool: snip]_

_[tool: snip]_

_[tool: snip]_

All clean. Workspace overview validated — gradient logo, role-aware deltas (`.ws-stuck` intern-only, `.ws-perf` supervisor-only), Geist loaded, 12 tasks + 10 deliverables + 10 activity rows across both views.

Five deliverables now stacked in `index.html`. Hand them to Claude Code in order and Phase 1 has a clean runway.

## User

what about project , i think that project may have several internships ?

## Assistant

Sharp catch — and you're right. Your existing Figma already has a Project Hub concept that the current docs don't reflect. Let me fix the model:

**Project → Internship → Workspace**

| Layer | Owned by | Cardinality | What it is |
|---|---|---|---|
| **Project** | Company | 1 company has N projects | A real piece of work: *"Brand audit & system refresh"*. Has its own roadmap, milestones, team, and supervisor(s). |
| **Internship** | Project | 1 project has N internships | One role on the project, posted publicly: *"Visual designer · Brand audit"*, *"UX researcher · Brand audit"*. Has scope, skills, deliverables, its own application pipeline. |
| **Workspace** | Internship | 1 internship has M slots → M workspaces | One accepted intern's working surface. Six tabs unchanged. |

So Acme's *Brand audit* project posts three internships (visual designer, UX researcher, motion). Each gets its own marketplace listing, its own applications inbox, its own workspaces. The supervisor sees all three workspaces rolled up under one Project Hub.

**What changes in the deliverables**

1. **Data model** — Add `projects` table. `internships.project_id` FK. The events stream gets a `project_id` for cross-workspace rollups (this is the moat-aggregation layer).
2. **02 Journeys** — J3 starts with *"Create project"* before *"Add first internship"*. J4 gets a new beat: *"Supervise the project hub"* (the aggregated view across child workspaces).
3. **03 Component spec** — Add: Project card, Project Hub layout, Project switcher (sidebar), Cross-workspace activity rollup. Component count goes from 52 → ~58.
4. **05 Workspace mock** — The supervisor sidebar should group: *Projects → Internships → Workspaces* instead of flat "Active internships". The supervisor's top breadcrumb becomes 4 levels.
5. **Sidebar in 04 Sprint 1** — Doesn't change at signup, but org profile (artboard 4) probably wants a "your first project" prompt at the end instead of "post first internship."

**Two questions before I rebuild**

1. **Does a project ever live without an internship?** If yes (e.g. an internal Acme project that has no interns yet, used for org-side planning), that's a "Workspaces" feature in disguise — out of Phase 1 IMO, but tell me.
2. **Cross-project intern view** — when Yasmine works on *both* a Brand audit (Acme) and a UX research (Numentech) simultaneously, does she see one unified "my work" feed or two separate workspaces? My read: keep them separate (workspaces are the atom), but expose a "Today" view that aggregates across them.

Want me to update 02, 03, and 05 with the Projects layer in the same way I did the B lock-in — patch in place, mark the change with a timestamp?

## User

2 seperate workspace i think better right ? 1 it can be yes what do you think ?

## Assistant

_[tool: snip]_

_[tool: snip]_

Good — separate workspaces it is. The "Today" aggregator can come in Phase 2 if interns ask.

**On empty projects: yes, but constrained. Here's the rule I'd ship:**

A project can exist with zero internships, but only in **Draft** state. It cannot have public listings, it cannot accept interns, and it auto-archives after 30 days with no internship attached.

**Why allow it at all**
- **Design-partner workflow** — when Sam onboards a company in person, he wants to set up the project structure (name, brief, milestones, who supervises) *before* the company is ready to write its first listing. Without draft projects, he's blocked on having a polished JD in hand.
- **Internal scoping** — companies often need to think through "what's the whole thing we're hiring for" before writing the first role. The project shell gives them a place to do that without going public.
- **Multi-internship coordination** — if Acme knows from day one they need three roles, creating the project first and then adding three internships under it is much cleaner than writing three independent listings and trying to retroactively group them.

**Why the constraints matter**
- **Empty projects produce no data** — and the moat is data from real work. If we let drafts pile up, we get a graveyard of "projects" that look like activity but aren't. The 30-day auto-archive keeps the dataset honest.
- **No public listings without an internship** — protects the marketplace from "ghost" companies that look active without ever hiring.
- **Don't let it drift into Notion** — Phase 1 explicitly rejects becoming a generic project tool. Draft projects must have only a few fields (name, brief, supervisors). No tasks, no docs, no calendar. The minute a draft has "real" project content, we're competing with Asana and we lose.

**State machine, concretely**

```
draft  ─[add internship]─►  active  ─[all internships closed]─►  archived
  │
  └─[30d no internship]─►  auto-archived
```

**What changes in the deliverables**

- **02 Journeys** — J3 gains a *Sprint 3* substep: *"Create project (draft) → Add first internship → Project goes active."* The path stays linear; the draft is just an optional pause.
- **03 Component spec** — Project Hub gets a "Draft" empty state. The big yellow banner says: *"This project goes live the moment you publish your first internship."*
- **05 Workspace mock** — Doesn't change for the intern (interns never see drafts). Supervisor sidebar shows draft projects in a muted "Drafts" sub-section, separated from "Active projects".

Want me to patch 02, 03, and 05 with the Projects layer now, including the draft state? About 30 min of work. The wireframes (04) don't need touching — projects don't surface until Sprint 3.

## User

the workflow that need to be working , that company can create project IA can help to make it clear and structure and then IA can help decompose it into sprints and tasks , also can recommend the interns roles and number , do you that ?

## Assistant

_[tool: snip]_

_[tool: snip]_

**Yes — and this is the single biggest moat-compounding feature in Phase 1.** Build it. Here's how I'd shape it so it doesn't become AI slop.

**The flow, six steps**

```
1. Pitch     → company types a paragraph or pastes a doc / brief
2. Clarify   → AI asks 3–5 sharp questions inline ("What's the deadline?
                                                    On-site or remote?
                                                    Existing brand assets?")
3. Structure → AI drafts the project shell: name · brief · goals · duration
4. Decompose → AI splits into 3–6 phases, each with deliverables + dates
5. Staff     → AI recommends roles, count, skills, weeks needed, paid/unpaid
6. Review    → every field editable, company publishes internships one at a time
```

Every step ends in **company review + edit**. The AI never publishes a listing on its own. Per your brief's non-negotiable: *"AI suggests, humans decide."*

**The framing that keeps it from being slop**

- **It's an assistant, not an oracle.** UI language is *"Here's a draft — adjust"* not *"Here's the plan."*
- **Confidence is shown, never hidden.** Each AI suggestion carries a tag: *"Based on 0 similar projects"* in month 1 → *"Based on 47 similar projects on Inturn"* in month 12. The honesty itself is a feature.
- **Source-cited when N is big enough.** When the data is there: *"Companies hiring for 'brand audit + 12 weeks' typically post 2 internships — 1 visual designer, 1 illustrator. 78% completion rate."* Click → see the cohort.
- **Edit anywhere kills nothing.** Editing a phase doesn't invalidate the role recommendation. The AI flow is a draft generator, not a chain that breaks.
- **No clever animation, no fake typing.** This is a tool. Show the draft fast, let them edit faster.

**Why this is the moat play, not a feature**

This is exactly where the data compounds. Every project run through the AI produces a structured record: pitch → questions answered → phases shipped → roles staffed → completion rate → intern performance. After 50 projects you have a training set no competitor can match. After 500 you have a structured benchmark for "what a 12-week design audit actually looks like" in Tunisia — that's a defensible primitive.

Hi Interns can copy your UI. They can't copy 12 months of structured project outcomes.

**Phase plan**

| Sprint | What ships |
|---|---|
| **S3** | Project + Internship + AI-fields schema. Manual "Create project" form. The data model is locked from day one so the AI layer can be added without migration. |
| **S6** | The AI flow (steps 1–5). Behind a feature flag. Companies can still hand-create projects. |
| **Phase 2** | Cohort-grounded recommendations. The "78% completion rate" data appears only when N ≥ 30 similar projects. |

This lets you launch the basic product in 12 weeks and the AI flow lands as a power feature on top — not a blocker.

**Honest risks**

- **The first 10 companies see LLM-generic suggestions** because there's no Inturn-cohort data yet. Address this by manually currating Sam's preferred templates and seeding them as "Sam's playbook" — feels editorial, not algorithmic.
- **Bad role recommendation = lost trust permanently.** Ship the role recommender LAST, behind a flag, with explicit "this is a draft" wording on every suggestion. A wrong "1 designer + 2 marketers" reads as broken software.
- **Decomposition into sprints/tasks is the hardest part.** "Phases" with deliverables is achievable. "Tasks per phase" is where AI breaks down — defer that to Phase 2 or only generate task *templates*, not actual scheduled tasks.

**What I'd update in the docs**

- **02 Journeys** — J3 gets an "AI-assisted" branch alongside the manual flow. Both lead to the same Project Hub.
- **03 Components** — Add: AI Pitch input, AI Clarifier chat panel, AI Suggestion card (with confidence tag + sources), Role recommendation card.
- **05 Workspace mock** — Project Hub gets a "Generated by AI · edit anything" header strip until the company hits "lock structure".

Want me to draft the **AI-assisted Project creation flow as a new artboard set on the canvas** (steps 1–5 wireframed), so we can validate the conversation shape before Sprint 6 ships?

## User

yes yes

## Assistant

_[tool: snip]_

_[tool: snip]_

_[tool: copy_starter_component]_

_[tool: write_file]_

Now the JSX wireframes.

_[tool: write_file]_

_[tool: write_file]_

Now update the index card list.

_[tool: str_replace_edit]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Six deliverables now. The AI Project flow sits at `06-ai-project-flow.html` — five artboards mapping the conversation: pitch → clarify → structure → phases → roles. The clarify step is laid out as a real chat (not a form), because the shape we're validating is *how the AI asks*, not how the questions look as fields.

Sprint 3 still ships the manual project create. The AI flow lands on top in Sprint 6, no schema migration needed — that's what makes this safe to defer.

## User

Verifier agent check completed

## Assistant

_[tool: snip]_

Verifier clean. Six deliverables locked in `index.html` — ready for the next move.

## User

what we should do ?

## Assistant

_[tool: snip]_

**Honest read on where we are**

What's done and Claude Code can act on:
- Brand tokens · **B Workshop locked**
- 4 user journeys · mapped
- 52 components · specced + mapped to shadcn
- 5 Sprint-1 wireframes · auth + profile
- Workspace overview · 2-role mock at full fidelity
- AI Project flow · 5-step wireframes

What's NOT yet in the docs but should be:
- **Projects layer** — we agreed on it in chat (Projects → Internships → Workspaces, draft state, 30-day auto-archive) but it's not patched into 02, 03, or 05. That's a stale-docs risk.
- Project Hub screen (the supervisor's roll-up view across child workspaces)
- 5 empty states as a primitive library
- Email templates (acceptance, weekly digest)
- Logo as clean SVG

**What I'd do next, ranked**

**1. Patch the Projects layer into docs 02 + 03 + 05.** ~30 min. Highest leverage because everything else we build will reference these docs. If they say "internships" but our model is "projects → internships → workspaces," Claude Code reads inconsistent specs and we get bugs in week 1. Cheap to fix now, expensive later.

**2. Hand Sprint 1 to Claude Code in parallel.** It doesn't depend on Projects (signup + profiles ship before any project exists). Claude Code can install foundation components and ship the auth flow this week. We deliver remaining artifacts on a different track.

**3. Project Hub mock.** Once the Projects model is in the docs (step 1), the Hub is the missing screen. Same canvas as the workspace overview, one new artboard, ~1h.

**4. Empty states library + email templates.** Important but Sprint 2 / 5 not Sprint 1 — defer to next week without risk.

**5. SVG logo.** You own the source — send me the Figma export or the original vector and I'll set it up cleanly. Until then the PNG is fine at 24px+, fuzzy below.

**My pick for right now: do #1.** Patch the Projects layer into 02, 03, 05 so the package is internally consistent before you ship it to Claude Code. Then unblock him on Sprint 1 today.

Say the word and I'll do the patch.

## User

ok 1

## Assistant

_[tool: snip]_

_[tool: read_file]_

_[tool: grep]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: str_replace_edit]_

_[tool: read_file]_

_[tool: str_replace_edit]_

_[tool: grep]_

_[tool: str_replace_edit]_

_[tool: grep]_

_[tool: read_file]_

_[tool: grep]_

_[tool: str_replace_edit]_

_[tool: read_file]_

_[tool: str_replace_edit]_

_[tool: grep]_

_[tool: str_replace_edit]_

_[tool: read_file]_

_[tool: str_replace_edit]_

Now restructure the supervisor sidebar in workspace.jsx and update the breadcrumb.

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Projects layer patched into all three docs. Index now reads v0.4. 02 and 03 carry a v0.2 marker each; 05's supervisor sidebar shows the new Projects → Internships hierarchy with a draft project as proof of the state machine. Everything internally consistent — Claude Code can now ship Sprint 1 without reading stale specs.

## User

Verifier agent check completed

## Assistant

_[tool: snip]_

Verifier clean. Foundations package now internally consistent at v0.4. Six deliverables in `index.html`, ready to hand to Claude Code.

