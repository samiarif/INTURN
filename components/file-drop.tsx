'use client';

import { useState } from 'react';

export type UploadKind = 'cv' | 'logo' | 'deliverable' | 'registry';

export type UploadResult = {
  url: string;
  fileName: string;
  contentType: string;
  size: number;
};

export function FileDrop({
  kind,
  accept = '.pdf,image/*',
  onUploaded,
  helper,
}: {
  kind: UploadKind;
  accept?: string;
  onUploaded: (result: UploadResult) => void;
  helper?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set('file', file);
      const res = await fetch(`/api/upload?kind=${kind}`, { method: 'POST', body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Upload failed (${res.status})`);
      }
      const json: UploadResult = await res.json();
      onUploaded(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="block border-2 border-dashed border-[var(--border-color)] rounded-md p-6 text-center bg-[var(--surface)] cursor-pointer hover:border-[var(--brand-300)] transition-colors">
        <input
          type="file"
          accept={accept}
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            const f = e.currentTarget.files?.[0];
            if (f) void handleFile(f);
          }}
        />
        <b className="block text-[var(--ink)] font-medium">
          {uploading ? 'Uploading…' : 'Drop your file or click to browse'}
        </b>
        {helper && <span className="block text-[12px] text-[var(--ink-3)] mt-1">{helper}</span>}
      </label>
      {error && <p className="text-[12px] text-[var(--danger)] mt-1">{error}</p>}
    </div>
  );
}
