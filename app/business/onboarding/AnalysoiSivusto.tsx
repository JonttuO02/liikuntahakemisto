'use client'

import { useState, useEffect, useRef } from 'react'
import { createBusinessBrowserClient } from '@/lib/supabase-business'
import type { BrandingResult } from '@/lib/branding/brandingResult'

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'checking' | 'url-input' | 'analyzing' | 'preview' | 'error' | 'timeout'

interface AnalysoiSivustoProps {
  paikkaId: number
  onConfirm: (brandingData: BrandingResult) => void
  onSkip: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getAuthToken(): Promise<string> {
  const supabase = createBusinessBrowserClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.access_token ?? ''
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner({ className = '' }: { className?: string }) {
  return (
    <div
      className={`w-6 h-6 rounded-full border-2 border-[rgba(17,17,17,0.12)] border-t-[#111111] animate-spin ${className}`}
      aria-hidden="true"
    />
  )
}

function LabelCaps({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-[rgba(17,17,17,0.45)]">
      {children}
    </p>
  )
}

function PrimaryButton({
  onClick,
  disabled,
  loading,
  children,
}: {
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm rounded-full h-10 px-6 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
    >
      {loading && <Spinner className="w-4 h-4" />}
      {children}
    </button>
  )
}

function MutedButton({
  onClick,
  children,
}: {
  onClick?: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-sm text-[rgba(17,17,17,0.45)] hover:text-[#111111] transition-colors"
    >
      {children}
    </button>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AnalysoiSivusto({ paikkaId, onConfirm, onSkip }: AnalysoiSivustoProps) {
  const [phase, setPhase] = useState<Phase>('checking')
  const [url, setUrl] = useState('')
  const [urlError, setUrlError] = useState<string | null>(null)
  const [brandingResult, setBrandingResult] = useState<BrandingResult | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // ── Logo/color selection state (D-07, D-12, D-13) ──────────────────────────
  const [selectedLogoUrl, setSelectedLogoUrl] = useState<string | null>(null)
  const [bgColor, setBgColor] = useState<string | null>(null)
  const [bgSource, setBgSource] = useState<'ai' | 'custom'>('ai')
  const [accentColor, setAccentColor] = useState<string | null>(null)
  const [accentSource, setAccentSource] = useState<'ai' | 'custom'>('ai')
  const [armedSlot, setArmedSlot] = useState<'tausta' | 'aksentti' | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savingSection, setSavingSection] = useState<'logo' | 'colors' | null>(null)
  const [customHexInput, setCustomHexInput] = useState('')
  const [customHexError, setCustomHexError] = useState<string | null>(null)
  const selectionInitialisedRef = useRef(false)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tryCountRef = useRef<number>(0)
  // Track whether we're still mounted (for ignoring stale async responses)
  const mountedRef = useRef(true)

  // ── Initialise selection state from brandingResult (D-13) ──────────────────
  useEffect(() => {
    if (!brandingResult || selectionInitialisedRef.current) return
    selectionInitialisedRef.current = true

    setSelectedLogoUrl(
      brandingResult.logo_candidates?.[0]?.url ?? brandingResult.logo_url ?? null
    )

    const colors = brandingResult.colors ?? []
    if (brandingResult.selected_background_color) {
      setBgColor(brandingResult.selected_background_color)
      setBgSource('ai')
    } else {
      const bgCandidate = colors.find(c => c.role === 'background')
      if (bgCandidate) {
        setBgColor(bgCandidate.hex)
        setBgSource('ai')
      }
    }

    if (brandingResult.selected_accent_color) {
      setAccentColor(brandingResult.selected_accent_color)
      setAccentSource('ai')
    } else {
      const accentCandidate = colors.find(c => c.role === 'accent')
      if (accentCandidate) {
        setAccentColor(accentCandidate.hex)
        setAccentSource('ai')
      }
    }
  }, [brandingResult])

  // ── Autosave PATCH helper (D-07) ────────────────────────────────────────────
  async function patchBranding(
    partial: {
      selected_logo_url?: string
      selected_background_color?: string
      background_color_source?: 'ai' | 'custom'
      selected_accent_color?: string
      accent_color_source?: 'ai' | 'custom'
    },
    section: 'logo' | 'colors'
  ): Promise<boolean> {
    setSavingSection(section)
    try {
      const token = await getAuthToken()
      const res = await fetch('/api/business/branding', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ paikka_id: paikkaId, ...partial }),
      })

      if (!res.ok) {
        setSaveError('Valinnan tallennus epäonnistui. Yritä uudelleen.')
        return false
      }

      setSaveError(null)
      return true
    } catch {
      setSaveError('Valinnan tallennus epäonnistui. Yritä uudelleen.')
      return false
    } finally {
      setSavingSection(null)
    }
  }

  function selectLogo(url: string) {
    setSelectedLogoUrl(url)
    patchBranding({ selected_logo_url: url }, 'logo')
  }

  function assignColorToSlot(slot: 'tausta' | 'aksentti', hex: string, source: 'ai' | 'custom') {
    if (slot === 'tausta') {
      setBgColor(hex)
      setBgSource(source)
      patchBranding({ selected_background_color: hex, background_color_source: source }, 'colors')
    } else {
      setAccentColor(hex)
      setAccentSource(source)
      patchBranding({ selected_accent_color: hex, accent_color_source: source }, 'colors')
    }
  }

  function handleSwatchClick(hex: string) {
    // Default the armed slot to 'tausta' if none is armed yet, so a single click works.
    const slot = armedSlot ?? 'tausta'
    assignColorToSlot(slot, hex, 'ai')
  }

  function handleCustomHexSubmit() {
    const trimmed = customHexInput.trim()
    if (!/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
      setCustomHexError('Anna värikoodi muodossa #rrggbb')
      return
    }
    setCustomHexError(null)
    const slot = armedSlot ?? 'tausta'
    assignColorToSlot(slot, trimmed, 'custom')
    setCustomHexInput('')
  }

  // ── On-mount check (checking phase) ────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true
    let cancelled = false

    async function checkStatus() {
      try {
        const token = await getAuthToken()
        const res = await fetch(`/api/business/analyze-website?paikka_id=${paikkaId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (cancelled) return

        if (!res.ok) {
          setPhase('url-input')
          return
        }

        const data: BrandingResult = await res.json()

        if (cancelled) return

        if (data.status === 'analyzed') {
          setBrandingResult(data)
          setPhase('preview')
        } else if (data.status === 'analyzing') {
          setPhase('analyzing')
        } else {
          // pending, failed, or unknown → start fresh
          setPhase('url-input')
        }
      } catch {
        if (!cancelled) setPhase('url-input')
      }
    }

    checkStatus()

    return () => {
      cancelled = true
      mountedRef.current = false
    }
  }, [])

  // ── Polling effect (analyzing phase) ───────────────────────────────────────

  useEffect(() => {
    if (phase !== 'analyzing') return

    // Reset try counter each time we enter 'analyzing'
    tryCountRef.current = 0

    async function poll() {
      tryCountRef.current += 1

      if (tryCountRef.current > 30) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        if (mountedRef.current) setPhase('timeout')
        return
      }

      try {
        const token = await getAuthToken()
        const res = await fetch(`/api/business/analyze-website?paikka_id=${paikkaId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!res.ok || !mountedRef.current) return

        const data: BrandingResult = await res.json()

        if (!mountedRef.current) return

        if (data.status === 'analyzed') {
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          setBrandingResult(data)
          setPhase('preview')
        } else if (data.status === 'failed') {
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          setPhase('error')
        }
        // Otherwise keep polling
      } catch {
        // Network error during poll — keep trying until cap reached
      }
    }

    intervalRef.current = setInterval(poll, 2000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [phase])

  // ── URL submit handler ──────────────────────────────────────────────────────

  async function handleSubmit() {
    let trimmed = url.trim()

    if (!trimmed) {
      setUrlError('Syötä sivuston osoite')
      return
    }

    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      trimmed = 'https://' + trimmed
      setUrl(trimmed)
    }

    setSubmitting(true)
    setUrlError(null)

    try {
      const token = await getAuthToken()
      const res = await fetch('/api/business/analyze-website', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url: trimmed, paikka_id: paikkaId }),
      })

      if (!res.ok) {
        if (res.status === 400) {
          setUrlError('Tarkista URL-osoite')
        } else if (res.status === 403) {
          setUrlError('Ei käyttöoikeutta')
        } else {
          setUrlError('Analyysi ei onnistunut. Yritä uudelleen.')
        }
        return
      }

      setPhase('analyzing')
    } catch {
      setUrlError('Analyysi ei onnistunut. Yritä uudelleen.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Rendering ───────────────────────────────────────────────────────────────

  return (
    <div className="glass rounded-2xl p-6 w-full max-w-xl mx-auto flex flex-col gap-6">

      {/* checking — spinner while initial GET is in flight */}
      {phase === 'checking' && (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      )}

      {/* url-input — URL field + action buttons */}
      {phase === 'url-input' && (
        <>
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold text-[#111111]">Analysoi sivustosi</h2>
            <p className="text-sm text-[rgba(17,17,17,0.45)]">
              Syötä yrityksesi verkkosivu — analysoimme brändivärit, logon, hinnaston ja
              aukioloajat automaattisesti.
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <input
              type="url"
              value={url}
              onChange={e => {
                setUrl(e.target.value)
                if (urlError) setUrlError(null)
              }}
              placeholder="https://example.fi"
              className="border border-[rgba(0,0,0,0.12)] rounded-lg h-10 px-3 text-sm text-[#111111] outline-none focus:border-[rgba(0,0,0,0.3)] w-full"
            />
            {urlError && (
              <p className="text-sm text-red-600" role="alert">
                {urlError}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[rgba(0,0,0,0.07)]">
            <MutedButton onClick={onSkip}>Ohita</MutedButton>
            <PrimaryButton onClick={handleSubmit} disabled={submitting} loading={submitting}>
              Analysoi sivusto
            </PrimaryButton>
          </div>
        </>
      )}

      {/* analyzing — spinner + label + ohita */}
      {phase === 'analyzing' && (
        <div className="flex flex-col items-center gap-4 py-4">
          <Spinner />
          <p className="text-sm text-[rgba(17,17,17,0.45)] text-center">
            Analysoidaan sivustoasi...
          </p>
          <MutedButton onClick={onSkip}>Ohita</MutedButton>
        </div>
      )}

      {/* error — analysis failed */}
      {phase === 'error' && (
        <>
          <p className="text-sm text-red-600">
            Analyysi epäonnistui. Tarkista URL-osoite ja yritä uudelleen.
          </p>
          <div className="flex items-center gap-3">
            <PrimaryButton onClick={() => setPhase('url-input')}>Yritä uudelleen</PrimaryButton>
            <MutedButton onClick={onSkip}>Ohita</MutedButton>
          </div>
        </>
      )}

      {/* timeout — analysis taking too long */}
      {phase === 'timeout' && (
        <>
          <p className="text-sm text-[rgba(17,17,17,0.45)]">
            Analyysi kestää odotettua kauemmin — yritä uudelleen tai jatka manuaalisesti.
          </p>
          <div className="flex items-center gap-3">
            <PrimaryButton onClick={() => setPhase('url-input')}>Yritä uudelleen</PrimaryButton>
            <MutedButton onClick={onSkip}>Ohita</MutedButton>
          </div>
        </>
      )}

      {/* preview — analysis results */}
      {phase === 'preview' && brandingResult && (
        <>
          <h2 className="text-xl font-bold text-[#111111]">Analyysin tulokset</h2>

          {/* Logo picker (ONBOARD-14) */}
          {brandingResult.logo_candidates && brandingResult.logo_candidates.length > 0 ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <LabelCaps>Logo</LabelCaps>
                {savingSection === 'logo' && <Spinner className="w-4 h-4" />}
              </div>
              {brandingResult.logo_candidates.length > 1 && (
                <p className="text-sm text-[rgba(17,17,17,0.45)]">
                  Valitse logo, jota käytetään profiilissasi
                </p>
              )}
              <div className="flex flex-row flex-wrap gap-2">
                {brandingResult.logo_candidates.map(candidate => {
                  const isSelected = selectedLogoUrl === candidate.url
                  return (
                    <button
                      key={candidate.url}
                      type="button"
                      onClick={() => selectLogo(candidate.url)}
                      className={`flex flex-col items-center gap-1 border rounded-lg p-2 transition-colors ${
                        isSelected
                          ? 'border-[#111111] ring-2 ring-[#111111]'
                          : 'border-[rgba(0,0,0,0.12)]'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={candidate.url}
                        alt=""
                        className="h-12 w-auto object-contain rounded"
                      />
                      <span className="text-[10px] text-[rgba(17,17,17,0.45)]">
                        {candidate.type}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <LabelCaps>Logo</LabelCaps>
              <p className="text-sm text-[rgba(17,17,17,0.45)]">
                Logoa ei löytynyt automaattisesti — voit lisätä sen myöhemmin velhon Mediat-vaiheessa
              </p>
            </div>
          )}

          {/* Color picker (ONBOARD-15) */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <LabelCaps>Brändivärit</LabelCaps>
              {savingSection === 'colors' && <Spinner className="w-4 h-4" />}
            </div>
            <p className="text-sm text-[rgba(17,17,17,0.45)]">
              Valitse taustaväri ja aksenttiväri löydetyistä sävyistä, tai syötä oma värikoodi
            </p>

            {brandingResult.colors && brandingResult.colors.length === 0 && (
              <p className="text-sm text-[rgba(17,17,17,0.45)]">
                Värejä ei löytynyt — syötä omat värikoodit alla
              </p>
            )}

            {brandingResult.colors && brandingResult.colors.length > 0 && (
              <div className="flex flex-row flex-wrap gap-2">
                {brandingResult.colors.slice(0, 6).map(color => {
                  const isSelected = bgColor === color.hex || accentColor === color.hex
                  return (
                    <button
                      key={color.hex}
                      type="button"
                      onClick={() => handleSwatchClick(color.hex)}
                      className="p-1"
                      title={color.hex}
                      aria-label={color.hex}
                    >
                      <span
                        className={`block w-8 h-8 rounded-full border border-[rgba(0,0,0,0.07)] ${
                          isSelected ? 'ring-2 ring-[#111111] ring-offset-2' : ''
                        }`}
                        style={{ backgroundColor: color.hex }}
                      />
                    </button>
                  )
                })}
              </div>
            )}

            <div className="flex flex-row gap-3">
              <button
                type="button"
                onClick={() => setArmedSlot('tausta')}
                className={`flex items-center gap-2 border rounded-lg p-2 flex-1 transition-colors ${
                  armedSlot === 'tausta' ? 'border-[#111111] ring-2 ring-[#111111]' : 'border-[rgba(0,0,0,0.12)]'
                }`}
              >
                <span
                  className="w-6 h-6 rounded-full border border-[rgba(0,0,0,0.07)] flex-shrink-0"
                  style={{ backgroundColor: bgColor ?? '#ffffff' }}
                />
                <span className="flex flex-col items-start">
                  <span className={`text-sm ${armedSlot === 'tausta' ? 'font-bold text-[#111111]' : 'text-[rgba(17,17,17,0.45)]'}`}>
                    Tausta
                  </span>
                  {bgColor && (
                    <span className="text-sm text-[rgba(17,17,17,0.45)]">
                      {bgColor} {bgSource === 'custom' && '(oma)'}
                    </span>
                  )}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setArmedSlot('aksentti')}
                className={`flex items-center gap-2 border rounded-lg p-2 flex-1 transition-colors ${
                  armedSlot === 'aksentti' ? 'border-[#111111] ring-2 ring-[#111111]' : 'border-[rgba(0,0,0,0.12)]'
                }`}
              >
                <span
                  className="w-6 h-6 rounded-full border border-[rgba(0,0,0,0.07)] flex-shrink-0"
                  style={{ backgroundColor: accentColor ?? '#ffffff' }}
                />
                <span className="flex flex-col items-start">
                  <span className={`text-sm ${armedSlot === 'aksentti' ? 'font-bold text-[#111111]' : 'text-[rgba(17,17,17,0.45)]'}`}>
                    Aksentti
                  </span>
                  {accentColor ? (
                    <span className="text-sm text-[rgba(17,17,17,0.45)]">
                      {accentColor} {accentSource === 'custom' && '(oma)'}
                    </span>
                  ) : (brandingResult.colors?.length ?? 0) === 1 ? (
                    <span className="text-sm text-[rgba(17,17,17,0.45)]">Valitse aksenttiväri</span>
                  ) : null}
                </span>
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex flex-row gap-2">
                <input
                  type="text"
                  value={customHexInput}
                  onChange={e => {
                    setCustomHexInput(e.target.value)
                    if (customHexError) setCustomHexError(null)
                  }}
                  placeholder="#rrggbb"
                  aria-label="Oma värikoodi"
                  className="border border-[rgba(0,0,0,0.12)] rounded-lg h-10 px-3 text-sm text-[#111111] outline-none focus:border-[rgba(0,0,0,0.3)] flex-1"
                />
                <MutedButton onClick={handleCustomHexSubmit}>Käytä</MutedButton>
              </div>
              {customHexError && (
                <p className="text-sm text-red-600" role="alert">
                  {customHexError}
                </p>
              )}
            </div>

            {saveError && (
              <p className="text-sm text-red-600" role="alert">
                {saveError}
              </p>
            )}
          </div>

          {/* Prices */}
          <div className="flex flex-col gap-2">
            <LabelCaps>Hinnat</LabelCaps>
            {brandingResult.raw_analysis?.prices && brandingResult.raw_analysis.prices.length > 0 ? (
              <ul className="flex flex-col gap-1">
                {brandingResult.raw_analysis.prices.map((price, i) => (
                  <li key={i} className="text-sm text-[#111111]">
                    {price.label}: {price.price}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[rgba(17,17,17,0.45)]">Hintoja ei löydetty automaattisesti</p>
            )}
          </div>

          {/* Opening hours */}
          <div className="flex flex-col gap-2">
            <LabelCaps>Aukioloajat</LabelCaps>
            {brandingResult.raw_analysis?.opening_hours &&
            brandingResult.raw_analysis.opening_hours.length > 0 ? (
              <dl className="flex flex-col gap-1">
                {brandingResult.raw_analysis.opening_hours.map((entry, i) => (
                  <div key={i} className="text-sm text-[#111111]">
                    {entry.day}: {entry.open}–{entry.close}
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-[rgba(17,17,17,0.45)]">Aukioloaikoja ei löydetty automaattisesti</p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-[rgba(0,0,0,0.07)]">
            <button
              type="button"
              onClick={() => {
                setBrandingResult(null)
                setPhase('url-input')
              }}
              className="text-sm text-[rgba(17,17,17,0.45)] underline-offset-2 hover:underline hover:text-[#111111] transition-colors"
            >
              Analysoi uudelleen
            </button>
            <PrimaryButton onClick={() => onConfirm(brandingResult)}>
              Jatka velhoon →
            </PrimaryButton>
          </div>
        </>
      )}
    </div>
  )
}
