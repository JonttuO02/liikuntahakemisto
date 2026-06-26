'use client'

import { useState, useEffect, useRef } from 'react'
import { Check } from 'lucide-react'
import { createBusinessBrowserClient } from '@/lib/supabase-business'
import type { BrandingResult } from '@/lib/branding/brandingResult'
import ContrastSafeLogo from '@/app/components/ContrastSafeLogo'
import { useLivePreview } from '@/lib/livePreview/LivePreviewContext'
import { LajiPicker } from './AnalysoiSivusto'
import { lajiKonfig } from '@/lib/lajit'

export interface BrandingSelections {
  logoUrl: string | null
  gallery: string[]
  laji: string | null
  bgColor: string | null
  accentColor: string | null
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function Spinner({ className = '' }: { className?: string }) {
  return (
    <div
      className={`w-4 h-4 rounded-full border-2 border-[rgba(17,17,17,0.12)] border-t-[#111111] animate-spin ${className}`}
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

// ─── StepBrandingPick ─────────────────────────────────────────────────────────

export default function StepBrandingPick({
  brandingData,
  paikkaId,
  onNext,
}: {
  brandingData: BrandingResult
  paikkaId: number
  onNext: (selections: BrandingSelections) => Promise<void>
}) {
  const { dispatch } = useLivePreview()

  // ── Selection state ──────────────────────────────────────────────────────────
  const [selectedLogoUrl, setSelectedLogoUrl] = useState<string | null>(null)
  const [selectedGallery, setSelectedGallery] = useState<string[]>([])
  const [bgColor, setBgColor] = useState<string | null>(null)
  const [bgSource, setBgSource] = useState<'ai' | 'custom'>('ai')
  const [accentColor, setAccentColor] = useState<string | null>(null)
  const [accentSource, setAccentSource] = useState<'ai' | 'custom'>('ai')
  const [armedSlot, setArmedSlot] = useState<'tausta' | 'aksentti' | null>(null)
  const [savingSection, setSavingSection] = useState<'logo' | 'colors' | 'gallery' | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [customHexInput, setCustomHexInput] = useState('')
  const [customHexError, setCustomHexError] = useState<string | null>(null)

  // ── Laji state ───────────────────────────────────────────────────────────────
  const [lajiState, setLajiState] = useState<'suggested' | 'confirmed' | 'unconfirmed'>('unconfirmed')
  const [suggestedLajiKey, setSuggestedLajiKey] = useState<string | null>(null)
  const [confirmedLaji, setConfirmedLaji] = useState<string | null>(null)
  const [lajiPickerOpen, setLajiPickerOpen] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const initialisedRef = useRef(false)

  // ── Initialize from brandingData on mount ────────────────────────────────────
  useEffect(() => {
    if (initialisedRef.current) return
    initialisedRef.current = true

    setSelectedLogoUrl(
      brandingData.selected_logo_url ??
      brandingData.logo_candidates?.[0]?.url ??
      brandingData.logo_url ??
      null
    )
    setSelectedGallery((brandingData.image_urls ?? []).slice(0, 5))

    const colors = brandingData.colors ?? []
    if (brandingData.selected_background_color) {
      setBgColor(brandingData.selected_background_color)
    } else {
      const bg = colors.find(c => c.role === 'background')
      if (bg) setBgColor(bg.hex)
    }
    if (brandingData.selected_accent_color) {
      setAccentColor(brandingData.selected_accent_color)
    } else {
      const accent = colors.find(c => c.role === 'accent')
      if (accent) setAccentColor(accent.hex)
    }

    const laji = brandingData.suggested_laji
    if (laji && Object.prototype.hasOwnProperty.call(lajiKonfig, laji)) {
      setSuggestedLajiKey(laji)
      setLajiState('suggested')
    }
  }, [brandingData])

  // ── Mirror selections to live preview ────────────────────────────────────────
  useEffect(() => {
    dispatch({ type: 'SET_MEDIA', payload: { logo: selectedLogoUrl } })
  }, [selectedLogoUrl, dispatch])

  useEffect(() => {
    dispatch({ type: 'SET_MEDIA', payload: { photos: selectedGallery } })
  }, [selectedGallery, dispatch])

  // ── Autosave PATCH ───────────────────────────────────────────────────────────
  async function patchBranding(
    partial: {
      selected_logo_url?: string
      selected_background_color?: string
      background_color_source?: 'ai' | 'custom'
      selected_accent_color?: string
      accent_color_source?: 'ai' | 'custom'
      image_urls?: string[]
    },
    section: 'logo' | 'colors' | 'gallery'
  ) {
    setSavingSection(section)
    try {
      const supabase = createBusinessBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token ?? ''
      const res = await fetch('/api/business/branding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ paikka_id: paikkaId, ...partial }),
      })
      if (!res.ok) setSaveError('Valinnan tallennus epäonnistui.')
      else setSaveError(null)
    } catch {
      setSaveError('Valinnan tallennus epäonnistui.')
    } finally {
      setSavingSection(null)
    }
  }

  // ── Handlers ─────────────────────────────────────────────────────────────────
  function selectLogo(url: string) {
    setSelectedLogoUrl(url)
    patchBranding({ selected_logo_url: url }, 'logo')
  }

  function assignColorToSlot(slot: 'tausta' | 'aksentti', hex: string, source: 'ai' | 'custom') {
    if (slot === 'tausta') {
      setBgColor(hex)
      setBgSource(source)
      dispatch({ type: 'SET_BRAND_COLORS', payload: { bgColor: hex } })
      patchBranding({ selected_background_color: hex, background_color_source: source }, 'colors')
    } else {
      setAccentColor(hex)
      setAccentSource(source)
      dispatch({ type: 'SET_BRAND_COLORS', payload: { accentColor: hex } })
      patchBranding({ selected_accent_color: hex, accent_color_source: source }, 'colors')
    }
  }

  function handleSwatchClick(hex: string) {
    assignColorToSlot(armedSlot ?? 'tausta', hex, 'ai')
  }

  function handleCustomHexSubmit() {
    const trimmed = customHexInput.trim()
    if (!/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
      setCustomHexError('Anna värikoodi muodossa #rrggbb')
      return
    }
    setCustomHexError(null)
    assignColorToSlot(armedSlot ?? 'tausta', trimmed, 'custom')
    setCustomHexInput('')
  }

  function toggleGalleryImage(url: string) {
    setSelectedGallery(prev => {
      const isSelected = prev.includes(url)
      let next: string[]
      if (isSelected) {
        next = prev.filter(u => u !== url)
      } else {
        if (prev.length >= 5) return prev
        next = [...prev, url]
      }
      patchBranding({ image_urls: next }, 'gallery')
      return next
    })
  }

  function handleVahvistaLaji() {
    if (!suggestedLajiKey) return
    setConfirmedLaji(suggestedLajiKey)
    setLajiState('confirmed')
  }

  function handleLajiPick(value: string) {
    setConfirmedLaji(value)
    setLajiState('confirmed')
    setLajiPickerOpen(false)
  }

  async function handleNext() {
    setSubmitting(true)
    await onNext({ logoUrl: selectedLogoUrl, gallery: selectedGallery, laji: confirmedLaji, bgColor, accentColor })
    setSubmitting(false)
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="glass rounded-2xl p-6 flex flex-col gap-6">
      <h2 className="text-xl font-bold text-[#111111]">Analyysin tulokset</h2>

      {/* Logo picker */}
      {brandingData.logo_candidates && brandingData.logo_candidates.length > 0 ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <LabelCaps>Logo</LabelCaps>
            {savingSection === 'logo' && <Spinner />}
          </div>
          {brandingData.logo_candidates.length > 1 && (
            <p className="text-sm text-[rgba(17,17,17,0.45)]">
              Valitse logo, jota käytetään profiilissasi
            </p>
          )}
          <div className="flex flex-row flex-wrap gap-2">
            {brandingData.logo_candidates.map(candidate => {
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
                  <ContrastSafeLogo src={candidate.url} className="w-20" />
                  <span className="text-[10px] text-[rgba(17,17,17,0.45)]">{candidate.type}</span>
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <LabelCaps>Logo</LabelCaps>
          <p className="text-sm text-[rgba(17,17,17,0.45)]">
            Logoa ei löytynyt automaattisesti — voit lisätä sen myöhemmin Mediat-vaiheessa
          </p>
        </div>
      )}

      {/* Color picker */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <LabelCaps>Brändivärit</LabelCaps>
          {savingSection === 'colors' && <Spinner />}
        </div>
        <p className="text-sm text-[rgba(17,17,17,0.45)]">
          Valitse taustaväri ja aksenttiväri löydetyistä sävyistä, tai syötä oma värikoodi
        </p>

        {(brandingData.colors?.length ?? 0) === 0 && (
          <p className="text-sm text-[rgba(17,17,17,0.45)]">
            Värejä ei löytynyt — syötä omat värikoodit alla
          </p>
        )}

        {brandingData.colors && brandingData.colors.length > 0 && (
          <div className="flex flex-row flex-wrap gap-2">
            {brandingData.colors.slice(0, 6).map(color => {
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
                  {bgColor}{bgSource === 'custom' ? ' (oma)' : ''}
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
                  {accentColor}{accentSource === 'custom' ? ' (oma)' : ''}
                </span>
              ) : (brandingData.colors?.length ?? 0) === 1 ? (
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
              onChange={e => { setCustomHexInput(e.target.value); if (customHexError) setCustomHexError(null) }}
              placeholder="#rrggbb"
              aria-label="Oma värikoodi"
              className="border border-[rgba(0,0,0,0.12)] rounded-lg h-10 px-3 text-sm text-[#111111] outline-none focus:border-[rgba(0,0,0,0.3)] flex-1"
            />
            <button
              type="button"
              onClick={handleCustomHexSubmit}
              className="text-sm text-[rgba(17,17,17,0.45)] hover:text-[#111111] transition-colors"
            >
              Käytä
            </button>
          </div>
          {customHexError && (
            <p className="text-sm text-red-600" role="alert">{customHexError}</p>
          )}
        </div>

        {saveError && <p className="text-sm text-red-600" role="alert">{saveError}</p>}
      </div>

      {/* Gallery picker */}
      {brandingData.image_urls && brandingData.image_urls.length > 0 ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <LabelCaps>Galleria</LabelCaps>
            {savingSection === 'gallery' && <Spinner />}
          </div>
          <p className="text-sm text-[rgba(17,17,17,0.45)]">Valitse enintään 5 kuvaa galleriaan</p>
          <div className="grid grid-cols-4 gap-2">
            {brandingData.image_urls.slice(0, 8).map(url => {
              const isSelected = selectedGallery.includes(url)
              const disabled = !isSelected && selectedGallery.length >= 5
              return (
                <button
                  key={url}
                  type="button"
                  onClick={() => toggleGalleryImage(url)}
                  disabled={disabled}
                  aria-pressed={isSelected}
                  className={`relative ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full aspect-square object-cover rounded-lg" />
                  {isSelected && (
                    <span className="absolute -top-1 -right-1 bg-[#111111] text-white rounded-full w-5 h-5 flex items-center justify-center" aria-hidden="true">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <p className="text-sm text-[rgba(17,17,17,0.45)]">{selectedGallery.length}/5 valittu</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <LabelCaps>Galleria</LabelCaps>
          <p className="text-sm text-[rgba(17,17,17,0.45)]">
            Kuvia ei löytynyt automaattisesti — voit lisätä kuvia myöhemmin Mediat-vaiheessa
          </p>
        </div>
      )}

      {/* Laji picker */}
      <div className="flex flex-col gap-2">
        <LabelCaps>Laji</LabelCaps>
        {lajiPickerOpen ? (
          <LajiPicker value={confirmedLaji} onPick={handleLajiPick} onCancel={() => setLajiPickerOpen(false)} />
        ) : (
          <>
            {lajiState === 'suggested' && (
              <>
                <p className="text-sm font-bold text-[#111111]">
                  Ehdotettu laji: {suggestedLajiKey ? lajiKonfig[suggestedLajiKey]?.label : ''}
                </p>
                <div className="flex flex-row gap-2">
                  <button
                    type="button"
                    onClick={handleVahvistaLaji}
                    className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm rounded-full h-10 px-6 transition-colors"
                  >
                    Vahvista
                  </button>
                  <button
                    type="button"
                    onClick={() => setLajiPickerOpen(true)}
                    className="text-sm text-[rgba(17,17,17,0.45)] hover:text-[#111111] transition-colors"
                  >
                    Vaihda
                  </button>
                </div>
              </>
            )}
            {lajiState === 'confirmed' && (
              <>
                <p className="text-sm font-bold text-[#111111]">
                  Laji: {confirmedLaji ? (lajiKonfig[confirmedLaji]?.label ?? confirmedLaji) : ''}
                </p>
                <button
                  type="button"
                  onClick={() => setLajiPickerOpen(true)}
                  className="text-sm text-[rgba(17,17,17,0.45)] hover:text-[#111111] transition-colors w-fit"
                >
                  Vaihda
                </button>
              </>
            )}
            {lajiState === 'unconfirmed' && (
              <>
                <p className="text-sm text-[rgba(17,17,17,0.45)]">
                  Lajia ei tunnistettu automaattisesti — valitse lajikategoria
                </p>
                <button
                  type="button"
                  onClick={() => setLajiPickerOpen(true)}
                  className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm rounded-full h-10 px-6 transition-colors w-fit"
                >
                  Valitse laji
                </button>
              </>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end pt-4 border-t border-[rgba(0,0,0,0.07)]">
        <button
          type="button"
          onClick={handleNext}
          disabled={submitting}
          className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm rounded-full h-10 px-6 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
        >
          {submitting && <Spinner />}
          {submitting ? 'Tallennetaan...' : 'Jatka →'}
        </button>
      </div>
    </div>
  )
}
