export function RailSupervisor() {
  return (
    <>
      <div className="ws-perf">
        <div className="ws-perf-head">
          <h4>Performance signal</h4>
          <span className="ws-perf-tag">DATA · LIVE</span>
        </div>
        <div className="ws-perf-metric">
          <b>
            100<span style={{ fontSize: 16, marginLeft: 2 }}>%</span>
          </b>
          <span className="delta">on-time delivery</span>
        </div>
        <div className="ws-perf-bench">
          Better than <b>78%</b> of interns at this stage. Across 5 weeks.
        </div>
        <svg className="ws-perf-spark" viewBox="0 0 280 36" preserveAspectRatio="none">
          <defs>
            <linearGradient id="sparkGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#06B6D4" stopOpacity="0.35" />
              <stop offset="1" stopColor="#06B6D4" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M 0,28 L 30,24 L 60,20 L 90,22 L 120,16 L 150,18 L 180,12 L 210,14 L 240,8 L 270,6 L 280,8 L 280,36 L 0,36 Z"
            fill="url(#sparkGrad)"
          />
          <path
            d="M 0,28 L 30,24 L 60,20 L 90,22 L 120,16 L 150,18 L 180,12 L 210,14 L 240,8 L 270,6 L 280,8"
            fill="none"
            stroke="#06B6D4"
            strokeWidth="1.5"
          />
          <circle cx="270" cy="6" r="3" fill="#06B6D4" />
        </svg>
      </div>

      <div className="ws-rail-cta">
        <h4>Need a sync?</h4>
        <p>Schedule a check-in. Inturn generates the Jitsi link and adds it to the timeline.</p>
        <button className="ws-btn-w">Schedule check-in →</button>
      </div>

      <div className="ws-rail-quick">
        <h4>This week</h4>
        <ul>
          <li className="urgent">
            <span className="dot" />
            Review audit v2 (Yasmine submitted 2h ago)
          </li>
          <li className="next">
            <span className="dot" />
            Annotate type pairings reply
          </li>
          <li>
            <span className="dot" />
            Sync 14:00 Fri — Jitsi
          </li>
          <li>
            <span className="dot" />
            Mid-internship review (week 6)
          </li>
        </ul>
      </div>

      <div className="ws-note">
        <b>Quiet flag · informational</b>
        <br />
        No comments from Yasmine in 26h. Below your average.{' '}
        <a className="ws-link" style={{ color: '#92400E', textDecoration: 'underline' }}>
          Send a nudge
        </a>
      </div>
    </>
  );
}
