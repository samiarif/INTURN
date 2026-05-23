# Project Hub mock

_Started 2026-05-23 21:04 UTC_

---

## User

what was missing is :  

3. Project Hub mock. Once the Projects model is in the docs (step 1), the Hub is the missing screen. Same canvas as the workspace overview, one new artboard, ~1h.

4. Empty states library + email templates. Important but Sprint 2 / 5 not Sprint 1 — defer to next week without risk.

5. SVG logo. You own the source — send me the Figma export or the original vector and I'll set it up cleanly. Until then the PNG is fine at 24px+, fuzzy below.

## Assistant

_[tool: list_files]_

_[tool: read_file]_

_[tool: list_files]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: grep]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

Got it — Project Hub it is. Same canvas, one new artboard. I'll add a new DCSection before the workspace one so the supervisor's flow reads naturally: land at Hub → drill into a workspace.

Let me check the existing AI flow canvas briefly to see if it has reusable bits, then build.

_[tool: write_file]_

Now I have enough context. Plan:

1. New `mocks/project-hub.jsx` — supervisor's Project Hub screen (Brand audit roll-up)
2. New `mocks/project-hub.css` — just the few new pieces (phase strip, internship rows, supervisor cluster)
3. Update `05-workspace-overview.html` to load both, retitle, and update the top crumb
4. Update `mocks/workspace.jsx` App() to wrap with a new DCSection containing the Hub artboard above the existing workspace ones

Reuse all `.ws-*` tokens from `workspace.css` so the visual system stays locked.

_[tool: write_file]_

Now the JSX for the hub itself:Now wire it into the canvas. Update `workspace.jsx` App() to add the Project Hub artboard as a new section before the workspace one, then update the HTML to load the new files and adjust the page title/crumb.

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Also update the index card so it reflects the new artboard:

_[tool: str_replace_edit]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Added — Project Hub is now the first artboard on the same canvas as the workspace overview.

**What's on it:**
- Same shell as workspace (top bar, sidebar, right rail) so it reads as one system, just one level up
- Project brief with goals + team cluster
- Phase strip (4 phases, Phase 1 active in cyan)
- 4 KPI tiles rolled up across both internships
- Internships roster — Yasmine + Lina, each with open-workspace links
- Cross-workspace activity feed (with workspace-source chips)
- Right rail: project signal, joint sync CTA, supervisor cluster

**Sidebar treatment:** Brand audit project itself is the active row (purple), no workspace child active — signals you're at the project level, not inside an intern's workspace.

**Punted, as agreed:** empty-states library + email templates (Sprint 2/5), SVG logo (waiting on you).

## User

Verifier agent check completed

## Assistant

Verifier's happy. You're good to go.

## User

not bad , what else. should we hit ?

## Assistant

A few things would unblock Sprint 2/3 cleanly. Ranked by what Claude Code is most likely to be stuck on:

**1. Workspace · Tasks board** *(Sprint 2 · ~2h)*
The next anchor screen after Overview. Drag-between-columns, role-aware, same chrome. Currently the Tasks tab is a label with no design — the build will stall there. Add as a third section on the same canvas.

**2. Create Project + Post Internship flow** *(Sprint 3 · ~3h, wireframe-level)*
The Hub assumes a project exists; right now there's no door. Multi-step wireframe in the same style as Sprint 1, ending at the Hub we just shipped. Pairs with J3 step 4–5.

**3. Workspace · Deliverables (versions view)** *(Sprint 2 · ~1.5h)*
v1/v2/v3 forever is a core promise — and it's the surface where Mehdi's "request changes" loop lives. Without a mock, the version chrome will get reinvented.

**4. Empty states library** *(Sprint 2 · ~1h, was deferred)*
Still deferred but cheap once we're in the workspace files. Can pick it up as a sidecar to whichever workspace screen comes next.

If I had to pick one: **#1 Tasks board**. It's the screen with the most interaction surface area, the one I'd most want to see designed before Claude Code touches it.

Want me to start there?

## User

Workspace · Tasks board

## Assistant

_[tool: write_file]_

On it. Same pattern: new section on the same canvas, two artboards (intern + supervisor) to keep role-aware proof going. New files for the board chrome, reusing all the `.ws-*` shell + tokens.

_[tool: write_file]_

Now expose TopBar + Sidebar from workspace.jsx, and add the new section to App():

_[tool: str_replace_edit]_

Now wire it into the HTML:

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Quick fix — the supervisor TopBar hardcodes "Overview" as the last crumb. Let me thread a `tab` prop:

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Update the index card to mention the tasks board:

_[tool: done]_

_[tool: fork_verifier_agent]_

Tasks board is in — same canvas, intern + supervisor.

**What's new:**
- 4-column kanban: To do · In progress · In review · Done
- Cards carry tag (BA-XXX), discipline label, due date, deliverable link, comment/attachment counts, assignee
- Urgent cards get an orange left-border; supervisor view adds the "NEEDS REVIEW" purple ring on BA-003
- Supervisor-only review banner at top — "1 task is waiting on you" with jump link
- Toolbar: Board/List/Calendar view toggle + filter chips + sort/group dropdowns
- Crumbs now end in the tab name ("Tasks"), not hardcoded "Overview"
- Role differences: intern sees "Suggest task / + Add subtask"; supervisor sees "Templates / + Assign task"

**Next reasonable hits, in order:**
1. **Workspace · Deliverables (v1/v2/v3 versions view)** — closes the loop the "NEEDS REVIEW" card opens into
2. **Create Project + Post Internship multi-step** — the door into the Hub
3. **Empty states pass** across all workspace screens — quick once we're in these files

## User

Verifier agent check completed

## Assistant

All green.

