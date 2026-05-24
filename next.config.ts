import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
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
