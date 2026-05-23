import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isOurBlobUrl } from '../blob';

describe('isOurBlobUrl', () => {
  const originalEnv = process.env.BLOB_PUBLIC_HOST;
  afterEach(() => {
    if (originalEnv === undefined) delete process.env.BLOB_PUBLIC_HOST;
    else process.env.BLOB_PUBLIC_HOST = originalEnv;
  });

  describe('with BLOB_PUBLIC_HOST pinned', () => {
    beforeEach(() => {
      process.env.BLOB_PUBLIC_HOST = 'demo.public.blob.vercel-storage.com';
    });

    it('accepts URL from the pinned host', () => {
      expect(isOurBlobUrl('https://demo.public.blob.vercel-storage.com/cv/u/file.pdf')).toBe(true);
    });

    it('rejects URL from a different vercel-blob host', () => {
      expect(isOurBlobUrl('https://other.public.blob.vercel-storage.com/file.pdf')).toBe(false);
    });

    it('rejects URL from another host', () => {
      expect(isOurBlobUrl('https://evil.example.com/file.pdf')).toBe(false);
    });
  });

  describe('without BLOB_PUBLIC_HOST (dev fallback)', () => {
    beforeEach(() => {
      delete process.env.BLOB_PUBLIC_HOST;
    });

    it('accepts any *.public.blob.vercel-storage.com host', () => {
      expect(isOurBlobUrl('https://anything.public.blob.vercel-storage.com/file.pdf')).toBe(true);
    });

    it('rejects URL from another host', () => {
      expect(isOurBlobUrl('https://evil.example.com/file.pdf')).toBe(false);
    });
  });

  it('rejects http (non-https)', () => {
    process.env.BLOB_PUBLIC_HOST = 'demo.public.blob.vercel-storage.com';
    expect(isOurBlobUrl('http://demo.public.blob.vercel-storage.com/file.pdf')).toBe(false);
  });

  it('rejects malformed URL', () => {
    expect(isOurBlobUrl('not-a-url')).toBe(false);
  });

  it('returns false on null/undefined/empty', () => {
    expect(isOurBlobUrl(null)).toBe(false);
    expect(isOurBlobUrl(undefined)).toBe(false);
    expect(isOurBlobUrl('')).toBe(false);
  });
});
