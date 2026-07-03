'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowUpRight } from 'lucide-react'
import Reveal from '@/components/landing/Reveal'
import { format } from 'date-fns'

export interface Post {
  id: number
  title: string
  slug: string
  category: string | null
  excerpt: string | null
  cover_image: string | null
  author_name: string | null
  reading_time: number
  published_at: string | null
}

function fmtDate(d: string | null) {
  return d ? format(new Date(d), 'MMM d, yyyy') : ''
}

/**
 * Client-side category filtering: switching categories is instant (just state,
 * no navigation or refetch). The active category is mirrored into the URL with
 * history.replaceState so `/blogs?category=X` stays shareable without triggering
 * a server round-trip. All posts are already in the HTML, so this is SEO-safe.
 */
export default function BlogList({ posts, categories }: { posts: Post[]; categories: string[] }) {
  const params = useSearchParams()
  const initial = params.get('category') ?? 'All'
  const [active, setActive] = useState(categories.includes(initial) ? initial : 'All')

  const select = (c: string) => {
    setActive(c)
    const url = c === 'All' ? '/blogs' : `/blogs?category=${encodeURIComponent(c)}`
    window.history.replaceState(null, '', url)
  }

  const filtered = useMemo(
    () => (active === 'All' ? posts : posts.filter((p) => p.category === active)),
    [posts, active]
  )

  const featured = active === 'All' ? filtered[0] : undefined
  const rest = featured ? filtered.slice(1) : filtered
  const tabs = ['All', ...categories.filter((c) => c !== 'All')]

  return (
    <>
      {/* Featured */}
      {featured && (
        <section className="bg-white py-20 lg:py-24">
          <Reveal className="container-1200">
            <Link href={`/blogs/${featured.slug}`} className="group grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
              <div className="rounded-card overflow-hidden border border-black/[0.06] relative aspect-[16/10] bg-lightgray">
                {featured.cover_image ? (
                  <Image src={featured.cover_image} alt={featured.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-purple/15 to-navy/10" />
                )}
              </div>
              <div>
                {featured.category && (
                  <span className="inline-block border border-purple/40 text-purple text-xs font-semibold px-4 py-1.5 rounded-pill mb-5">
                    {featured.category}
                  </span>
                )}
                <h2 className="text-3xl lg:text-4xl font-bold text-navy mb-4 leading-tight group-hover:text-purple transition-colors">
                  {featured.title}
                </h2>
                {featured.excerpt && <p className="text-navy/60 leading-relaxed mb-6">{featured.excerpt}</p>}
                <div className="flex items-center gap-4 text-sm text-navy/50">
                  {featured.author_name && <><span className="font-semibold text-navy">{featured.author_name}</span><span>·</span></>}
                  <span>{fmtDate(featured.published_at)}</span>
                  <span>·</span>
                  <span>{featured.reading_time} min read</span>
                </div>
              </div>
            </Link>
          </Reveal>
        </section>
      )}

      {/* Category filter + grid */}
      <section className={`bg-white pb-24 lg:pb-28 ${featured ? '' : 'pt-20 lg:pt-24'}`}>
        <div className="container-1200">
          {tabs.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-10">
              {tabs.map((c) => {
                const isActive = c === active
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => select(c)}
                    className={`text-sm font-medium px-5 py-2 rounded-pill border transition-colors duration-200 ${
                      isActive ? 'bg-purple text-white border-purple' : 'border-black/15 text-navy/60 hover:border-purple hover:text-purple'
                    }`}
                  >
                    {c}
                  </button>
                )
              })}
            </div>
          )}

          {rest.length === 0 && !featured ? (
            <p className="text-navy/50 py-10 text-center">No posts in this category yet.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-7">
              {rest.map((post, i) => (
                <Reveal key={post.id} delay={(i % 3) * 90} className="flex">
                  <Link href={`/blogs/${post.slug}`} className="group bg-white rounded-card border border-black/[0.08] overflow-hidden flex flex-col hover:-translate-y-1 transition-transform duration-200 w-full">
                    <div className="relative aspect-[3/2] overflow-hidden bg-lightgray">
                      {post.cover_image ? (
                        <Image src={post.cover_image} alt={post.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-purple/15 to-navy/10" />
                      )}
                      {post.category && (
                        <span className="absolute top-3 left-3 bg-white/90 backdrop-blur text-navy text-[11px] font-semibold px-3 py-1 rounded-pill">
                          {post.category}
                        </span>
                      )}
                    </div>
                    <div className="p-5 flex flex-col flex-1">
                      <h3 className="font-bold text-navy leading-snug mb-2 group-hover:text-purple transition-colors">{post.title}</h3>
                      {post.excerpt && <p className="text-sm text-navy/55 leading-relaxed mb-4 flex-1">{post.excerpt}</p>}
                      <div className="flex items-center justify-between text-xs text-navy/50 pt-3 border-t border-black/[0.06] mt-auto">
                        <span>{fmtDate(post.published_at)} · {post.reading_time} min read</span>
                        <ArrowUpRight size={16} className="text-purple" />
                      </div>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
