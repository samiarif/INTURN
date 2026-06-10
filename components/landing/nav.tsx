'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { LanguageSwitch } from '@/components/language-switch';

// Primary navigation. Anchor entries scroll within the landing page; route
// entries navigate to real platform pages (locale-aware). Partners + Resources
// from the marketing site are dropped — those pages don't exist here yet.
const LINKS = [
  { key: 'forCompanies', href: '#solution', anchor: true },
  { key: 'forInterns', href: '/marketplace', anchor: false },
  { key: 'virtualInternships', href: '#virtual', anchor: true },
  { key: 'forUniversities', href: '#mission', anchor: true },
  { key: 'howItWorks', href: '#how', anchor: true },
] as const;

export function LandingNav() {
  const t = useTranslations('home.nav');
  const [open, setOpen] = useState(false);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Close the drawer on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const close = () => setOpen(false);

  const renderLink = (l: (typeof LINKS)[number], onClick?: () => void) =>
    l.anchor ? (
      <a key={l.key} href={l.href} onClick={onClick}>
        {t(l.key)}
      </a>
    ) : (
      <Link key={l.key} href={l.href} onClick={onClick}>
        {t(l.key)}
      </Link>
    );

  return (
    <nav className="mk-nav" id="mkNav">
      <div className="mk-nav-inner">
        <Link href="/" className="mk-logo" onClick={close}>
          <Image
            className="mk-wordmark"
            src="/assets/inturn-wordmark.png"
            alt="Inturn"
            width={93}
            height={24}
            priority
          />
        </Link>

        <div className="mk-nav-links">{LINKS.map((l) => renderLink(l))}</div>

        <div className="mk-nav-cta">
          <LanguageSwitch />
          <Link href="/sign-in" className="mk-btn mk-btn-ghost">
            {t('signIn')}
          </Link>
          <Link href="/sign-up" className="mk-btn mk-btn-brand">
            {t('postInternship')}
          </Link>
        </div>

        <button
          type="button"
          className={`mk-nav-toggle${open ? ' open' : ''}`}
          aria-label={open ? t('closeMenu') : t('openMenu')}
          aria-expanded={open}
          aria-controls="mkNavDrawer"
          onClick={() => setOpen((v) => !v)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      {/* Mobile drawer */}
      <div id="mkNavDrawer" className={`mk-nav-drawer${open ? ' open' : ''}`} hidden={!open}>
        <div className="mk-nav-drawer-links">{LINKS.map((l) => renderLink(l, close))}</div>
        <div className="mk-nav-drawer-cta">
          <LanguageSwitch />
          <Link href="/sign-in" className="mk-btn mk-btn-ghost lg" onClick={close}>
            {t('signIn')}
          </Link>
          <Link href="/sign-up" className="mk-btn mk-btn-brand lg" onClick={close}>
            {t('postInternship')}
          </Link>
        </div>
      </div>

      {open && <div className="mk-nav-scrim" onClick={close} aria-hidden="true" />}
    </nav>
  );
}
