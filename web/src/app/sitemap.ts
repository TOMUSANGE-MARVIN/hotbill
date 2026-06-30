import type { MetadataRoute } from 'next'

const SITE_URL = 'https://hotbill.app'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const routes: { path: string; priority: number; freq: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
    { path: '', priority: 1, freq: 'weekly' },
    { path: '/features', priority: 0.9, freq: 'weekly' },
    { path: '/about', priority: 0.7, freq: 'monthly' },
    { path: '/contact', priority: 0.7, freq: 'monthly' },
    { path: '/faqs', priority: 0.7, freq: 'monthly' },
    { path: '/docs', priority: 0.7, freq: 'monthly' },
    { path: '/blogs', priority: 0.6, freq: 'weekly' },
    { path: '/privacy-policy', priority: 0.3, freq: 'yearly' },
    { path: '/terms', priority: 0.3, freq: 'yearly' },
    { path: '/refund-policy', priority: 0.3, freq: 'yearly' },
  ]

  return routes.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.freq,
    priority: r.priority,
  }))
}
