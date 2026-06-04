import Link from 'next/link'
import { SearchX } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export default async function NotFound() {
  const t = await getTranslations('NotFound')

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 pb-16">
      <div className="text-center max-w-sm">
        <div className="glass w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <SearchX className="w-7 h-7 text-[rgba(17,17,17,0.4)]" />
        </div>
        <h1 className="font-serif text-2xl font-bold text-[#111111] mb-2">{t('title')}</h1>
        <p className="text-[rgba(17,17,17,0.45)] mb-8">{t('description')}</p>
        <Link
          href="/"
          className="inline-block bg-[#111111] hover:bg-[#333333] text-white font-semibold px-6 py-2.5 rounded-full [transition:background-color_150ms_var(--ease-out)]"
        >
          {t('backHome')}
        </Link>
      </div>
    </div>
  )
}
