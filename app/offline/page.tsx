import { WifiOff } from 'lucide-react'

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 pb-16">
      <div className="text-center max-w-sm">
        <div className="glass w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <WifiOff className="w-7 h-7 text-[rgba(17,17,17,0.4)]" />
        </div>
        <h1 className="font-serif text-2xl font-bold text-[#111111] mb-2">Ei verkkoyhteyttä.</h1>
        <p className="text-[rgba(17,17,17,0.45)] mb-8">Tarkista verkkoyhteys ja yritä uudelleen.</p>
        <a
          href="/?nakyma=lista"
          className="inline-block bg-[#111111] hover:bg-[#333333] text-white font-bold px-6 py-2.5 rounded-full [transition:background-color_150ms_var(--ease-out)]"
        >
          Yritä uudelleen
        </a>
      </div>
    </div>
  )
}
