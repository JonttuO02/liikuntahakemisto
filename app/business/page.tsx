import { getTranslations } from 'next-intl/server'

export default async function BusinessPage() {
  const t = await getTranslations('Business')

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-xl font-bold text-[#111111]">{t('dashboardTitle')}</h1>
        <p className="text-sm text-[rgba(17,17,17,0.45)]">{t('dashboardComingSoon')}</p>
      </div>
    </div>
  )
}
