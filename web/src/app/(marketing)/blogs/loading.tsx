// Shown instantly on navigation into /blogs while the server renders, so the
// page changes immediately instead of appearing frozen during the API fetch.
export default function BlogsLoading() {
  return (
    <>
      <section className="bg-lightgray py-24 lg:py-28">
        <div className="container-1200 text-center">
          <div className="mx-auto h-7 w-24 rounded-pill bg-black/10 mb-6" />
          <div className="mx-auto h-12 w-2/3 max-w-xl rounded bg-black/10 mb-4" />
          <div className="mx-auto h-5 w-1/2 max-w-md rounded bg-black/10" />
        </div>
      </section>

      <section className="bg-white py-20 lg:py-24">
        <div className="container-1200">
          {/* Featured skeleton */}
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center mb-16">
            <div className="rounded-card aspect-[16/10] bg-black/[0.06] animate-pulse" />
            <div>
              <div className="h-6 w-24 rounded-pill bg-black/10 mb-5" />
              <div className="h-9 w-4/5 rounded bg-black/10 mb-3" />
              <div className="h-9 w-2/3 rounded bg-black/10 mb-6" />
              <div className="h-4 w-full rounded bg-black/[0.06] mb-2" />
              <div className="h-4 w-5/6 rounded bg-black/[0.06]" />
            </div>
          </div>

          {/* Grid skeleton */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-7">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-card border border-black/[0.08] overflow-hidden">
                <div className="aspect-[3/2] bg-black/[0.06] animate-pulse" />
                <div className="p-5">
                  <div className="h-5 w-4/5 rounded bg-black/10 mb-3" />
                  <div className="h-4 w-full rounded bg-black/[0.06] mb-2" />
                  <div className="h-4 w-2/3 rounded bg-black/[0.06]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
