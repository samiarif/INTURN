// Workspace Overview — full-fidelity mock, Workshop direction.
// Role-aware: same data, different framing for intern vs supervisor.

/* ============================================================
   TopBar
   ============================================================ */
function TopBar({ role, tab = 'Overview' }) {
  const isIntern = role === 'intern';
  const viewer = isIntern
    ? { initials: 'YB', name: 'Yasmine Ben Salah' }
    : { initials: 'MT', name: 'Mehdi Triki' };

  return (
    <div className="ws-topbar">
      <div className="ws-tb-brand">
        <span className="star"></span>
        <span className="name">Inturn</span>
      </div>
      <div className="ws-tb-crumbs">
        {isIntern ? (
          <>
            <span>My workspaces</span>
            <span className="sep">/</span>
            <span>Acme Studio · Brand audit</span>
            <span className="sep">/</span>
            <b>{tab}</b>
          </>
        ) : (
          <>
            <span>Acme Studio</span>
            <span className="sep">/</span>
            <span>Brand audit</span>
            <span className="sep">/</span>
            <span>Yasmine</span>
            <span className="sep">/</span>
            <b>{tab}</b>
          </>
        )}
        <span className="chip-mode"><span className="ws-tb-chip-mode-dot"></span>HYBRID · WEEK 3 / 12</span>
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
        <span className={`ws-tb-avatar ${isIntern ? '' : 'company'}`}>{viewer.initials}</span>
      </div>
    </div>
  );
}

/* ============================================================
   Sidebar
   ============================================================ */
function Sidebar({ role }) {
  const isIntern = role === 'intern';
  return (
    <aside className="ws-side">
      <div className="ws-side-section">
        <h6>General</h6>
        <div className="ws-side-item">
          <span className="ico"></span>Dashboard
        </div>
        {isIntern ? (
          <>
            <div className="ws-side-item">
              <span className="ico"></span>Applications
              <span className="count">2</span>
            </div>
            <div className="ws-side-item">
              <span className="ico"></span>Saved
            </div>
            <div className="ws-side-item">
              <span className="ico"></span>Marketplace
            </div>
          </>
        ) : (
          <>
            <div className="ws-side-item has-dot">
              Inbox
              <span className="count">14</span>
            </div>
            <div className="ws-side-item">
              <span className="ico"></span>Listings
              <span className="count">3</span>
            </div>
            <div className="ws-side-item">
              <span className="ico"></span>Team
            </div>
          </>
        )}
      </div>

      <div className="ws-side-section">
        <h6>{isIntern ? 'My workspaces' : 'Active projects'}</h6>
        {isIntern ? (
          <>
            <div className="ws-side-sub active live">
              <span className="dot"></span>
              <span className="truncate">Acme · Brand audit</span>
            </div>
            <div className="ws-side-sub done">
              <span className="dot"></span>
              <span className="truncate">Numentech · UX research</span>
            </div>
          </>
        ) : (
          <>
            <div className="ws-side-project">
              <span className="chev"></span>
              <span className="ico-proj">BA</span>
              <span className="truncate">Brand audit &amp; system refresh</span>
              <span className="meta">3w3</span>
            </div>
            <a className="ws-side-projhub">→ Project hub</a>
            <div className="ws-side-sub in-proj active live">
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
          </>
        )}
      </div>

      <div className="ws-side-section">
        <h6>{isIntern ? 'Community' : 'Pipeline'}</h6>
        {isIntern ? (
          <>
            <div className="ws-side-item">
              <span className="ico"></span>Feed
            </div>
            <div className="ws-side-item">
              <span className="ico"></span>My record
            </div>
          </>
        ) : (
          <>
            <div className="ws-side-item">
              <span className="ico"></span>Candidates
              <span className="count">38</span>
            </div>
            <div className="ws-side-item">
              <span className="ico"></span>Records issued
              <span className="count">7</span>
            </div>
          </>
        )}
      </div>

      <div className="ws-side-footer">
        <span className="ws-side-footer-avatar">{isIntern ? 'YB' : 'MT'}</span>
        <div>
          <div className="ws-side-footer-name">{isIntern ? 'Yasmine Ben Salah' : 'Mehdi Triki'}</div>
          <div className="ws-side-footer-org">{isIntern ? 'ENIT · L3' : 'Acme Studio'}</div>
        </div>
      </div>
    </aside>
  );
}

/* ============================================================
   MHead — title + tabs
   ============================================================ */
function MHead({ role }) {
  const isIntern = role === 'intern';
  return (
    <div className="ws-mhead">
      <div className="ws-mhead-title-row">
        <h1 className="ws-mhead-title">
          {isIntern ? 'Welcome back, Yasmine' : 'Yasmine Ben Salah · Visual designer'}
        </h1>
        <span className="ws-mhead-badge live">● ACTIVE</span>
        <span className="ws-mhead-badge mono" style={{ fontFamily: 'Geist Mono' }}>5 MAY — 25 JUL</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {isIntern ? (
            <>
              <button className="ws-btn ghost tiny">Weekly check-in →</button>
              <button className="ws-btn brand tiny"><span className="plus">+</span> Add note</button>
            </>
          ) : (
            <>
              <button className="ws-btn ghost tiny">Schedule check-in</button>
              <button className="ws-btn brand tiny"><span className="plus">+</span> Assign task</button>
            </>
          )}
        </div>
      </div>
      <div className="ws-mhead-tabs">
        <span className="ws-mhead-tab active">Overview</span>
        <span className="ws-mhead-tab">Tasks <span className="count">6</span></span>
        <span className="ws-mhead-tab">Deliverables <span className="count">5</span></span>
        <span className="ws-mhead-tab">Timeline</span>
        <span className="ws-mhead-tab">Activity {role === 'supervisor' && <span className="count">3 new</span>}</span>
        <span className="ws-mhead-tab">Comments {role === 'supervisor' && <span className="count">1</span>}</span>
      </div>
    </div>
  );
}

/* ============================================================
   Cards
   ============================================================ */

function BriefCard({ role }) {
  const isIntern = role === 'intern';
  return (
    <div className="ws-brief">
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="ws-brief-eyebrow">Internship · 12 weeks · Hybrid</div>
        <h2 className="ws-brief-title">Brand audit &amp; system refresh</h2>
        <div style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5, maxWidth: '52ch', marginBottom: 10 }}>
          A full-funnel audit of Acme's brand and a refreshed system delivered as Figma library + guidelines. 5 deliverables, 12 weeks, mostly async with one weekly check-in.
        </div>
        <div className="ws-brief-meta">
          <span><b>Tunis</b> · 3d/wk on-site</span>
          <span className="dot"></span>
          <span><b>Mon–Wed</b> on-site, rest remote</span>
          <span className="dot"></span>
          <span>Paid · <b>800 TND / mo</b></span>
        </div>
      </div>
      <div className="ws-brief-people">
        {isIntern ? (
          <>
            <div className="ws-brief-person">
              <div className="role">Supervisor</div>
              <div className="name">Mehdi Triki</div>
              <div className="org">Acme Studio · Design Lead</div>
            </div>
            <span className="ws-avatar lg company">MT</span>
          </>
        ) : (
          <>
            <div className="ws-brief-person">
              <div className="role">Intern</div>
              <div className="name">Yasmine Ben Salah</div>
              <div className="org">ENIT · L3 · CS</div>
            </div>
            <span className="ws-avatar lg">YB</span>
          </>
        )}
      </div>
    </div>
  );
}

function StatTiles({ role }) {
  const isIntern = role === 'intern';
  return (
    <div className="ws-stats">
      <div className="ws-stat">
        <div className="ws-stat-label">Tasks</div>
        <div className="ws-stat-value"><b>3</b> <small>of 6 open</small></div>
        <div className="ws-stat-foot">2 done · 1 in review</div>
      </div>
      <div className="ws-stat">
        <div className="ws-stat-label">Deliverables</div>
        <div className="ws-stat-value"><b>1</b> <small>of 5 submitted</small></div>
        <div className={isIntern ? 'ws-stat-foot good' : 'ws-stat-foot good'}>
          {isIntern ? '✓ Brand audit · v2 sent' : '✓ Brand audit · 1 pending review'}
        </div>
      </div>
      <div className="ws-stat">
        <div className="ws-stat-label">Days remaining</div>
        <div className="ws-stat-value"><b>63</b> <small>days</small></div>
        <div className="ws-stat-foot">Ends Friday, 25 Jul</div>
      </div>
      <div className="ws-stat">
        <div className="ws-stat-label">{isIntern ? 'Hours this week' : 'Activity score'}</div>
        <div className="ws-stat-value"><b>{isIntern ? '18.5' : '92'}</b> <small>{isIntern ? 'hrs' : '/ 100'}</small></div>
        <div className="ws-stat-foot good">
          <span className="arrow-up">↗</span> {isIntern ? '+2.5 vs last wk' : 'Above the floor of 70'}
        </div>
      </div>
    </div>
  );
}

function TaskList({ role }) {
  const isIntern = role === 'intern';
  const tasks = [
    { name: 'Stakeholder interviews · 6 of 6', tag: 'BA-002', status: 'done', due: 'Done · Mon' },
    { name: 'Audit slide deck · v2', tag: 'BA-003', status: 'review', due: 'In review' },
    { name: 'Visual exploration · moodboards', tag: 'BA-005', status: 'prog', due: 'Due Fri', urgent: true },
    { name: 'Type pairings — 3 options', tag: 'BA-006', status: 'prog', due: 'Due Fri', urgent: true },
    { name: 'Logo refresh — round 1', tag: 'BA-007', status: 'todo', due: 'Next week' },
    { name: 'Kickoff brief sign-off', tag: 'BA-001', status: 'done', due: 'Done · 2wk ago' },
  ];
  return (
    <div className="ws-card">
      <div className="ws-card-head">
        <h3>{isIntern ? "This week's tasks" : "Yasmine's tasks · this week"}</h3>
        <a className="ws-link">See all 6 →</a>
      </div>
      <div className="ws-tasks">
        {tasks.map((t, i) => (
          <div key={i} className={`ws-task ${t.status === 'done' ? 'done' : ''} ${t.status === 'review' ? 'review' : ''}`}>
            <span className="check"></span>
            <span className="ws-task-name">{t.name}</span>
            <span className="ws-task-tag">{t.tag}</span>
            <span className={`pill ${t.status === 'done' ? 'pill-done' : t.status === 'review' ? 'pill-review' : t.status === 'prog' ? 'pill-prog' : 'pill-todo'}`}>
              <span className="dot"></span>
              {t.status === 'done' ? 'Done' : t.status === 'review' ? 'In review' : t.status === 'prog' ? 'In progress' : 'To do'}
            </span>
            <span className={`ws-task-due ${t.urgent ? 'urgent' : ''}`}>{t.due}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DeliverablesMini({ role }) {
  const isIntern = role === 'intern';
  const items = [
    { name: 'Brand audit · stakeholder findings', ver: 'v2', meta: isIntern ? 'Submitted · waiting on Mehdi' : 'Yasmine submitted v2 · 1d ago', state: 'review' },
    { name: 'Visual exploration · moodboards', ver: '—',  meta: 'Due Fri 30 May',  state: 'todo' },
    { name: 'Logo refresh — round 1',          ver: '—',  meta: 'Due 6 Jun',        state: 'todo' },
    { name: 'Design system library',           ver: '—',  meta: 'Due 27 Jun',       state: 'todo' },
    { name: 'Final handoff package',           ver: '—',  meta: 'Due 22 Jul',       state: 'todo' },
  ];
  return (
    <div className="ws-card">
      <div className="ws-card-head">
        <h3>Deliverables</h3>
        <a className="ws-link">All versions →</a>
      </div>
      <div className="ws-deliv-list">
        {items.map((d, i) => (
          <div className="ws-deliv" key={i}>
            <div>
              <div className="ws-deliv-name">{d.name}</div>
              <div className="ws-deliv-meta">{d.meta}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className={`pill ${d.state === 'review' ? 'pill-review' : 'pill-todo'}`}>
                <span className="dot"></span>
                {d.state === 'review' ? 'In review' : 'Upcoming'}
              </span>
              <span className="ws-deliv-ver">{d.ver}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityFeed({ role }) {
  return (
    <div className="ws-card">
      <div className="ws-card-head">
        <h3>Recent activity</h3>
        <a className="ws-link">Full timeline →</a>
      </div>
      <div className="ws-activity">
        <div className="ws-act">
          <span className="ws-act-bullet deliv"><i></i></span>
          <span className="ws-act-text">
            <b>Yasmine</b> submitted <b>Brand audit · v2</b> with note &ldquo;Cleaned up stakeholder quotes, fixed numbering&rdquo;
          </span>
          <span className="ws-act-time">2h ago</span>
        </div>
        <div className="ws-act">
          <span className="ws-act-bullet comment"><i></i></span>
          <span className="ws-act-text">
            <b>Mehdi</b> commented on <b>Type pairings</b> &mdash; &ldquo;Try a pair without the contrast serif&rdquo;
          </span>
          <span className="ws-act-time">5h ago</span>
        </div>
        <div className="ws-act">
          <span className="ws-act-bullet task"><i></i></span>
          <span className="ws-act-text">
            <b>Yasmine</b> moved <span className="tag">BA-005</span> Visual exploration to <b>In progress</b>
          </span>
          <span className="ws-act-time">Yesterday</span>
        </div>
        <div className="ws-act">
          <span className="ws-act-bullet system"><i></i></span>
          <span className="ws-act-text">
            Weekly check-in <b>scheduled</b> for Friday at 14:00 · Jitsi link generated
          </span>
          <span className="ws-act-time">Yesterday</span>
        </div>
        <div className="ws-act">
          <span className="ws-act-bullet deliv"><i></i></span>
          <span className="ws-act-text">
            <b>Mehdi</b> requested changes on <b>Brand audit · v1</b> &mdash; &ldquo;Findings section needs a TL;DR&rdquo;
          </span>
          <span className="ws-act-time">3d ago</span>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Right rail
   ============================================================ */

function RailIntern() {
  return (
    <>
      <div className="ws-rail-cta">
        <h4>Weekly check-in</h4>
        <p>Due Friday. Inturn drafts it from your activity — you edit and send to Mehdi.</p>
        <button className="ws-btn-w">Draft check-in →</button>
      </div>

      <div className="ws-rail-quick">
        <h4>This week · 30 May</h4>
        <ul>
          <li className="done"><span className="dot"></span>Submit audit v2</li>
          <li className="next"><span className="dot"></span>Ship moodboards (Fri)</li>
          <li className="urgent"><span className="dot"></span>Reply to Mehdi on type pairings</li>
          <li><span className="dot"></span>Pre-fill weekly check-in</li>
          <li><span className="dot"></span>Sync 14:00 Fri — Jitsi</li>
        </ul>
      </div>

      <div className="ws-rail-quick">
        <h4>Your record · so far</h4>
        <ul>
          <li><span className="dot" style={{ background: 'var(--success)' }}></span>2 of 5 deliverables · on time</li>
          <li><span className="dot" style={{ background: 'var(--brand)' }}></span>32 events logged this internship</li>
          <li><span className="dot" style={{ background: 'var(--ink-4)' }}></span>End-of-internship record · 25 Jul</li>
        </ul>
      </div>
    </>
  );
}

function RailSupervisor() {
  return (
    <>
      <div className="ws-perf">
        <div className="ws-perf-head">
          <h4>Performance signal</h4>
          <span className="ws-perf-tag">DATA · LIVE</span>
        </div>
        <div className="ws-perf-metric">
          <b>100<span style={{ fontSize: 16, marginLeft: 2 }}>%</span></b>
          <span className="delta">on-time delivery</span>
        </div>
        <div className="ws-perf-bench">Better than <b>78%</b> of interns at this stage. Across 5 weeks.</div>
        <svg className="ws-perf-spark" viewBox="0 0 280 36" preserveAspectRatio="none">
          <defs>
            <linearGradient id="sparkGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#06B6D4" stopOpacity="0.35"/>
              <stop offset="1" stopColor="#06B6D4" stopOpacity="0"/>
            </linearGradient>
          </defs>
          <path d="M 0,28 L 30,24 L 60,20 L 90,22 L 120,16 L 150,18 L 180,12 L 210,14 L 240,8 L 270,6 L 280,8 L 280,36 L 0,36 Z" fill="url(#sparkGrad)"/>
          <path d="M 0,28 L 30,24 L 60,20 L 90,22 L 120,16 L 150,18 L 180,12 L 210,14 L 240,8 L 270,6 L 280,8" fill="none" stroke="#06B6D4" strokeWidth="1.5"/>
          <circle cx="270" cy="6" r="3" fill="#06B6D4"/>
        </svg>
      </div>

      <div className="ws-rail-cta">
        <h4>Need a sync?</h4>
        <p>Schedule a check-in. Inturn generates the Jitsi link and adds it to the timeline.</p>
        <button className="ws-btn-w">Schedule check-in →</button>
      </div>

      <div className="ws-rail-quick">
        <h4>This week · 30 May</h4>
        <ul>
          <li className="urgent"><span className="dot"></span>Review audit v2 (Yasmine submitted 2h ago)</li>
          <li className="next"><span className="dot"></span>Annotate type pairings reply</li>
          <li><span className="dot"></span>Sync 14:00 Fri — Jitsi</li>
          <li><span className="dot"></span>Mid-internship review (week 6)</li>
        </ul>
      </div>

      <div className="ws-note">
        <b>Quiet flag · informational</b><br/>
        No comments from Yasmine in 26h. Below your average. <a className="ws-link" style={{ color: '#92400E', textDecoration: 'underline' }}>Send a nudge</a>
      </div>
    </>
  );
}

/* ============================================================
   The whole workspace
   ============================================================ */
function Workspace({ role }) {
  const isIntern = role === 'intern';
  return (
    <div className="ws">
      <TopBar role={role} />
      <div className="ws-body">
        <Sidebar role={role} />
        <main className="ws-main">
          <MHead role={role} />
          <div className="ws-content">
            <div className="ws-col-main">
              <BriefCard role={role} />
              <StatTiles role={role} />
              <TaskList role={role} />
              <DeliverablesMini role={role} />
              <ActivityFeed role={role} />
            </div>
            <div className="ws-col-side">
              {isIntern ? <RailIntern /> : <RailSupervisor />}
            </div>
          </div>
        </main>
      </div>
      {isIntern && (
        <div className="ws-stuck">
          <span className="pulse"></span>
          <span>I'm stuck</span>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   App composition
   ============================================================ */
function App() {
  // ProjectHub + TasksBoard live in separate babel scripts and attach
  // themselves to window because each <script type="text/babel"> gets
  // its own scope. TopBar + Sidebar are exposed below for the same reason.
  const ProjectHub = window.ProjectHub;
  const TasksBoard = window.TasksBoard;

  return (
    <DesignCanvas>
      <DCSection
        id="project-hub"
        title="Project · Hub"
        subtitle="v0.2 — the screen the supervisor lands on before drilling into any one workspace. One project, two internships, two interns, rolled up. Same shell as the workspace overview below: top bar, sidebar, right rail, tokens. New pieces are the phase strip, the internships roster and the cross-workspace activity feed."
      >
        <DCArtboard id="hub-brand-audit" label="Supervisor · Brand audit project hub" width={1680} height={1320}>
          {ProjectHub ? <ProjectHub /> : <div style={{ padding: 24 }}>ProjectHub not loaded</div>}
        </DCArtboard>
      </DCSection>

      <DCSection
        id="workspace-overview"
        title="Workspace · Overview"
        subtitle="The anchor screen of Sprint 2. Same data, two roles. Workshop direction in full fidelity — colors, type, density, language all locked. The slate sidebar with violet active state, the cyan performance-signal moment, the gradient star tucked into the top-left and the brief card — everything here is the system Claude Code installs."
      >
        <DCArtboard id="intern" label="Intern view · Yasmine" width={1680} height={1180}>
          <Workspace role="intern" />
        </DCArtboard>
        <DCArtboard id="supervisor" label="Supervisor view · Mehdi (Acme Studio)" width={1680} height={1180}>
          <Workspace role="supervisor" />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="workspace-tasks"
        title="Workspace · Tasks"
        subtitle="Same shell, Tasks tab active. Drag between columns generates an event — that's the contract. Supervisor view adds the review banner at top and the purple needs-review treatment on BA-003. Card density was set so eight cards fit a column before scrolling kicks in; deliverable chips on cards close the loop between Tasks and Deliverables tabs."
      >
        <DCArtboard id="tasks-intern" label="Intern view · Yasmine" width={1680} height={1080}>
          {TasksBoard ? <TasksBoard role="intern" /> : <div style={{ padding: 24 }}>TasksBoard not loaded</div>}
        </DCArtboard>
        <DCArtboard id="tasks-supervisor" label="Supervisor view · Mehdi reviewing Yasmine" width={1680} height={1080}>
          {TasksBoard ? <TasksBoard role="supervisor" /> : <div style={{ padding: 24 }}>TasksBoard not loaded</div>}
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

// Expose shell pieces so tasks-board.jsx (separate babel scope) can reuse
// them when rendered. Safe to assign here because rendering happens after
// this file finishes evaluating.
window.WsTopBar = TopBar;
window.WsSidebar = Sidebar;

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
