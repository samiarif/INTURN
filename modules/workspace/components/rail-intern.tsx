export function RailIntern() {
  return (
    <>
      <div className="ws-rail-cta">
        <h4>Weekly check-in</h4>
        <p>Due Friday. Inturn drafts it from your activity — you edit and send.</p>
        <button className="ws-btn-w">Draft check-in →</button>
      </div>

      <div className="ws-rail-quick">
        <h4>This week</h4>
        <ul>
          <li className="done">
            <span className="dot" />
            Submit audit v2
          </li>
          <li className="next">
            <span className="dot" />
            Ship moodboards (Fri)
          </li>
          <li className="urgent">
            <span className="dot" />
            Reply to Mehdi on type pairings
          </li>
          <li>
            <span className="dot" />
            Pre-fill weekly check-in
          </li>
          <li>
            <span className="dot" />
            Sync 14:00 Fri — Jitsi
          </li>
        </ul>
      </div>

      <div className="ws-rail-quick">
        <h4>Your record · so far</h4>
        <ul>
          <li>
            <span className="dot" style={{ background: 'var(--success)' }} />
            2 of 5 deliverables · on time
          </li>
          <li>
            <span className="dot" style={{ background: 'var(--brand)' }} />
            32 events logged this internship
          </li>
          <li>
            <span className="dot" style={{ background: 'var(--ink-4)' }} />
            End-of-internship record · 25 Jul
          </li>
        </ul>
      </div>
    </>
  );
}
