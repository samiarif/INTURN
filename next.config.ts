import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // Pin the workspace root to this directory. Without it, Turbopack detects
  // the stray lockfile in the parent wrapper folder, infers the wrong root,
  // and the misrouted resolve breaks the Tailwind v4 PostCSS pipeline in dev.
  // `import.meta.dirname` === the inturn/ dir in both local dev and on Vercel.
  turbopack: {
    root: import.meta.dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.public.blob.vercel-storage.com',
        pathname: '/**',
        search: '',
      },
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
        pathname: '/**',
        search: '',
      },
    ],
  },
};

export default withNextIntl(nextConfig);
