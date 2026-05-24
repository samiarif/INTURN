import { describe, it, expect } from 'vitest';
import { validateUpload, MAX_BYTES_BY_KIND } from '../allowlist';

const pdfMagic = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]); // "%PDF-"
const pngMagic = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const jpegMagic = new Uint8Array([0xff, 0xd8, 0xff]);
const exeMagic = new Uint8Array([0x4d, 0x5a]); // "MZ"

function fileFromBytes(name: string, type: string, head: Uint8Array, padding = 64) {
  const padded = new Uint8Array(head.length + padding);
  padded.set(head, 0);
  return new File([padded], name, { type });
}

describe('validateUpload', () => {
  it('accepts a real PDF for cv kind', async () => {
    const file = fileFromBytes('cv.pdf', 'application/pdf', pdfMagic);
    const result = await validateUpload('cv', file);
    expect(result.ok).toBe(true);
  });

  it('rejects a PDF declared as application/pdf with EXE magic bytes', async () => {
    const file = fileFromBytes('cv.pdf', 'application/pdf', exeMagic);
    const result = await validateUpload('cv', file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('content_mismatch');
  });

  it('rejects a PDF for logo kind (wrong MIME for kind)', async () => {
    const file = fileFromBytes('logo.pdf', 'application/pdf', pdfMagic);
    const result = await validateUpload('logo', file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('mime_not_allowed');
  });

  it('accepts a PNG for logo kind', async () => {
    const file = fileFromBytes('logo.png', 'image/png', pngMagic);
    const result = await validateUpload('logo', file);
    expect(result.ok).toBe(true);
  });

  it('accepts a JPEG for logo kind', async () => {
    const file = fileFromBytes('logo.jpg', 'image/jpeg', jpegMagic);
    const result = await validateUpload('logo', file);
    expect(result.ok).toBe(true);
  });

  it('rejects an oversize CV (over MAX_BYTES_BY_KIND.cv)', async () => {
    const big = new Uint8Array(MAX_BYTES_BY_KIND.cv + 1);
    big.set(pdfMagic, 0);
    const file = new File([big], 'cv.pdf', { type: 'application/pdf' });
    const result = await validateUpload('cv', file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('too_large');
  });

  it('rejects an unknown kind', async () => {
    const file = fileFromBytes('x.pdf', 'application/pdf', pdfMagic);
    // @ts-expect-error testing runtime guard
    const result = await validateUpload('unknown', file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('invalid_kind');
  });
});
