'use client';

import { useState } from 'react';

export type MatchExplainerStrings = {
  /** Trigger label, e.g. "Why these". An arrow is appended by the component. */
  trigger: string;
  /** Popover heading. */
  heading: string;
  /** Intro line explaining the ranking, e.g. "Ranked by skill overlap…". */
  intro: string;
  /** "You match {have} of {total} required skills:" line for the top role. */
  matchLine: string;
  /** Label above the matched-skills chip row. */
  haveLabel: string;
  /** Label above the missing-skills chip row. */
  missingLabel: string;
  /** Shown in place of the missing row when the intern has every skill. */
  allMatched: string;
  /** Accessible label for the close button. */
  close: string;
};

/**
 * "Why these →" explainer for the marketplace match band.
 *
 * Lightweight inline popover (mirrors notification-bell): `useState` open +
 * a fixed-inset overlay for outside-click close. The trigger is the band's
 * existing "Why these" element, now a real button. On click it explains the
 * ranking for the viewer's TOP match — which of their skills overlap the
 * role's required skills, and which are still missing.
 *
 * Rendered only when the band shows (signed-in intern with a profile and at
 * least one scored listing), so a top match always exists.
 */
export function MatchExplainer({
  haveSkills,
  missingSkills,
  strings,
}: {
  /**
   * Skills the intern already has for the top role (original listing casing).
   * The role title, org, and score are pre-baked into `strings.intro` /
   * `strings.matchLine` by the server component, so they aren't passed raw.
   */
  haveSkills: string[];
  /** Required skills the intern is still missing for the top role. */
  missingSkills: string[];
  strings: MatchExplainerStrings;
}) {
  const [open, setOpen] = useState(false);
  const total = haveSkills.length + missingSkills.length;

  return (
    <span style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="more"
        aria-haspopup="dialog"
        aria-expanded={open}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          font: 'inherit',
        }}
      >
        {strings.trigger} →
      </button>
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 49 }}
            aria-hidden
          />
          <div
            role="dialog"
            aria-label={strings.heading}
            style={{
              position: 'absolute',
              right: 0,
              top: '160%',
              width: 300,
              background: 'var(--surface)',
              border: '1px solid var(--border-color)',
              borderRadius: 8,
              boxShadow: '0 10px 30px -10px rgba(0,0,0,0.18)',
              zIndex: 50,
              padding: 14,
              textAlign: 'left',
              whiteSpace: 'normal',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 8,
                marginBottom: 6,
              }}
            >
              <strong style={{ fontSize: 13, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
                {strings.heading}
              </strong>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={strings.close}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--ink-3)',
                  fontSize: 15,
                  lineHeight: 1,
                  padding: 0,
                  marginTop: -2,
                }}
              >
                <span aria-hidden>×</span>
              </button>
            </div>

            <p style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5, margin: 0 }}>
              {strings.intro}
            </p>

            <p
              style={{
                fontSize: 12.5,
                color: 'var(--ink)',
                lineHeight: 1.5,
                marginTop: 10,
                marginBottom: 8,
                fontWeight: 500,
              }}
            >
              {strings.matchLine}
            </p>

            {haveSkills.length > 0 && (
              <div style={{ marginBottom: missingSkills.length > 0 ? 10 : 0 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: 'var(--ink-3)',
                    marginBottom: 5,
                  }}
                >
                  {strings.haveLabel}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {haveSkills.map((s) => (
                    <span key={s} className="ex-skill" data-have="true">
                      <span aria-hidden style={{ fontSize: 9, fontWeight: 700, marginRight: 3 }}>
                        ✓
                      </span>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {missingSkills.length > 0 ? (
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: 'var(--ink-3)',
                    marginBottom: 5,
                  }}
                >
                  {strings.missingLabel}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {missingSkills.map((s) => (
                    <span key={s} className="ex-skill">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ) : total > 0 ? (
              <p style={{ fontSize: 12, color: 'var(--success)', margin: 0 }}>{strings.allMatched}</p>
            ) : null}
          </div>
        </>
      )}
    </span>
  );
}
