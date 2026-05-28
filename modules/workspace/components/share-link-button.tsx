'use client';

import { useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ensureDeliverableShareTokenAction } from '@/modules/deliverables/share-actions';

/**
 * Replaces the old dead `<span>Share link</span>`. First click generates a
 * public share token (if none yet) via the server action, then copies the
 * public URL `${origin}/${locale}/deliverables/${token}` to the clipboard and
 * shows a transient "Copied" state. Mirrors the records share flow.
 *
 * Any workspace participant (intern or supervisor) may share — the action
 * enforces that.
 */
export function ShareLinkButton({
  deliverableId,
  existingToken,
}: {
  deliverableId: string;
  existingToken: string | null;
}) {
  const t = useTranslations('workspace.deliverables.share');
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const [token, setToken] = useState<string | null>(existingToken);
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  async function copyUrl(forToken: string) {
    const url = `${window.location.origin}/${locale}/deliverables/${forToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setFailed(false);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (e.g. insecure context) — surface a hint rather
      // than silently doing nothing.
      setFailed(true);
      window.setTimeout(() => setFailed(false), 2500);
    }
  }

  function onClick() {
    if (pending) return;
    if (token) {
      void copyUrl(token);
      return;
    }
    startTransition(async () => {
      const res = await ensureDeliverableShareTokenAction(deliverableId);
      if (res.ok) {
        setToken(res.token);
        await copyUrl(res.token);
      } else {
        setFailed(true);
        window.setTimeout(() => setFailed(false), 2500);
      }
    });
  }

  const label = copied
    ? t('copied')
    : failed
      ? t('error')
      : pending
        ? t('generating')
        : t('button');

  return (
    <button
      type="button"
      className="ws-btn ghost tiny"
      onClick={onClick}
      disabled={pending}
      aria-live="polite"
    >
      {label}
    </button>
  );
}
