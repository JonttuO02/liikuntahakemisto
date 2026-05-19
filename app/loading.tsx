export default function Loading() {
  return (
    <div className="min-h-screen bg-indigo-50">
      <div className="bg-indigo-600 pb-16 relative">
        <div className="max-w-5xl mx-auto px-4 pt-10 pb-6 sm:pt-14 sm:pb-8">
          <div className="h-10 w-48 bg-indigo-500/50 rounded animate-pulse" />
          <div className="mt-2 h-4 w-32 bg-indigo-500/40 rounded animate-pulse" />
          <div className="mt-5 h-12 max-w-lg bg-indigo-500/40 rounded-full animate-pulse" />
        </div>
        <svg className="absolute bottom-0 left-0 w-full h-16" viewBox="0 0 1440 64" preserveAspectRatio="none">
          <path d="M0,32 C240,0 480,64 720,32 C960,0 1200,64 1440,32 L1440,64 L0,64 Z" fill="#EEF2FF" />
        </svg>
      </div>
      <div className="max-w-5xl mx-auto px-4 pt-9 pb-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm">
              <div className="h-2 w-full bg-gray-200 animate-pulse" />
              <div className="p-5 flex flex-col gap-3">
                <div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse" />
                <div className="h-5 w-3/4 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
                <div className="mt-auto pt-2 border-t border-gray-50 flex items-center justify-between">
                  <div className="h-8 w-24 bg-gray-200 rounded-full animate-pulse" />
                  <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
