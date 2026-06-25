'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/supabaseSSR'
import AdminApplicationList from './AdminApplicationList'

type Application = {
  id: number
  paikka_id: number
  link_type: string
  claim_status: string
  created_at: string
  business_accounts: { role_in_company: string | null; user_id: string; companies: { name: string } | null } | null
  liikuntapaikat: { nimi: string; osoite: string; kaupunki: string } | null
}

export default function AdminPage() {
  const router = useRouter()
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createBrowserSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/'); return }

      const res = await fetch('/api/admin/applications', {
        headers: { Authorization: 'Bearer ' + session.access_token },
      })
      if (!res.ok) { router.replace('/'); return }
      setApplications(await res.json())
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) return null

  return (
    <main className="min-h-screen bg-white px-4 py-16">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <h1 className="text-xl font-bold text-[#111111]">Admin — Odottavat hakemukset</h1>
        <AdminApplicationList applications={applications} />
      </div>
    </main>
  )
}
