import type { MetadataRoute } from 'next';

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://inturn-hub.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/en/', '/marketplace', '/internships/'],
        disallow: ['/admin/', '/intern/', '/company/', '/api/', '/sign-in/', '/sign-up/', '/onboarding/'],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
