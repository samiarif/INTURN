import type { PulseStatus } from '../types';

/**
 * Small status indicator for a Pulse verdict. No hooks — safe in server
 * components. Colors map to the project's semantic tokens:
 *   on-track  → success (green)
 *   attention → warning (amber)
 *   at-risk   → danger (red)
 *   too-early → muted (grey)
 *
 * Mirrors the `<span className="dot" />` convention used in the workspace rail,
 * but driven by a `PulseStatus` rather than a CSS class.
 */
const STATUS_COLOR: Record<PulseStatus, string> = {
  'on-track': 'var(--success)',
  attention: 'var(--warning)',
  'at-risk': 'var(--danger)',
  'too-early': 'var(--muted-foreground)',
};

export function PulseStatusDot({
  status,
  label,
}: {
  status: PulseStatus;
  /** Optional visible text label rendered next to the dot. */
  label?: string;
}) {
  const dot = (
    <span
      aria-hidden
      style={{
        width: 8,
        height: 8,
        borderRadius: 999,
        background: STATUS_COLOR[status],
        flexShrink: 0,
        display: 'inline-block',
      }}
    />
  );

  if (label === undefined) return dot;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {dot}
      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-2)' }}>{label}</span>
    </span>
  );
}
