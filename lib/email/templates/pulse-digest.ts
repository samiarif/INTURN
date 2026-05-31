import { emailLayout, escapeHtml, baseUrl } from './_layout';

export type PulseAlert = {
  internName: string;
  status: 'attention' | 'at-risk';
  headline: string;
  action: string;
  workspaceId: string;
};

/**
 * Weekly Pulse digest — one email per supervisor listing the interns who need
 * their attention (attention / at-risk), each with the read + the one action.
 * Inline-localized (renders outside a request context, like the other
 * templates). Returns { subject, html, text }.
 */
export function pulseDigestTemplate({
  supervisorName,
  alerts,
  locale,
}: {
  supervisorName: string;
  alerts: PulseAlert[];
  locale: 'fr' | 'en';
}): { subject: string; html: string; text: string } {
  const fr = locale === 'fr';
  const n = alerts.length;

  const subject = fr
    ? `Pulse · ${n === 1 ? '1 stagiaire a' : `${n} stagiaires ont`} besoin de vous`
    : `Pulse · ${n} intern${n === 1 ? '' : 's'} need${n === 1 ? 's' : ''} your attention`;

  const intro = fr
    ? `<p style="margin:0 0 8px;">Bonjour ${escapeHtml(supervisorName)}, voici les stagiaires qui ont besoin de votre attention cette semaine :</p>`
    : `<p style="margin:0 0 8px;">Hi ${escapeHtml(supervisorName)}, here are the interns who need your attention this week:</p>`;

  const items = alerts
    .map((a) => {
      const color = a.status === 'at-risk' ? '#DC2626' : '#D97706';
      const tag =
        a.status === 'at-risk' ? (fr ? 'En risque' : 'At risk') : (fr ? 'À surveiller' : 'Needs attention');
      return `<div style="margin:14px 0;padding:14px;border-left:3px solid ${color};background:#F9FAFB;border-radius:4px;">
  <div style="font-weight:600;color:#0F172A;font-size:14px;">${escapeHtml(a.internName)} · <span style="color:${color};">${tag}</span></div>
  <div style="margin-top:4px;color:#374151;font-size:14px;">${escapeHtml(a.headline)}</div>
  <div style="margin-top:6px;color:#7C3AED;font-size:13px;font-weight:500;">→ ${escapeHtml(a.action)}</div>
</div>`;
    })
    .join('');

  const bodyHtml = intro + items;
  const ctaHref = `${baseUrl()}${fr ? '' : '/en'}/company/dashboard`;
  const ctaLabel = fr ? 'Voir le tableau de bord' : 'Open the dashboard';

  return { subject, ...emailLayout({ title: subject, bodyHtml, ctaLabel, ctaHref }) };
}
