import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-indigo-50 flex flex-col items-center justify-center px-4 pb-16">
      <div className="text-center max-w-sm">
        <p className="text-5xl mb-4 select-none">🔍</p>
        <h1 className="text-2xl font-bold text-indigo-950 mb-2">Sivua ei löydy.</h1>
        <p className="text-gray-500 mb-8">Etsimääsi sivua ei ole olemassa tai se on siirretty.</p>
        <Link
          href="/"
          className="inline-block bg-[#6366F1] hover:bg-indigo-600 text-white font-semibold px-6 py-2.5 rounded-full [transition:background-color_150ms_var(--ease-out)]"
        >
          Palaa etusivulle
        </Link>
      </div>
    </div>
  )
}
