// AI-assisted Project creation flow — 5 artboards
// Workshop direction, mid-fidelity. Conversation shape > pixel polish.

/* ============================================================
   Shared chrome (top bar + step indicator)
   ============================================================ */
function AiTop({ activeStep }) {
  const steps = [
    { num: 1, name: 'Pitch' },
    { num: 2, name: 'Clarify' },
    { num: 3, name: 'Structure' },
    { num: 4, name: 'Phases' },
    { num: 5, name: 'Roles' },
    { num: 6, name: 'Publish' },
  ];
  return (
    <>
      <div className="ai-top">
        <div className="ai-top-brand">
          <span className="star"></span>
          <span>Inturn</span>
        </div>
        <div className="ai-top-crumbs">
          <span>Acme Studio</span>
          <span className="sep">/</span>
          <span>Projects</span>
          <span className="sep">/</span>
          <b>New project</b>
        </div>
        <div className="ai-top-spacer"></div>
        <div className="ai-top-actions">
          <span className="ai-tag muted">Draft · auto-saved</span>
          <button className="ai-btn ghost tiny">Save &amp; exit</button>
          <span className="ai-top-avatar">MT</span>
        </div>
      </div>
      <div className="ai-steps">
        {steps.map((s, i) => (
          <React.Fragment key={s.num}>
            <div className={`ai-step ${s.num < activeStep ? 'done' : ''} ${s.num === activeStep ? 'active' : ''}`}>
              <span className="num">{s.num >= activeStep ? <span className="n">{String(s.num).padStart(2, '0')}</span> : null}</span>
              <span>{s.name}</span>
            </div>
            {i < steps.length - 1 && <span className={`ai-step-sep ${s.num < activeStep ? 'done' : ''}`}></span>}
          </React.Fragment>
        ))}
      </div>
    </>
  );
}

/* ============================================================
   01 · PITCH
   ============================================================ */
function AiPitch() {
  return (
    <div className="ai">
      <AiTop activeStep={1} />
      <div className="ai-body">
        <main className="ai-main">
          <div className="ai-main-narrow">
            <div className="ai-eyebrow">Step 1 of 6 · Pitch</div>
            <h1 className="ai-h1">What are you trying to do?</h1>
            <p className="ai-deck">Paste a brief, type a paragraph, or upload a doc. Inturn will draft a project, phases, and intern roles &mdash; you edit anything. Nothing goes public until you publish.</p>

            <textarea
              className="ai-textarea"
              placeholder="We need to refresh our brand. We have about 12 weeks. The current logo and visual system feel dated — we want a real audit, then a new system, then guidelines we can hand to freelancers. Hybrid is fine, mostly remote OK..."
              defaultValue={"We need to refresh Acme's brand end-to-end. The current logo, type, and palette feel dated and inconsistent across product/marketing.\n\nGoal: audit what we have, build a new visual system, hand off a Figma library plus guidelines so anyone in the team can use it.\n\nTimeline ~3 months. We can supervise from Tunis. Mix of on-site and remote is fine. We have an existing wordmark we want to keep but evolve."}
            />
            <div className="ai-textarea-toolbar">
              <span>Markdown supported · paste from Notion or Google Docs is fine</span>
              <span className="count">412 / 4,000</span>
            </div>

            <div className="ai-alt-row">
              <div className="ai-alt-tile">
                <span className="ico"></span>
                <b>Upload a brief</b>
                <span>PDF, DOCX, or Markdown · we'll read the content</span>
              </div>
              <div className="ai-alt-tile">
                <span className="ico"></span>
                <b>Paste a Notion / Drive link</b>
                <span>We import the page text · never the comments</span>
              </div>
            </div>

            <div className="ai-btn-bar">
              <button className="ai-btn text">← Skip AI · I'll fill in by hand</button>
              <button className="ai-btn brand big">Help me structure this →</button>
            </div>
          </div>
        </main>

        <aside className="ai-rail">
          <div className="ai-rail-card">
            <h4>How this works</h4>
            <p>Inturn drafts a project from your pitch. You see and edit every step before anything is final.</p>
            <hr/>
            <p><b>1.</b> Five questions to clarify scope.<br/><b>2.</b> Draft project shell.<br/><b>3.</b> Phases &amp; deliverables.<br/><b>4.</b> Recommended intern roles + count.</p>
          </div>

          <div className="ai-rail-section source">
            <h5>Privacy &middot; what we do with this</h5>
            <p>Your pitch is used to draft your project, and to anonymously improve role-recommendation quality for future companies. <b>Never shared with interns until you publish</b>.</p>
          </div>

          <div className="ai-rail-section">
            <h5>Phase 1 · grounded in</h5>
            <p>This early, suggestions are based on <b>general internship structure</b>, not Inturn data. Once 30+ similar projects ship, recommendations start to cite real Inturn cohorts.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ============================================================
   02 · CLARIFY
   ============================================================ */
function AiClarify() {
  return (
    <div className="ai">
      <AiTop activeStep={2} />
      <div className="ai-body">
        <main className="ai-main">
          <div className="ai-main-narrow">
            <div className="ai-eyebrow">Step 2 of 6 · Clarify</div>
            <h1 className="ai-h1">Five quick questions.</h1>
            <p className="ai-deck">Sharper answers here make the draft sharper. You can skip any &mdash; we'll guess and you can fix later.</p>

            <div className="ai-pitch-card">
              <div className="ai-pitch-card-label">
                <span style={{ width: 8, height: 8, background: 'var(--ink-4)', borderRadius: 99 }}></span>
                Your pitch
              </div>
              We need to refresh Acme's brand end-to-end. Goal: audit, new visual system, Figma library + guidelines. ~3 months. Tunis-based, hybrid OK. Existing wordmark we want to evolve.
              <a className="ai-pitch-card-edit">Edit ↗</a>
            </div>

            <div className="ai-chat">
              <div className="ai-msg is-ai">
                <span className="ai-msg-av"></span>
                <div>
                  <div className="ai-msg-body">
                    Got it. Brand refresh, 3 months, evolve the wordmark not replace it. Five questions before I draft &mdash;
                  </div>
                  <div className="ai-msg-meta">INTURN AI · 11:42</div>
                </div>
              </div>

              <div className="ai-msg is-ai">
                <span className="ai-msg-av"></span>
                <div className="ai-msg-body">
                  <p><b>1. What's your hard deadline?</b></p>
                  <div className="ai-q-opts" style={{ marginTop: 10 }}>
                    <span className="ai-q-opt">This month</span>
                    <span className="ai-q-opt brand">2–3 months</span>
                    <span className="ai-q-opt">3–6 months</span>
                    <span className="ai-q-opt">Flexible</span>
                  </div>
                </div>
              </div>

              <div className="ai-msg is-ai">
                <span className="ai-msg-av"></span>
                <div className="ai-msg-body">
                  <p><b>2. What kind of audit?</b></p>
                  <div className="ai-q-opts" style={{ marginTop: 10 }}>
                    <span className="ai-q-opt brand">Brand + visual system</span>
                    <span className="ai-q-opt">User research too</span>
                    <span className="ai-q-opt">Just visual</span>
                  </div>
                </div>
              </div>

              <div className="ai-msg is-ai">
                <span className="ai-msg-av"></span>
                <div className="ai-msg-body">
                  <p><b>3. How many people on Acme's side will review work?</b></p>
                  <div className="ai-q-opts" style={{ marginTop: 10 }}>
                    <span className="ai-q-input">▾ 1–2 reviewers</span>
                    <span className="ai-q-opt" style={{ color: 'var(--ink-4)' }}>Skip</span>
                  </div>
                </div>
              </div>

              <div className="ai-msg is-ai">
                <span className="ai-msg-av"></span>
                <div className="ai-msg-body">
                  <p><b>4. Existing assets to start from?</b></p>
                  <div className="ai-q-opts" style={{ marginTop: 10 }}>
                    <span className="ai-q-opt brand">Yes &mdash; we'll upload</span>
                    <span className="ai-q-opt">No, fresh start</span>
                  </div>
                </div>
              </div>

              <div className="ai-msg is-ai">
                <span className="ai-msg-av"></span>
                <div className="ai-msg-body">
                  <p><b>5. Pick your priority &mdash;</b></p>
                  <div className="ai-q-opts" style={{ marginTop: 10 }}>
                    <span className="ai-q-opt">Speed</span>
                    <span className="ai-q-opt brand">Craft</span>
                    <span className="ai-q-opt">Cost-effective</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="ai-btn-bar">
              <button className="ai-btn text">← Edit pitch</button>
              <button className="ai-btn brand big">Draft my project →</button>
            </div>
          </div>
        </main>

        <aside className="ai-rail">
          <div className="ai-rail-card">
            <h4>Why these questions?</h4>
            <p>Each answer changes the draft &mdash;</p>
            <hr/>
            <p><b>Deadline</b> → phase durations</p>
            <p><b>Audit type</b> → which roles to recommend</p>
            <p><b>Reviewers</b> → meeting cadence + comment volume</p>
            <p><b>Existing assets</b> → discovery phase length</p>
            <p><b>Priority</b> → trade-off framing in the draft</p>
          </div>

          <div className="ai-rail-section">
            <h5>Confidence so far</h5>
            <div className="conf">
              <div className="conf-row"><span className="lbl">Project shape</span><span className="bar"><i style={{ width: '78%' }}></i></span><span className="v">78%</span></div>
              <div className="conf-row"><span className="lbl">Phase split</span><span className="bar"><i style={{ width: '64%' }}></i></span><span className="v">64%</span></div>
              <div className="conf-row"><span className="lbl">Roles needed</span><span className="bar"><i style={{ width: '50%' }}></i></span><span className="v">50%</span></div>
            </div>
            <p style={{ marginTop: 10, fontSize: 12, color: 'var(--ink-3)' }}>Two more answers will lift roles above 75%.</p>
          </div>

          <div className="ai-rail-section">
            <h5>You're not committing</h5>
            <p>Every answer is editable from the project hub later. Skip any.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ============================================================
   03 · STRUCTURE
   ============================================================ */
function AiStructure() {
  return (
    <div className="ai">
      <AiTop activeStep={3} />
      <div className="ai-body">
        <main className="ai-main">
          <div className="ai-main-wide">
            <div className="ai-eyebrow">Step 3 of 6 · Structure</div>
            <h1 className="ai-h1">Your project draft.</h1>
            <p className="ai-deck">Click any field to edit. The phases and roles in the next steps are based on this &mdash; if you change something fundamental here, we'll regenerate them.</p>

            <div className="ai-struct">
              <div className="ai-struct-head">
                <h2 style={{ flex: 1 }}>Project draft</h2>
                <span className="ai-tag">AI · click to edit anything</span>
                <button className="ai-btn ghost tiny">↻ Regenerate</button>
              </div>

              <div className="ai-struct-field">
                <span className="ai-struct-field-label">Name</span>
                <div className="ai-struct-input lg">Brand audit &amp; system refresh</div>
              </div>

              <div className="ai-struct-field">
                <span className="ai-struct-field-label">One-liner</span>
                <div className="ai-struct-input multi">A full audit of Acme's brand followed by a new visual system, delivered as a Figma library plus written guidelines anyone on the team can use.</div>
              </div>

              <div className="ai-struct-field">
                <span className="ai-struct-field-label">Goals</span>
                <div className="ai-struct-goals">
                  <div className="ai-struct-goal">
                    <span></span><span className="dot"></span>
                    <span className="ai-struct-goal-text">Identify what works and what doesn't in the current brand</span>
                    <span className="x">×</span>
                  </div>
                  <div className="ai-struct-goal">
                    <span></span><span className="dot"></span>
                    <span className="ai-struct-goal-text">Evolve the existing wordmark, don't replace it</span>
                    <span className="x">×</span>
                  </div>
                  <div className="ai-struct-goal">
                    <span></span><span className="dot"></span>
                    <span className="ai-struct-goal-text">Ship a Figma library + 1-page guideline doc the team can apply without us</span>
                    <span className="x">×</span>
                  </div>
                  <div className="ai-struct-add">+ Add goal</div>
                </div>
              </div>

              <div className="ai-struct-field">
                <span className="ai-struct-field-label">Duration</span>
                <div>
                  <div className="ai-slider">
                    <div className="ai-slider-track">
                      <div className="ai-slider-fill" style={{ width: '60%' }}></div>
                      <div className="ai-slider-thumb" style={{ left: '60%' }}></div>
                    </div>
                    <div className="ai-slider-val">12 weeks</div>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>Min 4 &middot; Max 24 &middot; Recommended for brand audits: 10–14 weeks</p>
                </div>
              </div>

              <div className="ai-struct-field">
                <span className="ai-struct-field-label">Start date</span>
                <div className="ai-struct-input" style={{ display: 'inline-block', width: 'auto', padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 7 }}>
                  Monday, 1 June 2026
                </div>
              </div>

              <div className="ai-struct-field">
                <span className="ai-struct-field-label">Mode</span>
                <div className="ai-seg">
                  <span>On-site</span>
                  <span className="on">Hybrid (3d/wk)</span>
                  <span>Virtual</span>
                </div>
              </div>

              <div className="ai-struct-field">
                <span className="ai-struct-field-label">Supervisors</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className="ai-meta-chip"><b>MT</b> Mehdi Triki <span style={{ color: 'var(--ink-3)' }}>(you)</span></span>
                  <span className="ai-meta-chip" style={{ borderStyle: 'dashed', background: 'transparent' }}>+ Add supervisor</span>
                </div>
              </div>
            </div>

            <div className="ai-btn-bar">
              <button className="ai-btn text">← Back to clarify</button>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="ai-btn ghost">↻ Regenerate</button>
                <button className="ai-btn brand big">Looks good → phases →</button>
              </div>
            </div>
          </div>
        </main>

        <aside className="ai-rail">
          <div className="ai-rail-card">
            <h4>Why these defaults</h4>
            <p><b>12 weeks</b> &mdash; brand audits typically need 4w discovery + 6w design + 2w handoff. You said 3 months, this fits.</p>
            <p><b>Hybrid</b> &mdash; you said hybrid OK. Recommended pattern: Mon–Wed on-site to land stakeholder syncs, rest remote.</p>
            <p><b>Wordmark goal</b> &mdash; pulled from your pitch. Important: kept as an explicit goal so reviewers don't forget.</p>
          </div>

          <div className="ai-rail-section">
            <h5>What's locked vs editable</h5>
            <p style={{ color: 'var(--ink-3)' }}>Everything's editable. Changing <b>duration</b> by &gt;2 weeks or <b>mode</b> will regenerate phases on next step.</p>
          </div>

          <div className="ai-rail-section source">
            <h5>Cohort data &middot; not yet</h5>
            <p>0 similar &ldquo;brand audit · 12 week · hybrid&rdquo; projects on Inturn yet. These are general defaults. Confidence will rise as the cohort fills in.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ============================================================
   04 · PHASES
   ============================================================ */
function AiPhases() {
  return (
    <div className="ai">
      <AiTop activeStep={4} />
      <div className="ai-body">
        <main className="ai-main">
          <div className="ai-main-wide">
            <div className="ai-eyebrow">Step 4 of 6 · Phases</div>
            <h1 className="ai-h1">Four phases, 12 weeks, 5 deliverables.</h1>
            <p className="ai-deck">Drag-edit each phase. Add deliverables or push dates. The phases become the roadmap interns see in their workspace.</p>

            <div className="ai-phases-head">
              <div className="ai-phases-stats">
                <span><b>4</b> phases</span>
                <span><b>5</b> deliverables</span>
                <span><b>12</b> weeks total</span>
                <span><b>1 Jun → 25 Jul</b></span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="ai-btn ghost tiny">+ Add phase</button>
                <button className="ai-btn ghost tiny">↻ Regenerate</button>
              </div>
            </div>

            <div className="ai-phases">
              <div className="ai-phase active">
                <div className="ai-phase-head">
                  <span className="ai-phase-num">Phase 1</span>
                  <span className="ai-phase-dur">2w</span>
                </div>
                <div className="ai-phase-title">Discovery</div>
                <p style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>
                  Stakeholder interviews, audit of current brand, competitive scan.
                </p>
                <div className="ai-phase-deliv">
                  <div className="ai-phase-deliv-label">Deliverable</div>
                  <div className="ai-phase-deliv-item"><span className="sq"></span><span>Brand audit document with findings</span></div>
                </div>
              </div>

              <div className="ai-phase">
                <div className="ai-phase-head">
                  <span className="ai-phase-num">Phase 2</span>
                  <span className="ai-phase-dur">3w</span>
                </div>
                <div className="ai-phase-title">Strategy &amp; direction</div>
                <p style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>
                  Visual exploration, type pairings, palette directions, moodboards.
                </p>
                <div className="ai-phase-deliv">
                  <div className="ai-phase-deliv-label">Deliverable</div>
                  <div className="ai-phase-deliv-item"><span className="sq"></span><span>Visual direction deck · 3 options</span></div>
                </div>
              </div>

              <div className="ai-phase">
                <div className="ai-phase-head">
                  <span className="ai-phase-num">Phase 3</span>
                  <span className="ai-phase-dur">5w</span>
                </div>
                <div className="ai-phase-title">Design system build</div>
                <p style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>
                  Logo refresh, full type + color system, components, illustrations, icons.
                </p>
                <div className="ai-phase-deliv">
                  <div className="ai-phase-deliv-label">Deliverables</div>
                  <div className="ai-phase-deliv-item"><span className="sq"></span><span>Refreshed wordmark · final</span></div>
                  <div className="ai-phase-deliv-item"><span className="sq"></span><span>Figma library v1 · components</span></div>
                </div>
              </div>

              <div className="ai-phase">
                <div className="ai-phase-head">
                  <span className="ai-phase-num">Phase 4</span>
                  <span className="ai-phase-dur">2w</span>
                </div>
                <div className="ai-phase-title">Handoff</div>
                <p style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>
                  Guidelines doc, training session, freelancer-ready package.
                </p>
                <div className="ai-phase-deliv">
                  <div className="ai-phase-deliv-label">Deliverable</div>
                  <div className="ai-phase-deliv-item"><span className="sq"></span><span>Brand guidelines · 1-page + Figma</span></div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 24, padding: 16, background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: 10, fontSize: 13, color: 'var(--ink-3)' }}>
              <b style={{ color: 'var(--ink-2)' }}>Tip</b> &middot; The phases are guidance, not gates. Interns work async &mdash; phases tell them what's next and supervisor what to expect by week.
            </div>

            <div className="ai-btn-bar">
              <button className="ai-btn text">← Back to structure</button>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="ai-btn ghost">↻ Regenerate phases</button>
                <button className="ai-btn brand big">Looks good → staff it →</button>
              </div>
            </div>
          </div>
        </main>

        <aside className="ai-rail">
          <div className="ai-rail-card">
            <h4>Why 4 phases?</h4>
            <p>Most brand projects of this length break cleanly into discover &middot; explore &middot; build &middot; ship. Fewer than 3 phases blurs review checkpoints; more than 5 creates fatigue.</p>
            <hr/>
            <p><b>Long phase 3</b> &mdash; the build phase is the bulk of the work. We've left 5 weeks so reviewers don't pressure-cooker the system.</p>
            <p><b>Phase 4 is non-negotiable</b> &mdash; handoff is what separates a project from a vibes doc.</p>
          </div>

          <div className="ai-rail-section">
            <h5>If you change &hellip;</h5>
            <p style={{ marginBottom: 6 }}>&middot; Duration &gt;2w → phases re-balance</p>
            <p style={{ marginBottom: 6 }}>&middot; Add a phase → roles adjust</p>
            <p>&middot; Remove handoff → we'll flag it</p>
          </div>

          <div className="ai-rail-section">
            <h5>What's <em>not</em> here</h5>
            <p style={{ color: 'var(--ink-3)' }}>Specific tasks. Tasks come from the supervisor week by week. AI can suggest task templates per phase &mdash; but never auto-assigns.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ============================================================
   05 · ROLES
   ============================================================ */
function AiRoles() {
  return (
    <div className="ai">
      <AiTop activeStep={5} />
      <div className="ai-body">
        <main className="ai-main">
          <div className="ai-main-wide">
            <div className="ai-eyebrow">Step 5 of 6 · Roles</div>
            <h1 className="ai-h1">Hire two interns. Maybe a third.</h1>
            <p className="ai-deck">Each toggle becomes a public internship listing &mdash; or a draft if you want to post later. Roles are tied to phases, not jobs &mdash; one intern can span phase 1&ndash;3 if you want.</p>

            <div className="ai-roles">

              <div className="ai-role">
                <div>
                  <div className="ai-role-head">
                    <span className="ai-role-title">Visual designer</span>
                    <span className="ai-tag">Primary &middot; spans phases 1–4</span>
                  </div>
                  <p className="ai-role-scope">
                    Lead the visual system. Run the audit, drive direction exploration in phase 2, build the Figma library in phase 3, package handoff in phase 4. Works directly with Mehdi on weekly check-ins.
                  </p>
                  <div className="ai-role-meta">
                    <span className="ai-meta-chip">12 weeks</span>
                    <span className="ai-meta-chip">Hybrid &middot; 3d/wk on-site</span>
                    <span className="ai-meta-chip">Paid &middot; <b>800 TND/mo</b></span>
                    <span className="ai-meta-chip">L3+ or M1</span>
                  </div>
                </div>
                <div className="ai-role-side">
                  <div>
                    <div className="ai-role-side-label" style={{ marginBottom: 8 }}>Recommended skills</div>
                    <div className="ai-skills">
                      <span className="ai-skill">Figma</span>
                      <span className="ai-skill">Brand systems</span>
                      <span className="ai-skill">Typography</span>
                      <span className="ai-skill">Visual ID</span>
                      <span className="ai-skill">Logo design</span>
                    </div>
                  </div>
                  <div>
                    <div className="ai-role-side-label">Number to hire</div>
                    <div className="ai-role-count">
                      <div className="ai-counter">
                        <button>−</button>
                        <span className="val">1</span>
                        <button>+</button>
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Recommend: 1</span>
                    </div>
                  </div>
                </div>
                <div className="ai-role-toggle">
                  <span className="ai-toggle"><span className="sw"></span>Include</span>
                </div>
              </div>

              <div className="ai-role">
                <div>
                  <div className="ai-role-head">
                    <span className="ai-role-title">UX researcher</span>
                    <span className="ai-tag">Supporting &middot; phase 1 only</span>
                  </div>
                  <p className="ai-role-scope">
                    Run stakeholder interviews and synthesize findings for the audit. Hand the synthesis to the visual designer at the end of phase 1. Short, dense engagement.
                  </p>
                  <div className="ai-role-meta">
                    <span className="ai-meta-chip">4 weeks</span>
                    <span className="ai-meta-chip">Virtual OK</span>
                    <span className="ai-meta-chip">Paid &middot; <b>800 TND/mo (prorata)</b></span>
                    <span className="ai-meta-chip">L3+ or M1</span>
                  </div>
                </div>
                <div className="ai-role-side">
                  <div>
                    <div className="ai-role-side-label" style={{ marginBottom: 8 }}>Recommended skills</div>
                    <div className="ai-skills">
                      <span className="ai-skill">User research</span>
                      <span className="ai-skill">Interview design</span>
                      <span className="ai-skill">Synthesis</span>
                      <span className="ai-skill">Affinity mapping</span>
                    </div>
                  </div>
                  <div>
                    <div className="ai-role-side-label">Number to hire</div>
                    <div className="ai-role-count">
                      <div className="ai-counter">
                        <button>−</button>
                        <span className="val">1</span>
                        <button>+</button>
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Recommend: 1</span>
                    </div>
                  </div>
                </div>
                <div className="ai-role-toggle">
                  <span className="ai-toggle"><span className="sw"></span>Include</span>
                </div>
              </div>

              <div className="ai-role optional">
                <div>
                  <div className="ai-role-head">
                    <span className="ai-role-title">Motion / illustration designer</span>
                    <span className="ai-tag muted">Optional &middot; phase 3 only</span>
                  </div>
                  <p className="ai-role-scope">
                    A short engagement to bring the system to life &mdash; illustration set, hero motion, a few small animations for the system library. Only if you want this layer.
                  </p>
                  <div className="ai-role-meta">
                    <span className="ai-meta-chip">3 weeks</span>
                    <span className="ai-meta-chip warn">Confidence <b>52%</b></span>
                    <span className="ai-meta-chip">Virtual</span>
                    <span className="ai-meta-chip">Paid &middot; <b>800 TND/mo (prorata)</b></span>
                  </div>
                </div>
                <div className="ai-role-side">
                  <div>
                    <div className="ai-role-side-label" style={{ marginBottom: 8 }}>Recommended skills</div>
                    <div className="ai-skills">
                      <span className="ai-skill">After Effects</span>
                      <span className="ai-skill">Lottie</span>
                      <span className="ai-skill">Illustration</span>
                    </div>
                  </div>
                  <div>
                    <div className="ai-role-side-label">Number to hire</div>
                    <div className="ai-role-count">
                      <div className="ai-counter">
                        <button>−</button>
                        <span className="val">0</span>
                        <button>+</button>
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Recommend: 0–1</span>
                    </div>
                  </div>
                </div>
                <div className="ai-role-toggle">
                  <span className="ai-toggle off"><span className="sw"></span>Skip</span>
                </div>
              </div>

              <button className="ai-btn ghost" style={{ alignSelf: 'flex-start' }}>+ Add a custom internship</button>
            </div>

            <div className="ai-summary">
              <div className="ai-summary-line">
                <span className="pip"><span className="dot"></span><b>2 internships</b> ready to publish</span>
                <span style={{ color: 'var(--ink-4)' }}>·</span>
                <span><b>16 weeks</b> intern-weeks &middot; <b>~1,600 TND</b> projected cost</span>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="ai-btn ghost">Save as draft</button>
                <button className="ai-btn brand big">Review &amp; publish →</button>
              </div>
            </div>
          </div>
        </main>

        <aside className="ai-rail">
          <div className="ai-rail-card">
            <h4>Why these roles</h4>
            <p><b>Visual designer</b> as the spine &mdash; one person owning continuity across all 12 weeks. Cuts handover cost, raises craft.</p>
            <p><b>UX researcher</b> as a focused 4-week add &mdash; you said audit, audits need synthesis someone else does.</p>
            <p><b>Motion</b> as a maybe &mdash; helpful but not required. You said "Craft" was your priority, so we surfaced it. Confidence is low because most brand audits ship without motion.</p>
          </div>

          <div className="ai-rail-section">
            <h5>Confidence</h5>
            <div className="conf">
              <div className="conf-row"><span className="lbl">Visual designer</span><span className="bar"><i style={{ width: '92%' }}></i></span><span className="v">92%</span></div>
              <div className="conf-row"><span className="lbl">UX researcher</span><span className="bar"><i style={{ width: '78%' }}></i></span><span className="v">78%</span></div>
              <div className="conf-row"><span className="lbl">Motion / illustration</span><span className="bar"><i style={{ width: '52%' }}></i></span><span className="v">52%</span></div>
            </div>
          </div>

          <div className="ai-rail-section source">
            <h5>Cohort &middot; not yet</h5>
            <p>Based on industry templates, not Inturn data. Once 30+ Tunisia-based brand projects ship, "Brand audit · 12w · Tunisia" cohort fills in and confidences re-anchor.</p>
          </div>

          <div className="ai-rail-section">
            <h5>What you control</h5>
            <p style={{ color: 'var(--ink-3)' }}>&middot; Toggle any role on / off<br/>
            &middot; Change count, scope, skills<br/>
            &middot; Add a custom internship<br/>
            &middot; Add notes that only show up in your inbox</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ============================================================
   App composition
   ============================================================ */
function App() {
  return (
    <DesignCanvas>
      <DCSection
        id="ai-flow"
        title="AI-assisted Project creation"
        subtitle="Sprint 6 feature. Conversation shape for: pitch → clarify → structure → phases → roles → publish. Human-in-the-loop at every step — AI drafts, company edits, never auto-publishes. Workshop direction, mid-fidelity. Designed to validate the SHAPE — visual polish lands in mocks after the flow is approved."
      >
        <DCArtboard id="pitch" label="01 · Pitch" width={1500} height={1000}>
          <AiPitch />
        </DCArtboard>
        <DCArtboard id="clarify" label="02 · Clarify · five questions" width={1500} height={1380}>
          <AiClarify />
        </DCArtboard>
        <DCArtboard id="structure" label="03 · Structure · editable draft" width={1500} height={1280}>
          <AiStructure />
        </DCArtboard>
        <DCArtboard id="phases" label="04 · Phases · timeline + deliverables" width={1500} height={1080}>
          <AiPhases />
        </DCArtboard>
        <DCArtboard id="roles" label="05 · Roles · staff the project" width={1500} height={1380}>
          <AiRoles />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
