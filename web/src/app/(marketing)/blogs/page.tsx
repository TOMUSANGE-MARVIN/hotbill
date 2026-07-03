import { Suspense } from 'react'
import Reveal from '@/components/landing/Reveal'
import BlogList, { type Post } from './BlogList'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

// Render the listing as static HTML and refresh in the background every minute.
// All posts ship in the HTML; category filtering happens instantly client-side.
export const revalidate = 60

async function getPosts(): Promise<Post[]> {
  try {
    const url = new URL(`${API}/blog/posts`)
    url.searchParams.set('per_page', '50')
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

export default async function BlogsPage() {
  const [posts, categories] = await Promise.all([getPosts(), getCategories()])

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
        <Suspense fallback={null}>
          <BlogList posts={posts} categories={categories} />
        </Suspense>
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
