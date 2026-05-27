/**
 * Single avatar primitive. Replaces the inline
 * `<span className="ws-avatar" style={{ width: 32, height: 32, … }}>`
 * pattern scattered across community, deliverables, workspace etc.
 *
 * - Computes two-letter initials from a name (or '?')
 * - Has 4 named sizes (xs / sm / md / lg)
 * - Picks one of three deterministic gradients based on the first
 *   letter so two avatars side-by-side don't collide visually
 *
 * If `imageUrl` is provided, falls back to it (loaded eagerly — these
 * are typically just a Clerk-provided URL and we want them on the
 * first paint).
 */
const SIZE_PX: Record<'xs' | 'sm' | 'md' | 'lg', { box: number; font: number }> = {
  xs: { box: 24, font: 10 },
  sm: { box: 32, font: 11 },
  md: { box: 40, font: 13 },
  lg: { box: 56, font: 18 },
};

const GRADIENTS = [
  // violet
  { bg: 'linear-gradient(135deg,#DDD6FE,#C7D2FE)', fg: 'var(--brand-700)' },
  // teal
  { bg: 'linear-gradient(135deg,#A7F3D0,#BAE6FD)', fg: 'rgb(15,118,110)' },
  // amber
  { bg: 'linear-gradient(135deg,#FED7AA,#FCD34D)', fg: 'rgb(180,83,9)' },
] as const;

export function avatarInitials(name: string | null | undefined, email?: string | null): string {
  const source = (name && name.trim()) || (email ?? '').trim();
  if (!source) return '?';
  return source
    .split(/[\s.@_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '?';
}

function pickGradient(seed: string) {
  const code = seed.length > 0 ? seed.charCodeAt(0) : 0;
  return GRADIENTS[code % GRADIENTS.length];
}

export function Avatar({
  name,
  email,
  imageUrl,
  size = 'sm',
  title,
}: {
  name?: string | null;
  email?: string | null;
  imageUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  title?: string;
}) {
  const { box, font } = SIZE_PX[size];
  const label = title ?? name ?? email ?? '';

  if (imageUrl) {
    return (
      // Avatars come from many origins (Clerk + Vercel Blob); using next/image
      // would force next.config.ts remotePatterns to cover every Clerk-issued
      // CDN host. A plain <img> is fine here — these are small, eager-loaded,
      // and rarely change after first render.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={label}
        title={title}
        width={box}
        height={box}
        loading="eager"
        decoding="async"
        className="inline-block rounded-full object-cover flex-shrink-0"
        style={{ width: box, height: box }}
      />
    );
  }

  const initials = avatarInitials(name, email);
  const gradient = pickGradient(initials);

  return (
    <span
      title={title}
      aria-label={label}
      className="inline-flex items-center justify-center rounded-full font-semibold select-none flex-shrink-0"
      style={{
        width: box,
        height: box,
        fontSize: font,
        background: gradient.bg,
        color: gradient.fg,
      }}
    >
      {initials}
    </span>
  );
}
