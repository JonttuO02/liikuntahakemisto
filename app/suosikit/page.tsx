import Link from 'next/link'
import { Heart } from 'lucide-react'

export default function SuosikitPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 pb-16">
      <div className="glass w-16 h-16 rounded-2xl flex items-center justify-center mb-5">
        <Heart className="w-7 h-7 text-[rgba(17,17,17,0.5)]" />
      </div>
      <h1 className="font-serif text-2xl font-bold text-[#111111] mb-2">Suosikit</h1>
      <p className="text-[rgba(17,17,17,0.45)] text-center mb-8 max-w-xs">
        Suosikkitoiminto on tulossa pian.
      </p>
      <Link
        href="/"
        className="bg-[#111111] hover:bg-[#333333] text-white font-semibold px-6 py-2.5 rounded-full [transition:background-color_150ms_var(--ease-out)]"
      >
        Takaisin hakemistoon
      </Link>
    </div>
  )
}
