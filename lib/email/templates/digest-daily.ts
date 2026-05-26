import { baseUrl, emailLayout, escapeHtml } from './_layout';

export type DigestItem = { label: string; href: string; meta?: string };

export function digestDailyTemplate({
  recipientName,
  items,
  locale,
}: {
  recipientName: string;
  items: DigestItem[];
  locale: 'fr' | 'en';
}) {
  const fr = locale === 'fr';
  const title = fr ? `Votre récap — Inturn` : `Your Inturn digest`;
  const list =
    items.length === 0
      ? fr
        ? `<p>Rien de neuf aujourd'hui. À demain !</p>`
        : `<p>Nothing new today. See you tomorrow!</p>`
      : `<ul style="padding-left:20px;margin:0;list-style:disc;">${items
          .map(
            (i) =>
              `<li style="margin-bottom:8px;"><a href="${i.href}" style="color:#7C3AED;text-decoration:none;font-weight:500;">${escapeHtml(i.label)}</a>${i.meta ? `<br><span style="color:#6B7280;font-size:12px;">${escapeHtml(i.meta)}</span>` : ''}</li>`,
          )
          .join('')}</ul>`;
  const body = fr
    ? `<p>Bonjour ${escapeHtml(recipientName)},</p>${list}`
    : `<p>Hi ${escapeHtml(recipientName)},</p>${list}`;
  return {
    ...emailLayout({
      title,
      bodyHtml: body,
      ctaLabel: fr ? 'Ouvrir le tableau de bord' : 'Open dashboard',
      ctaHref: baseUrl(),
    }),
    subject: title,
  };
}
