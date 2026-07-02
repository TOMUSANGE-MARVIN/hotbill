import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import Reveal from '@/components/landing/Reveal'
import { format } from 'date-fns'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

interface Post {
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

async function getPosts(category?: string): Promise<Post[]> {
  try {
    const url = new URL(`${API}/blog/posts`)
    url.searchParams.set('per_page', '50')
    if (category && category !== 'All') url.searchParams.set('category', category)
    const res = await fetch(url, { next: { revalidate: 60 } })
    if (!res.ok) return []
    const json = await res.json()
    return json.data ?? []
  } catch {
    return []
  }
}

async function getCategories(): Promise<string[]> {
  try {
    const res = await fetch(`${API}/blog/categories`, { next: { revalidate: 60 } })
    if (!res.ok) return []
    const json = await res.json()
    return json.categories ?? []
  } catch {
    return []
  }
}

function fmtDate(d: string | null) {
  return d ? format(new Date(d), 'MMM d, yyyy') : ''
}

export default async function BlogsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category } = await searchParams
  const active = category ?? 'All'
  const [posts, cats] = await Promise.all([getPosts(active), getCategories()])
  const categories = ['All', ...cats]

  const featured = active === 'All' ? posts[0] : undefined
  const rest = featured ? posts.slice(1) : posts

  return (
    <>
      {/* Hero */}
      <section className="bg-lightgray py-24 lg:py-28">
        <Reveal className="container-1200 text-center">
          <span className="inline-block border border-purple/40 rounded-pill px-5 py-1.5 text-xs font-medium text-navy mb-6">
            Blogs
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-[-1px] text-navy mb-6">
            Insights from the <span className="text-purple">field</span>
          </h1>
          <p className="text-lg text-navy/60 max-w-2xl mx-auto">
            Guides, engineering notes and growth stories to help you run a more profitable hotspot business.
          </p>
        </Reveal>
      </section>

      {posts.length === 0 ? (
        <section className="bg-white py-28 text-center">
          <div className="container-1200">
            <p className="text-navy/50">No posts published yet. Check back soon.</p>
          </div>
        </section>
      ) : (
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
              {categories.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-10">
                  {categories.map((c) => {
                    const isActive = c === active
                    return (
                      <Link
                        key={c}
                        href={c === 'All' ? '/blogs' : `/blogs?category=${encodeURIComponent(c)}`}
                        className={`text-sm font-medium px-5 py-2 rounded-pill border transition-colors duration-200 ${
                          isActive ? 'bg-purple text-white border-purple' : 'border-black/15 text-navy/60 hover:border-purple hover:text-purple'
                        }`}
                      >
                        {c}
                      </Link>
                    )
                  })}
                </div>
              )}

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
            </div>
          </section>
        </>
      )}

      {/* Newsletter CTA */}
      <section className="bg-navy py-20 lg:py-24 text-center">
        <Reveal className="container-1200">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">Never miss an update</h2>
          <p className="text-white/60 max-w-md mx-auto mb-8">Get new guides and product news in your inbox. No spam, unsubscribe anytime.</p>
          <NewsletterForm />
        </Reveal>
      </section>
    </>
  )
}

function NewsletterForm() {
  return (
    <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto" action="https://formspree.io/f/mrewakva" method="POST">
      <input type="email" name="email" required placeholder="you@company.com" className="flex-1 rounded-btn px-4 py-3 text-sm text-navy bg-white outline-none" />
      <input type="hidden" name="_subject" value="HotBill newsletter signup" />
      <button type="submit" className="bg-purple hover:bg-purple-dark text-white px-6 py-3 rounded-btn text-sm font-semibold transition-colors">Subscribe</button>
    </form>
  )
}
