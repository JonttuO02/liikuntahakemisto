import Link from 'next/link'

export default function SuosikitPage() {
  return (
    <div className="min-h-screen bg-indigo-50 flex flex-col items-center justify-center px-4 pb-16">
      <div className="text-5xl mb-4">❤️</div>
      <h1 className="text-2xl font-bold text-indigo-950 mb-2">Suosikit</h1>
      <p className="text-gray-500 text-center mb-8">
        Suosikkitoiminto on tulossa pian.
      </p>
      <Link
        href="/"
        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 rounded-full transition-colors"
      >
        Takaisin hakemistoon
      </Link>
    </div>
  )
}
