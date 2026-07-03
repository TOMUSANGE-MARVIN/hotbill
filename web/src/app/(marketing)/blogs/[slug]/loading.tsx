// Instant skeleton while a post is fetched/rendered, so tapping a post changes
// the page immediately instead of hanging on the previous one.
export default function PostLoading() {
  return (
    <article className="bg-white">
      <div className="bg-lightgray pt-16 pb-14 lg:pt-20 lg:pb-16">
        <div className="max-w-3xl mx-auto px-5">
          <div className="h-4 w-24 rounded bg-black/10 mb-8" />
          <div className="h-6 w-28 rounded-pill bg-black/10 mb-5" />
          <div className="h-10 w-full rounded bg-black/10 mb-3" />
          <div className="h-10 w-3/4 rounded bg-black/10 mb-5" />
          <div className="h-4 w-56 rounded bg-black/[0.06]" />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-14 lg:py-16 space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-4 rounded bg-black/[0.06] animate-pulse"
            style={{ width: `${[100, 96, 88, 100, 92, 80, 100, 70][i]}%` }}
          />
        ))}
      </div>
    </article>
  )
}
