'use client';

import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';

const mono = 'var(--font-mono)';

/**
 * Pull the share token out of whatever the user pasted: a full record URL
 * (https://…/records/abc123 — possibly locale-prefixed, with a trailing slash,
 * query or hash), a path fragment, or the bare token itself. The last
 * non-empty path segment wins; a bare token has no '/' so it IS that segment.
 */
function extractToken(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const path = trimmed.split(/[?#]/)[0];
  const segments = path.split('/').filter(Boolean);
  return segments.length > 0 ? segments[segments.length - 1] : trimmed;
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: mono,
  fontSize: 11,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--ink-4)',
  marginBottom: 8,
};

export function VerifyWidget() {
  const t = useTranslations('site.verify.widget');
  const router = useRouter();
  const [value, setValue] = useState<string>('');

  // Real lookup: certificates are public share pages at /records/[token] — the
  // token IS the credential. We route straight there (locale-aware); unknown
  // tokens land on the platform's branded 404/410, which is the designed flow.
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const token = extractToken(value);
    if (!token) return;
    router.push(`/records/${token}`);
  };

  return (
    <div style={{ maxWidth: 620 }}>
      <form onSubmit={handleSubmit}>
        <label htmlFor="vw-id" style={labelStyle}>
          {t('idLabel')}
        </label>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            id="vw-id"
            name="certificateId"
            type="text"
            required
            value={value}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
            placeholder={t('placeholder')}
            autoComplete="off"
            spellCheck={false}
            style={{
              flex: '1 1 240px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              fontSize: 15,
              fontFamily: mono,
              letterSpacing: '0.04em',
              color: 'var(--ink)',
              outline: 'none',
            }}
          />
          <button type="submit" className="mk-btn mk-btn-brand">
            {t('submit')} <span className="arrow">{'→'}</span>
          </button>
        </div>
      </form>

      <div
        style={{
          marginTop: 12,
          fontFamily: mono,
          fontSize: 11,
          letterSpacing: '0.03em',
          color: 'var(--ink-5)',
        }}
      >
        {t('demoNote')}
      </div>
    </div>
  );
}
