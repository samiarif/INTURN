/**
 * Inlined-CSS email layout. Email clients are notoriously bad at <style>
 * tags and external CSS — inline-style attributes are the safe choice.
 */
export function emailLayout({
  title,
  bodyHtml,
  ctaLabel,
  ctaHref,
}: {
  title: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaHref?: string;
}): { html: string; text: string } {
  const cta =
    ctaLabel && ctaHref
      ? `<table cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td style="background:#7C3AED;border-radius:6px;"><a href="${ctaHref}" style="display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-weight:600;font-family:system-ui,sans-serif;font-size:14px;">${escapeHtml(ctaLabel)}</a></td></tr></table>`
      : '';

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:24px;background:#F9FAFB;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#111827;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:8px;padding:32px;">
    <div style="font-weight:700;font-size:18px;margin-bottom:24px;color:#0F172A;">Inturn</div>
    ${bodyHtml}
    ${cta}
    <hr style="border:none;border-top:1px solid #E5E7EB;margin:32px 0 16px;">
    <div style="font-size:12px;color:#6B7280;">Inturn · Tunisia · <a href="https://inturn-hub.com" style="color:#6B7280;">inturn-hub.com</a></div>
  </div>
</body></html>`;

  const text = `${title}\n\n${stripHtml(bodyHtml)}${ctaHref ? `\n\n${ctaLabel}: ${ctaHref}` : ''}\n\n— Inturn`;
  return { html, text };
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c),
  );
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function baseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
}
