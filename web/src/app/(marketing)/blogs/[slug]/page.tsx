import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
const SITE = 'https://hotbill.app'

// Pre-render post pages as static HTML and refresh them in the background every
// 5 minutes (ISR). This makes opening a post near-instant and lets <Link> fully
// prefetch it, instead of server-rendering on every click.
export const revalidate = 300
export const dynamicParams = true // new posts not in the list still render on demand

export async function generateStaticParams() {
  try {
    const res = await fetch(`${API}/blog/posts?per_page=100`, { next: { revalidate: 300 } })
    if (!res.ok) return []
    const json = await res.json()
    return (json.data ?? []).map((p: { slug: string }) => ({ slug: p.slug }))
  } catch {
    return []
  }
}

interface Post {
  id: number
  title: string
  slug: string
  category: string | null
  excerpt: string | null
  content: string | null
  cover_image: string | null
  author_name: string | null
  reading_time: number
  published_at: string | null
  meta_title: string | null
  meta_description: string | null
  og_image: string | null
}

async function getPost(slug: string): Promise<Post | null> {
  try {
    const res = await fetch(`${API}/blog/posts/${encodeURIComponent(slug)}`, { next: { revalidate: 60 } })
    if (!res.ok) return null
    const json = await res.json()
    return json.post ?? null
  } catch {
    return null
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) return { title: 'Post not found' }

  const title = post.meta_title || post.title
  const description = post.meta_description || post.excerpt || undefined
  const image = post.og_image || post.cover_image || undefined
  const canonical = `/blogs/${post.slug}`

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: 'article',
      url: `${SITE}${canonical}`,
      publishedTime: post.published_at ?? undefined,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: image ? [image] : undefined,
    },
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) notFound()

  const date = post.published_at ? format(new Date(post.published_at), 'MMMM d, yyyy') : ''
  const image = post.cover_image
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt ?? undefined,
    image: post.og_image || post.cover_image || undefined,
    datePublished: post.published_at ?? undefined,
    author: post.author_name ? { '@type': 'Person', name: post.author_name } : undefined,
    mainEntityOfPage: `${SITE}/blogs/${post.slug}`,
  }

  return (
    <article className="bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Header */}
      <div className="bg-lightgray pt-16 pb-14 lg:pt-20 lg:pb-16">
        <div className="max-w-3xl mx-auto px-5">
          <Link href="/blogs" className="inline-flex items-center gap-1.5 text-sm text-navy/55 hover:text-purple mb-8">
            <ArrowLeft size={16} /> All posts
          </Link>
          {post.category && (
            <span className="inline-block border border-purple/40 text-purple text-xs font-semibold px-4 py-1.5 rounded-pill mb-5">
              {post.category}
            </span>
          )}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-[-0.5px] text-navy leading-tight mb-5">
            {post.title}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-navy/55">
            {post.author_name && <><span className="font-semibold text-navy">{post.author_name}</span><span>·</span></>}
            {date && <><span>{date}</span><span>·</span></>}
            <span>{post.reading_time} min read</span>
          </div>
        </div>
      </div>

      {/* Cover */}
      {image && (
        <div className="max-w-4xl mx-auto px-5 -mt-8">
          <div className="relative aspect-[16/9] rounded-card overflow-hidden border border-black/[0.06] shadow-lg">
            <Image src={image} alt={post.title} fill priority className="object-cover" />
          </div>
        </div>
      )}

      {/* Body - content authored by platform admins via the CMS editor. */}
      <div className="max-w-3xl mx-auto px-5 py-14 lg:py-16">
        <div className="blog-content" dangerouslySetInnerHTML={{ __html: post.content ?? '' }} />
      </div>

      {/* Footer CTA */}
      <div className="border-t border-black/[0.06]">
        <div className="max-w-3xl mx-auto px-5 py-12 text-center">
          <p className="text-navy/60 mb-5">Ready to run your hotspot business on HotBill?</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/register" className="bg-purple hover:bg-purple-dark text-white text-sm font-semibold px-6 py-3 rounded-btn transition-colors">
              Get started free
            </Link>
            <Link href="/blogs" className="border border-black/12 hover:border-purple text-navy text-sm font-semibold px-6 py-3 rounded-btn transition-colors">
              Read more posts
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}
