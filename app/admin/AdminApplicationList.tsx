'use client'

import { useState } from 'react'
import { createBrowserSupabase } from '@/lib/supabaseSSR'
import Link from 'next/link'

type Application = {
  id: number
  paikka_id: number
  link_type: string
  claim_status: string
  created_at: string
  business_accounts: { company_name: string; role_in_company: string | null; user_id: string } | null
  liikuntapaikat: { nimi: string; osoite: string; kaupunki: string } | null
}

export default function AdminApplicationList({ applications: initial }: { applications: Application[] }) {
  const [applications, setApplications] = useState(initial)
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [rejectingId, setRejectingId] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function getToken() {
    const supabase = createBrowserSupabase()
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? ''
  }

  async function handleApprove(linkId: number) {
    setLoadingId(linkId)
    setError(null)
    const token = await getToken()
    const res = await fetch('/api/admin/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ link_id: linkId }),
    })
    setLoadingId(null)
    if (res.ok) {
      setApplications(prev => prev.filter(a => a.id !== linkId))
    } else {
      setError('Toiminto epäonnistui. Yritä uudelleen.')
    }
  }

  async function handleRejectConfirm(linkId: number) {
    if (!rejectReason.trim()) return
    setLoadingId(linkId)
    setError(null)
    const token = await getToken()
    const res = await fetch('/api/admin/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ link_id: linkId, reason: rejectReason.trim() }),
    })
    setLoadingId(null)
    if (res.ok) {
      setApplications(prev => prev.filter(a => a.id !== linkId))
      setRejectingId(null)
      setRejectReason('')
    } else {
      setError('Toiminto epäonnistui. Yritä uudelleen.')
    }
  }

  if (applications.length === 0) {
    return <p className="text-sm text-[rgba(17,17,17,0.45)]">Ei odottavia hakemuksia.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {applications.map(app => (
        <div key={app.id} className="glass rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-bold text-[#111111]">
                {app.business_accounts?.company_name ?? '—'}
              </span>
              {app.business_accounts?.role_in_company && (
                <span className="text-xs text-[rgba(17,17,17,0.45)]">{app.business_accounts.role_in_company}</span>
              )}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full shrink-0 bg-amber-100 text-amber-700">
              {app.link_type === 'claim' ? 'Haltuunotto' : 'Uusi paikka'}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-[#111111]">{app.liikuntapaikat?.nimi ?? `Paikka ${app.paikka_id}`}</span>
            <span className="text-xs text-[rgba(17,17,17,0.45)]">
              {app.liikuntapaikat?.osoite}, {app.liikuntapaikat?.kaupunki}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-[rgba(17,17,17,0.45)]">
              {new Date(app.created_at).toLocaleDateString('fi-FI')}
            </span>
            <Link href={`/admin/${app.id}`} className="text-xs font-bold text-[#111111] underline hover:no-underline">
              Tarkastele →
            </Link>
          </div>
          {rejectingId === app.id ? (
            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Syy hylkäykselle (pakollinen)"
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="border border-[rgba(0,0,0,0.12)] rounded-lg h-10 px-3 text-sm text-[#111111] placeholder:text-[rgba(17,17,17,0.35)] bg-white focus:outline-none focus:border-[rgba(0,0,0,0.25)] w-full"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleRejectConfirm(app.id)}
                  disabled={!rejectReason.trim() || loadingId === app.id}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-full h-9 px-4 disabled:opacity-60 [transition:background-color_150ms]"
                >
                  {loadingId === app.id ? 'Hylätään...' : 'Vahvista hylkäys'}
                </button>
                <button
                  type="button"
                  onClick={() => { setRejectingId(null); setRejectReason('') }}
                  className="text-sm text-[rgba(17,17,17,0.45)] hover:text-[#111111] [transition:color_150ms]"
                >
                  Peruuta
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleApprove(app.id)}
                disabled={loadingId === app.id}
                className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm rounded-full h-9 px-4 disabled:opacity-60 [transition:background-color_150ms]"
              >
                {loadingId === app.id ? 'Hyväksytään...' : 'Hyväksy'}
              </button>
              <button
                type="button"
                onClick={() => setRejectingId(app.id)}
                disabled={loadingId === app.id}
                className="text-sm font-bold text-red-600 border border-red-200 hover:border-red-400 rounded-full h-9 px-4 disabled:opacity-60 [transition:border-color_150ms]"
              >
                Hylkää
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
