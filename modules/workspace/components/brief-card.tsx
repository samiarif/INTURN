import { getTranslations, getLocale } from 'next-intl/server';
import type { WorkspaceOverviewData } from '../queries';
import { Avatar } from '@/components/avatar';
import { locationLabelKey } from './location-label';
import { localizeCompensation } from '@/lib/format-compensation';

export async function BriefCard({
  data,
  view,
}: {
  data: WorkspaceOverviewData;
  view: 'intern' | 'supervisor';
}) {
  const t = await getTranslations('workspace.brief');
  const locale = await getLocale();
  const internship = data.internship;
  const project = data.project;
  const intern = data.intern;
  const supervisor = data.supervisors[0];

  const eyebrow = t('eyebrow', {
    weeks: internship?.duration ?? 12,
    mode: t(`mode.${locationLabelKey(internship?.locationType)}`),
  });
  const title = project?.name ?? internship?.title ?? t('workspaceFallback');
  const description = project?.brief ?? internship?.description ?? '';
  const locationType = internship?.locationType;
  const locationHint =
    locationType === 'hybrid'
      ? t('hintHybrid')
      : locationType === 'on-site'
        ? t('hintOnSite')
        : t('hintRemote');

  return (
    <div className="ws-brief">
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="ws-brief-eyebrow">{eyebrow}</div>
        <h2 className="ws-brief-title">{title}</h2>
        {description && (
          <div
            style={{
              fontSize: 14,
              color: 'var(--ink-2)',
              lineHeight: 1.5,
              maxWidth: '52ch',
              marginBottom: 10,
            }}
          >
            {description}
          </div>
        )}
        <div className="ws-brief-meta">
          {internship?.location && (
            <span>
              {t.rich('locationMeta', {
                b: (chunks) => <b>{chunks}</b>,
                location: internship.location,
                hint: locationHint,
              })}
            </span>
          )}
          {internship?.isPaid && internship.compensation && (
            <>
              <span className="dot" />
              <span>
                {t.rich('paidMeta', {
                  b: (chunks) => <b>{chunks}</b>,
                  amount: localizeCompensation(internship.compensation, locale),
                })}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="ws-brief-people">
        {view === 'intern'
          ? supervisor && (
              <>
                <div className="ws-brief-person">
                  <div className="role">{t('roleSupervisor')}</div>
                  <div className="name">
                    {supervisor.firstName} {supervisor.lastName}
                  </div>
                  <div className="org">{data.organization?.name ?? ''}</div>
                </div>
                <Avatar
                  name={`${supervisor.firstName ?? ''} ${supervisor.lastName ?? ''}`.trim()}
                  email={supervisor.email}
                  imageUrl={supervisor.imageUrl}
                  size="lg"
                />
              </>
            )
          : intern && (
              <>
                <div className="ws-brief-person">
                  <div className="role">{t('roleIntern')}</div>
                  <div className="name">
                    {intern.firstName} {intern.lastName}
                  </div>
                  <div className="org">
                    {data.internProfile?.university ?? ''}
                    {data.internProfile?.yearOfStudy
                      ? ` · ${data.internProfile.yearOfStudy}`
                      : ''}
                  </div>
                </div>
                <Avatar
                  name={`${intern.firstName ?? ''} ${intern.lastName ?? ''}`.trim()}
                  email={intern.email}
                  imageUrl={intern.imageUrl}
                  size="lg"
                />
              </>
            )}
      </div>
    </div>
  );
}
