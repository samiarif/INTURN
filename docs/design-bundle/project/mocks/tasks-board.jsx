// Workspace · Tasks board — Sprint 2.
// Same shell as Workspace · Overview; "Tasks" tab is active. Role-aware:
// intern view shows the same data with intern-side affordances; supervisor
// view adds the review banner, the "needs review" card treatment, and an
// Assign task primary action.

/* ============================================================
   Header — title row + tabs (Tasks active).
   We re-declare it here (instead of generalizing MHead in workspace.jsx)
   because the Tasks tab needs role-specific count badges and a couple
   of supervisor-only highlights.
   ============================================================ */
function TasksHead({ role }) {
  const isIntern = role === 'intern';
  return (
    <div className="ws-mhead">
      <div className="ws-mhead-title-row">
        <h1 className="ws-mhead-title">
          {isIntern ? 'Tasks · Brand audit' : 'Yasmine Ben Salah · Tasks'}
        </h1>
        <span className="ws-mhead-badge live">● ACTIVE</span>
        <span className="ws-mhead-badge mono" style={{ fontFamily: 'Geist Mono' }}>WEEK 3 / 12</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {isIntern ? (
            <>
              <button className="ws-btn ghost tiny">Suggest task</button>
              <button className="ws-btn brand tiny"><span className="plus">+</span> Add subtask</button>
            </>
          ) : (
            <>
              <button className="ws-btn ghost tiny">Templates</button>
              <button className="ws-btn brand tiny"><span className="plus">+</span> Assign task</button>
            </>
          )}
        </div>
      </div>
      <div className="ws-mhead-tabs">
        <span className="ws-mhead-tab">Overview</span>
        <span className="ws-mhead-tab active">Tasks <span className="count">6</span></span>
        <span className="ws-mhead-tab">
          Deliverables <span className="count">5</span>
        </span>
        <span className="ws-mhead-tab">Timeline</span>
        <span className="ws-mhead-tab">
          Activity {!isIntern && <span className="count">3 new</span>}
        </span>
        <span className="ws-mhead-tab">
          Comments {!isIntern && <span className="count review">1</span>}
        </span>
      </div>
    </div>
  );
}

/* ============================================================
   Toolbar — view toggle + filter chips + sort.
   ============================================================ */
function TasksToolbar({ role }) {
  return (
    <div className="tb-toolbar">
      <div className="tb-view">
        <button className="active">Board</button>
        <button>List</button>
        <button>Calendar</button>
      </div>

      <div className="tb-chip active">
        All <span className="num">6</span>
      </div>
      <div className="tb-chip">
        {role === 'supervisor' ? 'Assigned to Yasmine' : 'Mine'} <span className="num">6</span>
      </div>
      <div className="tb-chip">
        Phase
        <span className="caret"></span>
      </div>
      <div className="tb-chip">
        Deliverable
        <span className="caret"></span>
      </div>
      <div className="tb-chip">
        Due this week <span className="num">2</span>
      </div>

      <div className="tb-spacer"></div>

      <div className="tb-chip">
        Sort: Due date
        <span className="caret"></span>
      </div>
      <div className="tb-chip">
        Group: Status
        <span className="caret"></span>
      </div>
    </div>
  );
}

/* ============================================================
   One task card.
   ============================================================ */
function TaskCard({ t, role }) {
  const showNeedsReview = role === 'supervisor' && t.needsReview;
  const classes = [
    'tb-card',
    t.urgent && 'urgent',
    t.overdue && 'overdue',
    showNeedsReview && 'needs-review',
    t.done && 'done',
  ].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      <div className="tb-card-top">
        <span className="tb-card-tag">{t.tag}</span>
        {t.label && (
          <span className={`tb-card-label ${t.label.kind}`}>{t.label.text}</span>
        )}
        <button className="tb-card-menu" aria-label="More">⋯</button>
      </div>

      <div className="tb-card-title">{t.title}</div>
      {t.sub && <div className="tb-card-sub">{t.sub}</div>}

      {t.deliv && (
        <a className="tb-card-deliv">
          <span className="ico"></span>
          <span>Linked: <b>{t.deliv}</b></span>
        </a>
      )}

      <div className="tb-card-foot">
        <span className={`tb-card-due ${t.urgent ? 'urgent' : ''} ${t.overdue ? 'overdue' : ''} ${t.done ? 'good' : ''}`}>
          {t.done
            ? <span className="ico-check" style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 99, background: 'var(--success)', position: 'relative' }}></span>
            : <span className="cal"></span>
          }
          <span>{t.due}</span>
        </span>

        <div className="tb-meta-chips">
          {t.comments > 0 && (
            <span className={`tb-meta-chip ${t.unread ? 'unread' : ''}`}>
              <span className="ico-comment"></span>
              <span>{t.comments}</span>
            </span>
          )}
          {t.attachments > 0 && (
            <span className="tb-meta-chip">
              <span className="ico-attach"></span>
              <span>{t.attachments}</span>
            </span>
          )}
        </div>

        <span
          className={`ws-avatar xs who ${t.assignee.color === 'company' ? 'company' : ''}`}
          style={t.assignee.color === 'pink'
            ? { background: 'linear-gradient(135deg,#FBCFE8,#FDA4AF)', color: '#9F1239' }
            : undefined}
          title={t.assignee.name}
        >{t.assignee.initials}</span>
      </div>
    </div>
  );
}

/* ============================================================
   Data for the board. Same six tasks as the Overview list.
   ============================================================ */
function getColumns() {
  const YB = { initials: 'YB', name: 'Yasmine Ben Salah', color: 'default' };

  return [
    {
      key: 'todo', cls: 'todo', name: 'To do',
      tasks: [
        {
          tag: 'BA-007',
          title: 'Logo refresh — round 1',
          sub: "Wait for Phase 2 moodboard sign-off, then 3 lockup directions.",
          label: { kind: 'design', text: 'Design' },
          due: 'Due 6 Jun',
          comments: 0, attachments: 0,
          deliv: 'D3 · Logo system',
          assignee: YB,
        },
      ],
    },
    {
      key: 'prog', cls: 'prog', name: 'In progress',
      tasks: [
        {
          tag: 'BA-005',
          title: 'Visual exploration · moodboards',
          label: { kind: 'design', text: 'Design' },
          urgent: true,
          due: 'Due Fri · in 3d',
          comments: 3, attachments: 2,
          deliv: 'D2 · Visual exploration',
          assignee: YB,
        },
        {
          tag: 'BA-006',
          title: 'Type pairings — 3 options',
          sub: '"Try a pair without the contrast serif." — Mehdi',
          label: { kind: 'design', text: 'Design' },
          urgent: true,
          due: 'Due Fri · in 3d',
          comments: 1, attachments: 0, unread: true,
          assignee: YB,
        },
      ],
    },
    {
      key: 'review', cls: 'review', name: 'In review',
      tasks: [
        {
          tag: 'BA-003',
          title: 'Audit slide deck · v2',
          sub: 'Submitted 2h ago · "Cleaned up stakeholder quotes, fixed numbering"',
          label: { kind: 'deliverable', text: 'v2' },
          due: 'Awaiting Mehdi',
          comments: 4, attachments: 1,
          deliv: 'D1 · Brand audit',
          needsReview: true,
          assignee: YB,
        },
      ],
    },
    {
      key: 'done', cls: 'done', name: 'Done',
      tasks: [
        {
          tag: 'BA-002',
          title: 'Stakeholder interviews · 6 of 6',
          due: 'Closed Mon',
          comments: 2, attachments: 6,
          deliv: 'D1 · Brand audit',
          done: true,
          assignee: YB,
        },
        {
          tag: 'BA-001',
          title: 'Kickoff brief sign-off',
          due: 'Closed 2 wk ago',
          comments: 1, attachments: 1,
          done: true,
          assignee: YB,
        },
      ],
      collapsed: 0, // no hidden done tasks; row stays clean
    },
  ];
}

/* ============================================================
   One column rendered with its head + cards + footer add.
   ============================================================ */
function TaskColumn({ col, role }) {
  return (
    <div className={`tb-col ${col.cls}`}>
      <div className="tb-col-head">
        <span className="pip"></span>
        <span className="name">{col.name}</span>
        <span className="count">{col.tasks.length}</span>
        <button className="menu" aria-label="Column menu">⋯</button>
      </div>

      <div className="tb-col-list">
        {col.tasks.map((t, i) => <TaskCard key={i} t={t} role={role} />)}
        {col.tasks.length === 0 && (
          <div className="tb-card-ghost">Drop here to move</div>
        )}
      </div>

      {role === 'supervisor' && (
        <button className="tb-col-add">
          <span className="plus">+</span>
          <span>Add task</span>
        </button>
      )}
    </div>
  );
}

/* ============================================================
   Tasks board — the whole page.
   Re-uses the workspace TopBar + Sidebar from workspace.jsx via window.
   ============================================================ */
function TasksBoard({ role }) {
  const TopBar = window.WsTopBar;
  const Sidebar = window.WsSidebar;
  const cols = getColumns();
  const isIntern = role === 'intern';

  return (
    <div
      className="ws"
      data-screen-label={isIntern ? "Tasks · Intern" : "Tasks · Supervisor"}
    >
      {TopBar ? <TopBar role={role} tab="Tasks" /> : null}
      <div className="ws-body">
        {Sidebar ? <Sidebar role={role} /> : null}
        <main className="ws-main">
          <TasksHead role={role} />

          <div
            className="ws-content"
            style={{
              gridTemplateColumns: '1fr',
              paddingTop: 20,
              paddingBottom: 40,
            }}
          >
            <div className="ws-col-main" style={{ gap: 0 }}>
              {role === 'supervisor' && (
                <div className="tb-review-banner">
                  <span className="dot"></span>
                  <span>
                    <b>1 task is waiting on you.</b> Yasmine submitted <b>BA-003 · Audit slide deck v2</b> 2h ago.
                  </span>
                  <a className="nav">JUMP TO CARD →</a>
                </div>
              )}

              <TasksToolbar role={role} />

              <div className="tb-board">
                {cols.map(c => (
                  <TaskColumn key={c.key} col={c} role={role} />
                ))}
              </div>
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

// Expose for the workspace.jsx App() composition.
window.TasksBoard = TasksBoard;
