'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

export type SprintForBanner = {
  id: string;
  name: string;
  goal: string | null;
  orderIndex: number;
  startDate: string | null;
  endDate: string | null;
};

export function SprintBanner({
  sprints,
  activeIndex,
  selectedKey,
  unsortedCount,
  taskCountsBySprint,
}: {
  sprints: SprintForBanner[];
  activeIndex: number | null;
  selectedKey: string;
  unsortedCount: number;
  taskCountsBySprint: Map<string, { total: number; done: number }>;
}) {
  const t = useTranslations('sprintWorkspace');
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function setSprint(key: string) {
    const q = new URLSearchParams(params);
    if (key === '__default__') q.delete('sprint');
    else q.set('sprint', key);
    const qs = q.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ''}`);
  }

  const total = sprints.length;
  const activeSprint = activeIndex !== null ? (sprints[activeIndex] ?? null) : null;
  const selectedSprint =
    selectedKey === 'all' || selectedKey === 'unsorted'
      ? null
      : sprints.find((s) => s.id === selectedKey) ?? activeSprint;

  const status =
    selectedSprint && activeSprint && activeSprint.id === selectedSprint.id
      ? t('statusActive')
      : selectedSprint && activeSprint && selectedSprint.orderIndex < activeSprint.orderIndex
        ? t('statusPast')
        : selectedSprint && activeSprint && selectedSprint.orderIndex > activeSprint.orderIndex
          ? t('statusUpcoming')
          : '';

  return (
    <div
      style={{
        marginBottom: 16,
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-color)',
        background: 'var(--surface)',
        padding: '14px 16px',
      }}
    >
      {selectedSprint ? (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 8,
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--ink-4)',
              marginBottom: 4,
            }}
          >
            <span>{t('sprintOf', { current: selectedSprint.orderIndex + 1, total })}</span>
            {status && (
              <span
                style={{
                  marginLeft: 8,
                  padding: '1px 6px',
                  borderRadius: 3,
                  background: 'var(--surface-muted)',
                  color: 'var(--ink-3)',
                  fontSize: 10,
                }}
              >
                {status}
              </span>
            )}
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--ink)',
              letterSpacing: '-0.005em',
            }}
          >
            {selectedSprint.name}
          </h2>
          {selectedSprint.goal && (
            <p
              style={{
                margin: '4px 0 0',
                fontSize: 12.5,
                color: 'var(--ink-3)',
                lineHeight: 1.45,
              }}
            >
              {selectedSprint.goal}
            </p>
          )}
        </>
      ) : (
        <h2
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--ink)',
            letterSpacing: '-0.005em',
          }}
        >
          {selectedKey === 'all' ? t('allSprintsTitle') : t('unsortedTitle')}
        </h2>
      )}

      {/* Switcher */}
      <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {sprints.map((s, i) => {
          const counts = taskCountsBySprint.get(s.id);
          const isSel =
            selectedKey === s.id ||
            (selectedKey === '__default__' && activeIndex === i);
          const isActive = activeIndex === i;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSprint(s.id)}
              className={`tb-chip${isSel ? ' active' : ''}`}
              data-active-sprint={isActive ? 'true' : undefined}
            >
              {t('sprintLabel', { n: i + 1 })}
              {counts !== undefined && (
                <span className="num">
                  {`${counts.done}/${counts.total}`}
                </span>
              )}
            </button>
          );
        })}
        {unsortedCount > 0 && (
          <button
            type="button"
            onClick={() => setSprint('unsorted')}
            className={`tb-chip${selectedKey === 'unsorted' ? ' active' : ''}`}
          >
            {t('unsorted')}
            <span className="num">{unsortedCount}</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => setSprint('all')}
          className={`tb-chip${selectedKey === 'all' ? ' active' : ''}`}
        >
          {t('allSprints')}
        </button>
      </div>
    </div>
  );
}
