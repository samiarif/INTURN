import { getTranslations } from 'next-intl/server';
import type { DeliverableLinks } from '@/modules/deliverables/dependencies';

/**
 * Read-only upstream/downstream awareness for one deliverable (intern side of
 * the dependency layer). Renders two subtle chip rows:
 *   • Depends on  🔗 {title} · {intern} · <status dot>
 *   • Feeds into  🔗 {title} · {intern}
 * Awareness only — never gates work. Renders nothing when the deliverable has
 * no links, so callers can drop it in unconditionally.
 *
 * Server component (sync labels via next-intl/server); status dot colour is
 * inlined so it carries into any surface without extra CSS.
 */

// Deliverable status → dot colour, aligned with the workspace status rail
// (.dv-li-status.*): review=brand, approved/done=success, draft/other=muted.
function statusColor(status: string): string {
  if (status === 'submitted') return 'var(--brand)';
  if (status === 'approved') return 'var(--success)';
  if (status === 'revision-requested') return 'var(--danger)';
  return 'var(--ink-4)';
}

export async function DeliverableLinkChips({ links }: { links: DeliverableLinks }) {
  if (links.dependsOn.length === 0 && links.feedsInto.length === 0) return null;
  const t = await getTranslations('projectHub.dependencies');

  return (
    <div className="dv-links" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {links.dependsOn.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--ink-3)',
              flexShrink: 0,
            }}
          >
            {t('dependsOn')}
          </span>
          <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
            {links.dependsOn.map((d) => (
              <span
                key={d.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '2px 8px',
                  borderRadius: 99,
                  border: '1px solid var(--border-color)',
                  background: 'var(--surface-muted)',
                  fontSize: 12,
                  color: 'var(--ink-2)',
                }}
              >
                <span aria-hidden style={{ lineHeight: 1 }}>
                  🔗
                </span>
                <span style={{ color: 'var(--ink)' }}>{d.title}</span>
                <span style={{ color: 'var(--ink-4)' }}>·</span>
                <span>{d.internName}</span>
                <span
                  aria-hidden
                  title={d.status}
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 99,
                    background: statusColor(d.status),
                    flexShrink: 0,
                  }}
                />
              </span>
            ))}
          </span>
        </div>
      )}

      {links.feedsInto.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--ink-3)',
              flexShrink: 0,
            }}
          >
            {t('feedsInto')}
          </span>
          <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
            {links.feedsInto.map((d) => (
              <span
                key={d.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '2px 8px',
                  borderRadius: 99,
                  border: '1px solid var(--border-color)',
                  background: 'var(--surface-muted)',
                  fontSize: 12,
                  color: 'var(--ink-2)',
                }}
              >
                <span aria-hidden style={{ lineHeight: 1 }}>
                  🔗
                </span>
                <span style={{ color: 'var(--ink)' }}>{d.title}</span>
                <span style={{ color: 'var(--ink-4)' }}>·</span>
                <span>{d.internName}</span>
              </span>
            ))}
          </span>
        </div>
      )}
    </div>
  );
}
