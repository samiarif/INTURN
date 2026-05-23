// Project Hub — supervisor's roll-up screen for ONE project.
// Lands here before drilling into a single intern's workspace.
// Same chrome as Workspace · Overview (.ws shell) so the system feels
// continuous: Hub → Workspace is just deeper navigation, not new design.

/* ============================================================
   Hub TopBar — supervisor crumbs end at the project, not at an intern.
   ============================================================ */
function HubTopBar() {
  return (
    <div className="ws-topbar">
      <div className="ws-tb-brand">
        <span className="star"></span>
        <span className="name">Inturn</span>
      </div>
      <div className="ws-tb-crumbs">
        <span>Acme Studio</span>
        <span className="sep">/</span>
        <span>Projects</span>
        <span className="sep">/</span>
        <b>Brand audit &amp; system refresh</b>
        <span className="chip-mode"><span className="ws-tb-chip-mode-dot"></span>ACTIVE · WEEK 3 / 12</span>
      </div>
      <div className="ws-tb-actions">
        <div className="ws-tb-search">
          <span style={{ opacity: 0.5 }}>🔍</span>
          <span>Search…</span>
          <span className="kbd">⌘K</span>
        </div>
        <button className="ws-tb-icon" aria-label="Inbox">
          <span style={{ width: 14, height: 12, border: '1.4px solid currentColor', borderRadius: 2, position: 'relative' }}>
            <span style={{ position: 'absolute', top: -4, left: 5, width: 4, height: 4, background: 'currentColor', borderRadius: 99 }}></span>
          </span>
          <span className="badge-dot"></span>
        </button>
        <button className="ws-tb-icon" aria-label="Help">
          <span style={{ fontFamily: 'Geist Mono', fontSize: 12, fontWeight: 600 }}>?</span>
        </button>
        <span className="ws-tb-avatar company">MT</span>
      </div>
    </div>
  );
}

/* ============================================================
   Hub Sidebar — same data as supervisor workspace sidebar but the
   Brand audit project ITSELF is the active item (not a child).
   ============================================================ */
function HubSidebar() {
  return (
    <aside className="ws-side">
      <div className="ws-side-section">
        <h6>General</h6>
        <div className="ws-side-item">
          <span className="ico"></span>Dashboard
        </div>
        <div className="ws-side-item has-dot">
          Inbox<span className="count">14</span>
        </div>
        <div className="ws-side-item">
          <span className="ico"></span>Listings<span className="count">3</span>
        </div>
        <div className="ws-side-item">
          <span className="ico"></span>Team
        </div>
      </div>

      <div className="ws-side-section">
        <h6>Active projects</h6>

        <div className="ws-side-project active">
          <span className="chev"></span>
          <span className="ico-proj">BA</span>
          <span className="truncate">Brand audit &amp; system refresh</span>
          <span className="meta">3w3</span>
        </div>
        <div className="ws-side-sub in-proj live">
          <span className="dot"></span>
          <span className="truncate">Yasmine · Visual designer</span>
        </div>
        <div className="ws-side-sub in-proj last live">
          <span className="dot"></span>
          <span className="truncate">Lina · UX researcher</span>
        </div>

        <div className="ws-side-project" style={{ marginTop: 12 }}>
          <span className="chev"></span>
          <span className="ico-proj">DS</span>
          <span className="truncate">Design system rollout</span>
          <span className="meta">1w5</span>
        </div>
        <div className="ws-side-sub in-proj last live">
          <span className="dot"></span>
          <span className="truncate">Mehdi · Component library</span>
        </div>

        <div className="ws-side-project draft" style={{ marginTop: 12 }}>
          <span className="chev"></span>
          <span className="ico-proj">Q3</span>
          <span className="truncate">Q3 growth experiments</span>
          <span className="meta" style={{ background: '#FFFBEB', color: '#92400E', padding: '1px 5px', borderRadius: 3 }}>DRAFT</span>
        </div>
      </div>

      <div className="ws-side-section">
        <h6>Pipeline</h6>
        <div className="ws-side-item">
          <span className="ico"></span>Candidates<span className="count">38</span>
        </div>
        <div className="ws-side-item">
          <span className="ico"></span>Records issued<span className="count">7</span>
        </div>
      </div>

      <div className="ws-side-footer">
        <span className="ws-side-footer-avatar">MT</span>
        <div>
          <div className="ws-side-footer-name">Mehdi Triki</div>
          <div className="ws-side-footer-org">Acme Studio</div>
        </div>
      </div>
    </aside>
  );
}

/* ============================================================
   Hub header — title row + Hub-specific tabs.
   The Hub tabs are deliberately DIFFERENT from workspace tabs:
   the workspace tabs are scoped to one intern; the Hub tabs are
   scoped to the project across all interns.
   ============================================================ */
function HubHead() {
  return (
    <div className="ws-mhead">
      <div className="ws-mhead-title-row">
        <h1 className="ws-mhead-title">Brand audit &amp; system refresh</h1>
        <span className="ws-mhead-badge live">● ACTIVE</span>
        <span className="ws-mhead-badge mono" style={{ fontFamily: 'Geist Mono' }}>5 MAY — 25 JUL · 12 WK</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="ws-btn ghost tiny">Edit project</button>
          <button className="ws-btn brand tiny"><span className="plus">+</span> Add internship</button>
        </div>
      </div>
      <div className="ws-mhead-tabs">
        <span className="ws-mhead-tab active">Overview</span>
        <span className="ws-mhead-tab">Internships <span className="count">2</span></span>
        <span className="ws-mhead-tab">Activity <span className="count">7 new</span></span>
        <span className="ws-mhead-tab">Timeline</span>
        <span className="ws-mhead-tab">Documents <span className="count">5</span></span>
        <span className="ws-mhead-tab">Settings</span>
      </div>
    </div>
  );
}

/* ============================================================
   Project brief — title, goals, phase strip embedded, team cluster.
   ============================================================ */
function ProjectBrief() {
  return (
    <div className="ph-brief">
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="ph-brief-eyebrow">
          Project<span className="sep">·</span>12 weeks<span className="sep">·</span>2 internships<span className="sep">·</span>Hybrid · Tunis
        </div>
        <h2 className="ph-brief-title">Brand audit &amp; system refresh</h2>
        <p className="ph-brief-desc">
          Audit Acme's current brand across every surface, surface the gaps with stakeholders,
          then deliver a refreshed identity system as a Figma library + written guidelines.
          Two interns running in parallel — design and research — for the full 12 weeks.
        </p>

        <ul className="ph-goals">
          <li><b>Clarity of position.</b> Stakeholder-validated story of who Acme is, in one paragraph.</li>
          <li><b>System, not assets.</b> Refresh ships as a token-backed Figma library, not a deck of mocks.</li>
          <li><b>Handoff that lasts.</b> Guidelines a junior designer can apply on day one without us.</li>
        </ul>

        <div className="ph-brief-meta">
          <span><b>Mon–Wed</b> on-site, rest remote</span>
          <span className="pip"></span>
          <span><b>800 TND / mo</b> · per role</span>
          <span className="pip"></span>
          <span>Created <b>5 May</b> by Mehdi</span>
        </div>
      </div>

      <div className="ph-brief-team">
        <h6>Project team</h6>
        <div className="ph-brief-team-row">
          <span className="ws-avatar sm company">MT</span>
          <div className="meta">
            <div className="name">Mehdi Triki</div>
            <div className="role">Lead supervisor · Design</div>
          </div>
        </div>
        <div className="ph-brief-team-row">
          <span className="ws-avatar sm company">SR</span>
          <div className="meta">
            <div className="name">Salim Rezgui</div>
            <div className="role">Co-supervisor · Research</div>
          </div>
        </div>
        <div className="ph-brief-team-row">
          <span className="ws-avatar sm">YB</span>
          <span className="ws-avatar sm" style={{ marginLeft: -16, background: 'linear-gradient(135deg,#FBCFE8,#FDA4AF)', color: '#9F1239' }}>LM</span>
          <div className="meta" style={{ marginLeft: 6 }}>
            <div className="name">2 interns placed</div>
            <div className="role">0 open slots</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Phase strip — 4 phases, current one highlighted.
   ============================================================ */
function PhaseStrip() {
  return (
    <div className="ws-card">
      <div className="ws-card-head">
        <h3>Project phases</h3>
        <span className="ws-link" style={{ marginLeft: 'auto', fontFamily: 'Geist Mono', fontSize: 11, letterSpacing: '0.04em' }}>
          PHASE 1 OF 4 · ON TRACK
        </span>
      </div>
      <div className="ph-phases">
        <div className="ph-phase now">
          <span className="pip"></span>
          <div className="num">Phase 01 · Now</div>
          <div className="name">Discovery &amp; audit</div>
          <div className="wks">Wk 1 → 4</div>
        </div>
        <div className="ph-phase upcoming">
          <span className="pip"></span>
          <div className="num">Phase 02</div>
          <div className="name">Explore &amp; moodboard</div>
          <div className="wks">Wk 4 → 7</div>
        </div>
        <div className="ph-phase upcoming">
          <span className="pip"></span>
          <div className="num">Phase 03</div>
          <div className="name">System build</div>
          <div className="wks">Wk 7 → 10</div>
        </div>
        <div className="ph-phase upcoming">
          <span className="pip"></span>
          <div className="num">Phase 04</div>
          <div className="name">Handoff</div>
          <div className="wks">Wk 10 → 12</div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Project-level stat tiles — rolled up across all internships.
   ============================================================ */
function HubStats() {
  return (
    <div className="ws-stats">
      <div className="ws-stat">
        <div className="ws-stat-label">Internships</div>
        <div className="ws-stat-value"><b>2</b> <small>active</small></div>
        <div className="ws-stat-foot">Both filled · no draft</div>
      </div>
      <div className="ws-stat">
        <div className="ws-stat-label">Tasks · all interns</div>
        <div className="ws-stat-value"><b>11</b> <small>of 14 open</small></div>
        <div className="ws-stat-foot">3 done · 2 in review</div>
      </div>
      <div className="ws-stat">
        <div className="ws-stat-label">Deliverables submitted</div>
        <div className="ws-stat-value"><b>2</b> <small>of 9</small></div>
        <div className="ws-stat-foot good">1 needs review · 1 approved</div>
      </div>
      <div className="ws-stat">
        <div className="ws-stat-label">Days remaining</div>
        <div className="ws-stat-value"><b>63</b> <small>days</small></div>
        <div className="ws-stat-foot">Ends Friday, 25 Jul</div>
      </div>
    </div>
  );
}

/* ============================================================
   Internships card — the roster. One row per role; each row opens
   that intern's workspace.
   ============================================================ */
function InternshipList() {
  const rows = [
    {
      key: 'vd', code: 'VD',
      role: 'Visual designer · Brand audit',
      meta: 'INT-001 · 1 slot · filled',
      person: { initials: 'YB', name: 'Yasmine Ben Salah', sub: 'ENIT · L3', color: 'default' },
      tasks: '3 / 6',
      deliverables: '1 / 5',
      progressNote: '1 in review',
    },
    {
      key: 'uxr', code: 'UR',
      role: 'UX researcher · Brand audit',
      meta: 'INT-002 · 1 slot · filled',
      person: { initials: 'LM', name: 'Lina Mbarki', sub: 'IHEC · M1', color: 'pink' },
      tasks: '2 / 5',
      deliverables: '1 / 4',
      progressNote: 'On track',
    },
  ];

  return (
    <div className="ws-card">
      <div className="ws-card-head">
        <h3>Internships under this project</h3>
        <a className="ws-link">Compare workspaces →</a>
      </div>

      <div className="ph-intern-list">
        {rows.map(r => (
          <div className="ph-intern" key={r.key}>
            <div className="ph-intern-icon">{r.code}</div>
            <div className="ph-intern-role">
              <div className="role-name">{r.role}</div>
              <div className="role-meta">{r.meta}</div>
            </div>
            <div className="ph-intern-person">
              <span
                className={`ws-avatar sm ${r.person.color === 'pink' ? '' : ''}`}
                style={r.person.color === 'pink'
                  ? { background: 'linear-gradient(135deg,#FBCFE8,#FDA4AF)', color: '#9F1239' }
                  : undefined}
              >{r.person.initials}</span>
              <div className="who">
                <div className="pn">{r.person.name}</div>
                <div className="pm">{r.person.sub}</div>
              </div>
            </div>
            <div className="ph-intern-prog">
              <div className="col">
                <span className="label">Tasks</span>
                <span className="value">{r.tasks}</span>
              </div>
              <div className="col">
                <span className="label">Deliv.</span>
                <span className="value">{r.deliverables}</span>
              </div>
              <div className="col">
                <span className="label">Status</span>
                <span className="value"><small>{r.progressNote}</small></span>
              </div>
            </div>
            <a className="ph-intern-open">Open workspace <span className="arrow"></span></a>
          </div>
        ))}

        {/* Empty-slot example — kept commented for now, all slots filled.
            Pattern stays here so designers see what an open role looks like. */}
        {/* <div className="ph-intern empty">
          <div className="ph-intern-icon">+</div>
          <div className="ph-intern-role">
            <div className="role-name">Open slot · post a role</div>
            <div className="role-meta">No internship posted yet</div>
          </div>
          <div className="ph-intern-person"><span className="ws-avatar sm" style={{ background: 'transparent', border: '1px dashed var(--border)' }}>?</span><div className="who"><div className="pn">Awaiting candidate</div></div></div>
          <div></div>
          <a className="ph-intern-open">Post listing <span className="arrow"></span></a>
        </div> */}
      </div>

      <button className="ph-add-intern">
        <span className="plus">+</span>
        Add another internship under this project
      </button>
    </div>
  );
}

/* ============================================================
   Cross-workspace activity feed — same event types as the workspace
   activity, with a workspace-source chip on each event so the
   supervisor knows which intern is involved.
   ============================================================ */
function HubActivity() {
  return (
    <div className="ws-card">
      <div className="ws-card-head">
        <h3>Activity · all workspaces</h3>
        <div className="ph-feed-filter">
          <span className="chip active">ALL</span>
          <span className="chip">YASMINE</span>
          <span className="chip">LINA</span>
        </div>
      </div>
      <div className="ws-activity">
        <div className="ws-act">
          <span className="ws-act-bullet deliv"><i></i></span>
          <span className="ws-act-text">
            <b>Yasmine</b> submitted <b>Brand audit · v2</b> from <span className="ws-source">Visual designer</span> with note &ldquo;Cleaned up stakeholder quotes, fixed numbering&rdquo;
          </span>
          <span className="ws-act-time">2h ago</span>
        </div>
        <div className="ws-act">
          <span className="ws-act-bullet comment"><i></i></span>
          <span className="ws-act-text">
            <b>Mehdi</b> commented on <b>Type pairings</b> in <span className="ws-source">Visual designer</span> &mdash; &ldquo;Try a pair without the contrast serif&rdquo;
          </span>
          <span className="ws-act-time">5h ago</span>
        </div>
        <div className="ws-act">
          <span className="ws-act-bullet deliv"><i></i></span>
          <span className="ws-act-text">
            <b>Lina</b> submitted <b>Interview synthesis · v1</b> from <span className="ws-source">UX researcher</span>
          </span>
          <span className="ws-act-time">Yesterday</span>
        </div>
        <div className="ws-act">
          <span className="ws-act-bullet task"><i></i></span>
          <span className="ws-act-text">
            <b>Yasmine</b> moved <span className="tag">BA-005</span> Visual exploration to <b>In progress</b>
          </span>
          <span className="ws-act-time">Yesterday</span>
        </div>
        <div className="ws-act">
          <span className="ws-act-bullet task"><i></i></span>
          <span className="ws-act-text">
            <b>Lina</b> uploaded <b>6 interview transcripts</b> to <span className="ws-source">UX researcher</span> · deliverables
          </span>
          <span className="ws-act-time">2d ago</span>
        </div>
        <div className="ws-act">
          <span className="ws-act-bullet system"><i></i></span>
          <span className="ws-act-text">
            Weekly check-in <b>scheduled</b> for Friday at 14:00 · both workspaces · Jitsi link generated
          </span>
          <span className="ws-act-time">3d ago</span>
        </div>
        <div className="ws-act">
          <span className="ws-act-bullet deliv"><i></i></span>
          <span className="ws-act-text">
            <b>Mehdi</b> requested changes on <b>Brand audit · v1</b> in <span className="ws-source">Visual designer</span> &mdash; &ldquo;Findings section needs a TL;DR&rdquo;
          </span>
          <span className="ws-act-time">3d ago</span>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Right rail — project-level signals, team, schedule, draft flag.
   ============================================================ */
function HubRail() {
  return (
    <>
      <div className="ws-perf">
        <div className="ws-perf-head">
          <h4>Project signal</h4>
          <span className="ws-perf-tag">DATA · LIVE</span>
        </div>
        <div className="ws-perf-metric">
          <b>92<span style={{ fontSize: 16, marginLeft: 2 }}>%</span></b>
          <span className="delta">on-pace, both roles</span>
        </div>
        <div className="ws-perf-bench">Phase 1 ships in <b>5 days</b>. No interventions needed across either workspace.</div>
        <svg className="ws-perf-spark" viewBox="0 0 280 36" preserveAspectRatio="none">
          <defs>
            <linearGradient id="sparkGradHub" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#06B6D4" stopOpacity="0.35"/>
              <stop offset="1" stopColor="#06B6D4" stopOpacity="0"/>
            </linearGradient>
          </defs>
          <path d="M 0,30 L 30,26 L 60,22 L 90,24 L 120,18 L 150,20 L 180,14 L 210,16 L 240,10 L 270,8 L 280,10 L 280,36 L 0,36 Z" fill="url(#sparkGradHub)"/>
          <path d="M 0,30 L 30,26 L 60,22 L 90,24 L 120,18 L 150,20 L 180,14 L 210,16 L 240,10 L 270,8 L 280,10" fill="none" stroke="#06B6D4" strokeWidth="1.5"/>
          <circle cx="270" cy="8" r="3" fill="#06B6D4"/>
        </svg>
      </div>

      <div className="ws-rail-cta">
        <h4>Project sync</h4>
        <p>Run a joint check-in with both interns. Inturn schedules and posts the same Jitsi link to each workspace.</p>
        <button className="ws-btn-w">Schedule project sync →</button>
      </div>

      <div className="ws-card ph-team-card">
        <h4>Supervisors &amp; team</h4>
        <div className="ph-team-list">
          <div className="ph-team-member">
            <span className="ws-avatar sm company">MT</span>
            <div>
              <div className="nm">Mehdi Triki</div>
              <div className="rl">Lead supervisor · Design</div>
            </div>
            <span className="ld">LEAD</span>
          </div>
          <div className="ph-team-member">
            <span className="ws-avatar sm company">SR</span>
            <div>
              <div className="nm">Salim Rezgui</div>
              <div className="rl">Co-supervisor · Research</div>
            </div>
          </div>
          <div className="ph-team-member">
            <span className="ws-avatar sm">YB</span>
            <div>
              <div className="nm">Yasmine Ben Salah</div>
              <div className="rl">Intern · Visual designer</div>
            </div>
          </div>
          <div className="ph-team-member">
            <span className="ws-avatar sm" style={{ background: 'linear-gradient(135deg,#FBCFE8,#FDA4AF)', color: '#9F1239' }}>LM</span>
            <div>
              <div className="nm">Lina Mbarki</div>
              <div className="rl">Intern · UX researcher</div>
            </div>
          </div>
        </div>
      </div>

      <div className="ws-rail-quick">
        <h4>This week · 30 May</h4>
        <ul>
          <li className="urgent"><span className="dot"></span>Review audit v2 (Yasmine · 2h ago)</li>
          <li className="next"><span className="dot"></span>Review interview synthesis (Lina · 1d ago)</li>
          <li><span className="dot"></span>Joint sync · Fri 14:00 — Jitsi</li>
          <li><span className="dot"></span>Phase 1 wrap-up note in <code style={{ fontFamily: 'Geist Mono', fontSize: 11, background: 'var(--surface-muted)', padding: '0 4px', borderRadius: 3 }}>Documents</code></li>
        </ul>
      </div>
    </>
  );
}

/* ============================================================
   The whole Hub composed.
   ============================================================ */
function ProjectHub() {
  return (
    <div className="ws" data-screen-label="Project Hub · Brand audit">
      <HubTopBar />
      <div className="ws-body">
        <HubSidebar />
        <main className="ws-main">
          <HubHead />
          <div className="ws-content">
            <div className="ws-col-main">
              <ProjectBrief />
              <PhaseStrip />
              <HubStats />
              <InternshipList />
              <HubActivity />
            </div>
            <div className="ws-col-side">
              <HubRail />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// Expose for the workspace.jsx App() composition (separate babel script scope).
window.ProjectHub = ProjectHub;
