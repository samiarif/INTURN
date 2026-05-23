/**
 * URL trust helpers for Vercel Blob.
 *
 * Server actions that persist a blob URL (CV, logo, RNE doc, deliverable) must
 * verify the URL came from our blob store — otherwise a hostile signup can
 * stuff arbitrary external URLs into profile fields.
 *
 * When BLOB_PUBLIC_HOST is set we pin to that exact host. When unset (dev) we
 * accept any *.public.blob.vercel-storage.com host so we don't block local
 * development.
 */
const VERCEL_BLOB_HOST_SUFFIX = '.public.blob.vercel-storage.com';

export function isOurBlobUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== 'https:') return false;

  const pinned = process.env.BLOB_PUBLIC_HOST;
  if (pinned && pinned.length > 0) {
    return u.host === pinned;
  }
  return u.host.endsWith(VERCEL_BLOB_HOST_SUFFIX);
}

export function assertOurBlobUrl(url: string | null | undefined, fieldName: string): void {
  if (url && !isOurBlobUrl(url)) {
    throw new Error(`${fieldName} must be a URL from our blob store`);
  }
}
