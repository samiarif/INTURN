import { cn } from '@/lib/utils';

type Size = 'sm' | 'md' | 'lg';

const sizePx: Record<Size, number> = {
  sm: 16,
  md: 22,
  lg: 32,
};

/**
 * Inturn brand mark — the official app-icon badge (violet→magenta gradient
 * carrying the white Inturn glyph + sparkle), shipped as a raster asset at
 * `/brand/inturn-mark.png`. The badge is self-contained (its own gradient
 * background) so it reads identically in light and dark themes.
 *
 * Rendered as a plain <img>: a tiny, static, eager brand asset where
 * next/image's optimizer + lazy-loading machinery would be pure overhead.
 *
 * The `GradientStar` name is kept for API stability across its ~15 call
 * sites (sidebar, mobile strip, footer, auth/onboarding, public shares).
 */
export function GradientStar({ size = 'md', className }: { size?: Size; className?: string }) {
  const px = sizePx[size];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/inturn-mark.png"
      alt=""
      aria-hidden
      width={px}
      height={px}
      decoding="async"
      className={cn(
        'inline-block shrink-0 select-none',
        'drop-shadow-[0_2px_6px_rgba(143,31,254,0.40)]',
        className,
      )}
      style={{ width: px, height: px }}
    />
  );
}
