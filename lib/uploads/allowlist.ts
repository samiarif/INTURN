/**
 * Upload allowlist. Each `kind` (cv/logo/registry/deliverable) has:
 *  - a list of acceptable MIME types
 *  - matching magic-byte signatures (so a renamed/mistyped file is rejected
 *    even if the declared MIME is on the list)
 *  - a per-kind max size (CV/registry larger than logos)
 */

export const ALLOWED_KINDS = ['cv', 'logo', 'registry', 'deliverable'] as const;
export type Kind = (typeof ALLOWED_KINDS)[number];

export const MAX_BYTES_BY_KIND: Record<Kind, number> = {
  cv: 8 * 1024 * 1024,
  logo: 2 * 1024 * 1024,
  registry: 8 * 1024 * 1024,
  deliverable: 25 * 1024 * 1024,
};

type Signature = { mime: string; head: number[] };

const PDF: Signature = { mime: 'application/pdf', head: [0x25, 0x50, 0x44, 0x46, 0x2d] };
const PNG: Signature = { mime: 'image/png', head: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] };
const JPEG: Signature = { mime: 'image/jpeg', head: [0xff, 0xd8, 0xff] };
const SVG_TEXT: Signature = { mime: 'image/svg+xml', head: [] };
const DOCX: Signature = {
  mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  head: [0x50, 0x4b, 0x03, 0x04],
};
const XLSX: Signature = {
  mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  head: [0x50, 0x4b, 0x03, 0x04],
};
const PPTX: Signature = {
  mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  head: [0x50, 0x4b, 0x03, 0x04],
};

const SIGNATURES_BY_KIND: Record<Kind, Signature[]> = {
  cv: [PDF, DOCX],
  logo: [PNG, JPEG, SVG_TEXT],
  registry: [PDF],
  deliverable: [PDF, PNG, JPEG, DOCX, XLSX, PPTX],
};

export type ValidationResult =
  | { ok: true }
  | { ok: false; code: 'invalid_kind' | 'mime_not_allowed' | 'too_large' | 'content_mismatch' };

export async function validateUpload(kind: Kind, file: File): Promise<ValidationResult> {
  if (!ALLOWED_KINDS.includes(kind)) {
    return { ok: false, code: 'invalid_kind' };
  }
  const k: Kind = kind;

  if (file.size > MAX_BYTES_BY_KIND[k]) {
    return { ok: false, code: 'too_large' };
  }

  const allowed = SIGNATURES_BY_KIND[k];
  const mimeMatch = allowed.find((s) => s.mime === file.type);
  if (!mimeMatch) {
    return { ok: false, code: 'mime_not_allowed' };
  }

  // SVG is text-based — no reliable magic bytes. Trust declared MIME for SVG only.
  if (mimeMatch.head.length === 0) {
    return { ok: true };
  }

  const buf = new Uint8Array(await file.slice(0, mimeMatch.head.length).arrayBuffer());
  for (let i = 0; i < mimeMatch.head.length; i++) {
    if (buf[i] !== mimeMatch.head[i]) {
      return { ok: false, code: 'content_mismatch' };
    }
  }

  return { ok: true };
}
