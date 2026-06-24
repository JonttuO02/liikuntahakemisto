'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/supabaseSSR'
import { Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps'
import DiagonaalKortti from '@/app/components/DiagonaalKortti'
import PaikkaSheet from '@/app/components/PaikkaSheet'
import SportPin from '@/app/components/SportPin'
import CalloutCard from '@/app/components/CalloutCard'
import type { Liikuntapaikka } from '@/lib/types'

// The camera target below is shifted up by this many pixels (via the map projection, not
// a flat-degrees approximation) so the card's visual midpoint, not the venue's raw
// coordinate, ends up centered. CalloutCard's own measured offsetHeight is 171px, not
// the ~206px this value would imply if read as an exact half-height — this was tuned by
// live visual testing during the human-verify checkpoint, not derived precisely from
// CalloutCard's CSS, so treat it as an empirical constant rather than literal geometry.
const CALLOUT_CARD_HALF_HEIGHT_PX = 103

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

  // Sijainti map state — zoom-driven pin/card switch, mirrors Etusivu.tsx
  const [zoomLevel, setZoomLevel] = useState(15)
  const [autoZoomTarget, setAutoZoomTarget] = useState<{ lat: number; lng: number } | null>(null)

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
            {paikka.latitude != null && paikka.longitude != null && (() => {
              // Narrowed once here so every closure below (including AdminCardZoom's
              // click handler) captures a proven-non-null primitive instead of re-reading
              // the nullable `paikka.latitude`/`longitude` fields through a fresh closure.
              const lat = paikka.latitude
              const lng = paikka.longitude
              return (
              <div className="flex flex-col gap-2">
                <SectionLabel>Sijainti</SectionLabel>
                <div
                  className="relative rounded-2xl border border-[rgba(0,0,0,0.07)]"
                  style={{ width: '100%', height: '320px', clipPath: 'inset(0 round 16px)' }}
                >
                  <Map
                    mapId={MAP_ID}
                    defaultCenter={{ lat, lng }}
                    defaultZoom={15}
                    disableDefaultUI
                    gestureHandling="greedy"
                    style={{ width: '100%', height: '320px' }}
                    onCameraChanged={ev => setZoomLevel(Math.round(ev.detail.zoom))}
                  >
                    <DismissOnMapClick />
                    <AdminCardZoom target={autoZoomTarget} onComplete={() => setAutoZoomTarget(null)} />
                    <AdvancedMarker position={{ lat, lng }}>
                      <div style={{ position: 'relative', width: 0, height: 0 }}>
                        {zoomLevel < 16 ? (
                          <div
                            style={{ position: 'absolute', bottom: 0, left: 0, transform: 'translateX(-50%)' }}
                            onClick={() => setAutoZoomTarget({ lat, lng })}>
                            <SportPin laji={paikka.laji} />
                          </div>
                        ) : (
                          <div style={{ position: 'absolute', bottom: 0, left: 0, transform: 'translateX(-50%)' }}>
                            {/* Extra wrapper div, matching Etusivu.tsx's nesting depth (its layoutId
                                motion.div) — omitting this level changes how the filter: drop-shadow
                                composites relative to the marker's own transform, making the shadow
                                visibly larger/squarer than on the main map despite identical CSS. */}
                            <div>
                              <CalloutCard p={{ ...paikka, latitude: lat, longitude: lng }} />
                            </div>
                          </div>
                        )}
                      </div>
                    </AdvancedMarker>
                  </Map>
                </div>
              </div>
              )
            })()}

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

// Clicking the map while the CalloutCard is showing zooms back out to the pin view —
// otherwise the only way back is manually scrolling/pinching below zoom 16. Registered
// via the real map instance (not a React click prop) so it drives the actual camera zoom,
// which then naturally re-syncs `zoomLevel` through the existing onCameraChanged handler.
function DismissOnMapClick() {
  const map = useMap()
  useEffect(() => {
    if (!map) return
    const listener = map.addListener('click', () => {
      if ((map.getZoom() ?? 0) >= 16) map.setZoom(15)
    })
    return () => listener.remove()
  }, [map])
  return null
}

// Single combined zoom+center animation for the admin Sijainti map. Unlike the shared
// MapAutoZoom (used on the main map, which zooms to the venue's raw coordinate), this
// computes an adjusted target up front — offset by CALLOUT_CARD_HALF_HEIGHT_PX via the
// map's own projection — so the camera animates directly to the CalloutCard's centered
// position in one motion, instead of zooming to the venue point and then panning afterward.
function AdminCardZoom({ target, onComplete }: { target: { lat: number; lng: number } | null; onComplete: () => void }) {
  const map = useMap()
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete
  useEffect(() => {
    if (!map || !target) return
    const fromCenter = map.getCenter()
    const fromZoom = map.getZoom() ?? 14
    const projection = map.getProjection()
    const toZoom = Math.max(fromZoom, 16)
    // Projection can be transiently unavailable (e.g. mid tile-load) — fall back to an
    // uncentered zoom rather than silently dropping the click with no visual feedback.
    if (!fromCenter || !projection) {
      map.panTo(target)
      map.setZoom(toZoom)
      onCompleteRef.current()
      return
    }
    const scale = Math.pow(2, toZoom)
    const venuePoint = projection.fromLatLngToPoint(new google.maps.LatLng(target.lat, target.lng))
    if (!venuePoint) { map.panTo(target); map.setZoom(toZoom); onCompleteRef.current(); return }
    const shiftedPoint = new google.maps.Point(venuePoint.x, venuePoint.y - CALLOUT_CARD_HALF_HEIGHT_PX / scale)
    const adjusted = projection.fromPointToLatLng(shiftedPoint)
    if (!adjusted) { map.panTo(target); map.setZoom(toZoom); onCompleteRef.current(); return }
    const toLat = adjusted.lat()
    const toLng = adjusted.lng()
    const fromLat = fromCenter.lat()
    const fromLng = fromCenter.lng()
    const duration = 700
    const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
    let start: number | null = null
    let raf: number
    function step(ts: number) {
      if (!start) start = ts
      const t = Math.min((ts - start) / duration, 1)
      const e = ease(t)
      map!.moveCamera({
        center: { lat: fromLat + (toLat - fromLat) * e, lng: fromLng + (toLng - fromLng) * e },
        zoom: fromZoom + (toZoom - fromZoom) * e,
      })
      if (t < 1) raf = requestAnimationFrame(step)
      else onCompleteRef.current()
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [map, target])
  return null
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
