import type { MetadataRoute } from 'next'

const SITE_URL = 'https://hotbill.app'
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

async function getPostEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const res = await fetch(`${API}/blog/posts?per_page=50`, { next: { revalidate: 300 } })
    if (!res.ok) return []
    const json = await res.json()
    return (json.data ?? []).map((p: { slug: string; published_at: string | null }) => ({
      url: `${SITE_URL}/blogs/${p.slug}`,
      lastModified: p.published_at ? new Date(p.published_at) : new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }))
  } catch {
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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

  const staticEntries: MetadataRoute.Sitemap = routes.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.freq,
    priority: r.priority,
  }))

  return [...staticEntries, ...(await getPostEntries())]
}
