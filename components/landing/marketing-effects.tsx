'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

/**
 * Site-wide progressive enhancement:
 *  - sticky-nav hairline border once scrolled
 *  - scroll-reveal entrances (client-navigation safe)
 *  - top scroll-progress bar (brand gradient)
 *  - back-to-top button after a couple of viewports
 *  - count-up animation on community stats
 * Everything degrades gracefully with JS off or reduced motion.
 */
export function MarketingEffects() {
  const t = useTranslations('home.effects');
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const nav = document.getElementById('mkNav');
    const root = document.documentElement;

    const onScroll = () => {
      if (nav) nav.classList.toggle('scrolled', window.scrollY > 8);
      // Progress 0..1 across the page; consumed by .mk-progress scaleX.
      const max = root.scrollHeight - window.innerHeight;
      root.style.setProperty(
        '--mk-scroll',
        String(max > 0 ? Math.min(window.scrollY / max, 1) : 0),
      );
      setShowTop(window.scrollY > window.innerHeight * 1.5);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();

    const reduce =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduce || !('IntersectionObserver' in window)) {
      return () => {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
      };
    }

    // --- Count-up stats (community band) ---
    const counters: HTMLElement[] = Array.from(
      document.querySelectorAll<HTMLElement>('.mk-community-stat b'),
    );
    const counterIo = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          counterIo.unobserve(entry.target);
          const el = entry.target as HTMLElement;
          const finalText = el.dataset.final || el.textContent || '';
          const match = finalText.match(/^([\d,.]+)(.*)$/);
          if (!match) return;
          const target = parseFloat(match[1].replace(/,/g, ''));
          const suffix = match[2] || '';
          const useComma = match[1].includes(',');
          const start = performance.now();
          const dur = 1200;
          const tick = (now: number) => {
            const t = Math.min((now - start) / dur, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            let v = String(Math.round(target * eased));
            if (useComma) v = Number(v).toLocaleString('en-US');
            el.textContent = v + suffix;
            if (t < 1) requestAnimationFrame(tick);
            else el.textContent = finalText;
          };
          requestAnimationFrame(tick);
        });
      },
      { threshold: 0.6 },
    );
    counters.forEach((el) => {
      el.dataset.final = el.textContent || '';
      counterIo.observe(el);
    });

    // --- Scroll reveal ---
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('mk-reveal-in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -6% 0px' },
    );

    const targets: Element[] = [];
    const reveal = (el: Element | null, delay?: number) => {
      if (!el || el.classList.contains('mk-reveal')) return;
      el.classList.add('mk-reveal');
      if (delay) (el as HTMLElement).style.transitionDelay = delay + 'ms';
      targets.push(el);
    };

    // Hero stack — gentle staggered load-in.
    [
      '.mk-audience',
      '.mk-hero h1',
      '.mk-hero .deck',
      '.mk-hero-cta',
      '.mk-hero-trust',
      '.mk-hero-showcase',
    ].forEach((sel, i) => reveal(document.querySelector(sel), i * 80));

    // Staggered grids — cards animate in sequence.
    document
      .querySelectorAll('.mk-grid-2, .mk-grid-3, .mk-grid-4, .mk-price-grid, .mk-sdg-grid')
      .forEach((grid) => {
        Array.prototype.forEach.call(grid.children, (child: Element, i: number) =>
          reveal(child, Math.min(i * 70, 280)),
        );
      });

    // Standalone blocks.
    document
      .querySelectorAll(
        '.mk-section-head, .mk-step, .mk-compare, .mk-quote, .mk-cta-band, .mk-trust-logos, .mk-diagram-frame, .mk-community-feed',
      )
      .forEach((el) => reveal(el));

    // Section frames, but skip the hero frame (its showcase parent handles it).
    document.querySelectorAll('.mk-frame').forEach((el) => {
      if (el.closest('.mk-hero, .mk-hero-showcase')) return;
      reveal(el);
    });

    // Decide per element AFTER layout settles (next frame). Anything already in
    // (or near) the viewport is revealed immediately — this keeps client-side
    // navigation safe (nothing gets stuck at opacity:0). Only below-the-fold
    // elements are handed to the observer to reveal on scroll.
    const raf = requestAnimationFrame(() => {
      const vh = window.innerHeight || document.documentElement.clientHeight;
      targets.forEach((el) => {
        const top = el.getBoundingClientRect().top;
        if (top < vh) {
          el.classList.add('mk-reveal-in');
        } else {
          io.observe(el);
        }
      });
    });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
      io.disconnect();
      counterIo.disconnect();
    };
  }, []);

  return (
    <>
      <div className="mk-progress" aria-hidden="true" />
      <button
        type="button"
        className={`mk-to-top${showTop ? ' show' : ''}`}
        aria-label={t('backToTop')}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        {'↑'}
      </button>
    </>
  );
}
