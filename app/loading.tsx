export default function Loading() {
  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white border-b border-[rgba(0,0,0,0.07)]">
        <div className="max-w-5xl mx-auto px-4 pt-10 pb-7 sm:pt-14 sm:pb-9">
          <div className="h-10 w-56 bg-[rgba(0,0,0,0.06)] rounded-lg animate-pulse" />
          <div className="mt-2 h-4 w-32 bg-[rgba(0,0,0,0.04)] rounded animate-pulse" />
          <div className="mt-5 h-12 max-w-lg bg-[rgba(0,0,0,0.04)] rounded-full animate-pulse" />
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 pt-9 pb-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl overflow-hidden">
              <div className="p-4 flex flex-col gap-3">
                <div className="h-5 w-16 bg-[rgba(0,0,0,0.06)] rounded-full animate-pulse" />
                <div className="h-5 w-3/4 bg-[rgba(0,0,0,0.05)] rounded animate-pulse" />
                <div className="h-4 w-1/2 bg-[rgba(0,0,0,0.04)] rounded animate-pulse" />
                <div className="mt-auto pt-2 border-t border-[rgba(0,0,0,0.07)] flex items-center justify-between">
                  <div className="h-8 w-20 bg-[rgba(0,0,0,0.06)] rounded-full animate-pulse" />
                  <div className="h-5 w-14 bg-[rgba(0,0,0,0.04)] rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
