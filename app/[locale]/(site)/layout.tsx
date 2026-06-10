import '@/app/landing.css';
import { LandingNav } from '@/components/landing/nav';
import { LandingFooter } from '@/components/landing/footer';
import { MarketingEffects } from '@/components/landing/marketing-effects';

// Shared chrome for the public marketing site. Every page in the (site) route
// group renders inside .mk-root — the scope for all mk-*/il-* landing styles —
// with the landing nav, footer and scroll-effects layer. Being a route group,
// this adds nothing to the URL: (site)/page.tsx is still `/`.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mk-root">
      <LandingNav />
      {children}
      <LandingFooter />
      <MarketingEffects />
    </div>
  );
}
