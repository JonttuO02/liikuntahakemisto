'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/supabaseSSR'
import { Map, AdvancedMarker } from '@vis.gl/react-google-maps'
import PaikkaKortti from '@/app/components/PaikkaKortti'
import DiagonaalKortti from '@/app/components/DiagonaalKortti'
import PaikkaSheet from '@/app/components/PaikkaSheet'
import SportPin from '@/app/components/SportPin'
import CalloutCard from '@/app/components/CalloutCard'
import type { Liikuntapaikka } from '@/lib/types'

const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID

type LinkData = {
  id: number
  link_type: string
  claim_status: string
  created_at: string
  rejection_reason: string | null
  businessEmail: string | null
  business_accounts: { company_name: string; role_in_company: string | null } | null
  liikuntapaikat: Liikuntapaikka | null
}

export default function AdminDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [link, setLink] = useState<LinkData | null>(null)
  const [loading, setLoading] = useState(true)

  // Approve/reject action state
  const [actionLoading, setActionLoading] = useState(false)
  const [rejectingOpen, setRejectingOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionDone, setActionDone] = useState(false)

  // Sijainti map state — toggles the CalloutCard popup on pin click
  const [showCallout, setShowCallout] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createBrowserSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/'); return }

      const res = await fetch(`/api/admin/applications/${params.id}`, {
        headers: { Authorization: 'Bearer ' + session.access_token },
      })
      if (!res.ok) { router.replace('/admin'); return }
      setLink(await res.json())
      setLoading(false)
    }
    load()
  }, [router, params.id])

  async function getToken() {
    const supabase = createBrowserSupabase()
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? ''
  }

  async function handleApprove() {
    if (!link) return
    setActionLoading(true)
    setActionError(null)
    const token = await getToken()
    const res = await fetch('/api/admin/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ link_id: link.id }),
    })
    setActionLoading(false)
    if (res.ok) {
      setActionDone(true)
      setLink(prev => prev ? { ...prev, claim_status: 'approved' } : prev)
    } else {
      setActionError('Toiminto epäonnistui. Yritä uudelleen.')
    }
  }

  async function handleRejectConfirm() {
    if (!link || !rejectReason.trim()) return
    setActionLoading(true)
    setActionError(null)
    const token = await getToken()
    const res = await fetch('/api/admin/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ link_id: link.id, reason: rejectReason.trim() }),
    })
    setActionLoading(false)
    if (res.ok) {
      setActionDone(true)
      setLink(prev => prev ? { ...prev, claim_status: 'rejected' } : prev)
      setRejectingOpen(false)
    } else {
      setActionError('Toiminto epäonnistui. Yritä uudelleen.')
    }
  }

  if (loading || !link) return null

  const paikka = link.liikuntapaikat
  const business = link.business_accounts

  return (
    <main className="min-h-screen bg-white px-4 py-16">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <a href="/admin" className="text-sm text-[rgba(17,17,17,0.45)] hover:text-[#111111] [transition:color_150ms]">
          ← Takaisin listaan
        </a>
        <h1 className="text-xl font-bold text-[#111111]">Hakemuksen tiedot</h1>

        {/* Applicant info */}
        <div className="glass rounded-2xl p-5 flex flex-col gap-3">
          <SectionLabel>Hakija</SectionLabel>
          <Field label="Yritys">{business?.company_name ?? '—'}</Field>
          <Field label="Rooli">{business?.role_in_company ?? '—'}</Field>
          <Field label="Sähköposti">{link.businessEmail ?? '—'}</Field>
          <Field label="Tyyppi">{link.link_type === 'claim' ? 'Haltuunotto' : 'Uusi paikka'}</Field>
          <Field label="Lähetetty">{new Date(link.created_at).toLocaleString('fi-FI')}</Field>
          <Field label="Tila">{link.claim_status}</Field>
        </div>

        {/* Approve / Reject actions — only shown when status is pending */}
        {link.claim_status === 'pending' && !actionDone && (
          <div className="glass rounded-2xl p-5 flex flex-col gap-3">
            <SectionLabel>Toiminnot</SectionLabel>
            {actionError && <p className="text-sm text-red-600">{actionError}</p>}
            {rejectingOpen ? (
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
                    onClick={handleRejectConfirm}
                    disabled={!rejectReason.trim() || actionLoading}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-full h-9 px-4 disabled:opacity-60 [transition:background-color_150ms]"
                  >
                    {actionLoading ? 'Hylätään...' : 'Vahvista hylkäys'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRejectingOpen(false); setRejectReason('') }}
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
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm rounded-full h-9 px-4 disabled:opacity-60 [transition:background-color_150ms]"
                >
                  {actionLoading ? 'Hyväksytään...' : 'Hyväksy'}
                </button>
                <button
                  type="button"
                  onClick={() => setRejectingOpen(true)}
                  disabled={actionLoading}
                  className="text-sm font-bold text-red-600 border border-red-200 hover:border-red-400 rounded-full h-9 px-4 disabled:opacity-60 [transition:border-color_150ms]"
                >
                  Hylkää
                </button>
              </div>
            )}
          </div>
        )}

        {/* Venue preview — same components as onboarding StepEsikatselu */}
        {paikka && (
          <>
            {paikka.latitude != null && paikka.longitude != null && (
              <div className="flex flex-col gap-2">
                <SectionLabel>Sijainti</SectionLabel>
                <div
                  className="relative rounded-2xl overflow-hidden border border-[rgba(0,0,0,0.07)]"
                  style={{ width: '100%', height: '320px' }}
                >
                  <Map
                    mapId={MAP_ID}
                    defaultCenter={{ lat: paikka.latitude, lng: paikka.longitude }}
                    defaultZoom={15}
                    gestureHandling="greedy"
                    style={{ width: '100%', height: '320px' }}
                  >
                    <AdvancedMarker position={{ lat: paikka.latitude, lng: paikka.longitude }}>
                      {showCallout ? (
                        <CalloutCard p={{ ...paikka, latitude: paikka.latitude, longitude: paikka.longitude }} />
                      ) : (
                        <div onClick={() => setShowCallout(true)}>
                          <SportPin laji={paikka.laji} />
                        </div>
                      )}
                    </AdvancedMarker>
                  </Map>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <SectionLabel>Listakortti</SectionLabel>
              <PaikkaKortti paikka={paikka} />
            </div>

            <div className="flex flex-col gap-2">
              <SectionLabel>Diagonaalikortti</SectionLabel>
              <DiagonaalKortti paikka={paikka} />
            </div>

            <div className="flex flex-col gap-2">
              <SectionLabel>Profiilisivu</SectionLabel>
              <PaikkaSheet
                paikka={paikka}
                preview={true}
                todo={false}
                onClose={() => {}}
                onToggleTodo={() => {}}
              />
            </div>
          </>
        )}
      </div>
    </main>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold uppercase tracking-widest text-[rgba(17,17,17,0.45)]">{children}</p>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="text-sm text-[rgba(17,17,17,0.45)] shrink-0 w-24">{label}:</span>
      <span className="text-sm text-[#111111]">{children}</span>
    </div>
  )
}
