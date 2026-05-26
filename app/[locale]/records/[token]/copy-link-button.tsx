'use client';

import { useState } from 'react';

export function CopyLinkButton({ label, copiedLabel }: { label: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);

  async function onClick() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked — fallback would require a hidden input
    }
  }

  return (
    <button type="button" className="rec-btn rec-btn-ghost" onClick={onClick}>
      {copied ? copiedLabel : label}
    </button>
  );
}
