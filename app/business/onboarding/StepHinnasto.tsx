'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createBrowserSupabase } from '@/lib/supabaseSSR'
import { useTranslations } from 'next-intl'
import { X } from 'lucide-react'

type PricingRow = {
  id: string
  kategoria: string
  hinta: string
  lisatieto: string
  isFixed: boolean
}

type Props = {
  paikkaId: number
  onNext: () => void
  onPrev: () => void
  initialHinnasto?: Array<{ kategoria: string; hinta: string; lisatieto?: string }> | null
  initialPaikkaHinnasto?: Array<{ kategoria: string; hinta: string; lisatieto?: string }> | null
  editMode?: boolean
  onSaveSuccess?: () => void
}

const inputClass =
  'border border-[rgba(0,0,0,0.12)] rounded-lg h-10 px-3 text-sm text-[#111111] ' +
  'placeholder:text-[rgba(17,17,17,0.35)] bg-white focus:outline-none ' +
  'focus:border-[rgba(0,0,0,0.25)] disabled:opacity-60 w-full ' +
  '[transition:border-color_150ms_var(--ease-out)]'

const cellInputClass =
  'border border-[rgba(0,0,0,0.12)] focus:border-[rgba(0,0,0,0.25)] rounded-lg h-9 px-2 ' +
  'text-sm outline-none [transition:border-color_150ms_var(--ease-out)]'

export default function StepHinnasto({
  paikkaId,
  onNext,
  onPrev,
  initialHinnasto,
  initialPaikkaHinnasto,
  editMode = false,
  onSaveSuccess,
}: Props) {
  const t = useTranslations('Business')

  const [rows, setRows] = useState<PricingRow[]>(() => {
    // In edit mode, prefer initialPaikkaHinnasto if provided
    const source = editMode ? (initialPaikkaHinnasto ?? initialHinnasto) : initialHinnasto
    if (source && source.length > 0) {
      return source.map((row, i) => ({
        id: `saved-${i}`,
        kategoria: row.kategoria,
        hinta: row.hinta,
        lisatieto: row.lisatieto ?? '',
        isFixed: false,
      }))
    }
    return [
      { id: 'fixed-1', kategoria: t('pricingCategoryDrop'),    hinta: '', lisatieto: '', isFixed: true },
      { id: 'fixed-2', kategoria: t('pricingCategoryMonthly'), hinta: '', lisatieto: '', isFixed: true },
      { id: 'fixed-3', kategoria: t('pricingCategory10x'),     hinta: '', lisatieto: '', isFixed: true },
      { id: 'fixed-4', kategoria: t('pricingCategoryAnnual'),  hinta: '', lisatieto: '', isFixed: true },
    ]
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Edit-mode specific state
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccessVisible, setSaveSuccessVisible] = useState(false)

  // ONBOARD-04: gate — Next disabled until at least one row has a non-empty hinta
  const hasAnyPrice = rows.some(r => r.hinta.trim() !== '')

  function addPriceRow() {
    setRows(prev => [
      ...prev,
      { id: `custom-${Date.now()}`, kategoria: '', hinta: '', lisatieto: '', isFixed: false },
    ])
  }

  function removeRow(id: string) {
    setRows(prev => prev.filter(r => r.id !== id))
  }

  function updateRow(id: string, field: keyof PricingRow, value: string) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  async function handleSave() {
    if (!hasAnyPrice || saving) return
    setSaving(true)
    setSaveError(null)

    try {
      const supabase = createBrowserSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token ?? ''

      // Derive hinta_min / hinta_max from rows
      const numericPrices = rows
        .filter(r => r.hinta.trim() !== '')
        .map(r => parseFloat(r.hinta.replace(',', '.')))
        .filter(n => !isNaN(n))

      const hinta_min = numericPrices.length > 0 ? Math.min(...numericPrices) : null
      const hinta_max = numericPrices.length > 0 ? Math.max(...numericPrices) : null

      // Derive hinta_kuvaus: compact string from non-empty rows
      const hinta_kuvaus = rows
        .filter(r => r.hinta.trim() !== '')
        .map(r => {
          const base = `${r.kategoria}: €${r.hinta}`
          return r.lisatieto.trim() ? `${base} (${r.lisatieto.trim()})` : base
        })
        .join('; ')
        .slice(0, 200) || null

      const res = await fetch('/api/business/update-paikka', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          paikka_id: paikkaId,
          section: 'hinnasto',
          data: { hinta_min, hinta_max, hinta_kuvaus },
        }),
      })

      if (!res.ok) {
        setSaveError(t('errorGeneric'))
        return
      }

      setSaveSuccessVisible(true)
      setTimeout(() => {
        setSaveSuccessVisible(false)
        onSaveSuccess?.()
      }, 2000)
    } catch {
      setSaveError(t('errorGeneric'))
    } finally {
      setSaving(false)
    }
  }

  async function handleNext() {
    if (!hasAnyPrice || loading) return
    setLoading(true)
    setError(null)

    try {
      const supabase = createBrowserSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token ?? ''

      const res = await fetch('/api/business/onboarding/save-step', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          paikka_id: paikkaId,
          step: 3,
          field: 'hinnasto',
          value: rows
            .filter(r => r.hinta.trim() !== '')
            .map(({ kategoria, hinta, lisatieto }) => ({ kategoria, hinta, lisatieto })),
        }),
      })

      if (!res.ok) {
        setError(t('errorGeneric'))
        return
      }

      onNext()
    } catch {
      setError(t('errorGeneric'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass rounded-2xl p-6 w-full max-w-xl mx-auto flex flex-col gap-6">
      <h2 className="text-xl font-bold text-[#111111]">{t('stepPricing')}</h2>

      <div className="flex flex-col gap-2">
        <table className="w-full">
          <thead>
            <tr className="text-[10px] font-bold uppercase tracking-widest text-[rgba(17,17,17,0.45)]">
              <th className="text-left pb-2">Kategoria</th>
              <th className="text-left pb-2 w-28">{t('pricingHeaderPrice')}</th>
              <th className="text-left pb-2">{t('pricingHeaderNotes')}</th>
              <th className="pb-2 w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(0,0,0,0.07)]">
            {rows.map(row => (
              <tr key={row.id}>
                <td className="py-3 pr-4">
                  {row.isFixed ? (
                    <span className="text-sm text-[#111111]">{row.kategoria}</span>
                  ) : (
                    <input
                      type="text"
                      className={inputClass}
                      value={row.kategoria}
                      placeholder={t('pricingRowNamePlaceholder')}
                      onChange={e => updateRow(row.id, 'kategoria', e.target.value)}
                    />
                  )}
                </td>
                <td className="py-3 pr-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    className={`${cellInputClass} w-28 tabular-nums`}
                    value={row.hinta}
                    onChange={e => updateRow(row.id, 'hinta', e.target.value)}
                  />
                </td>
                <td className="py-3 pr-2">
                  <input
                    type="text"
                    className={`${cellInputClass} w-full`}
                    value={row.lisatieto}
                    onChange={e => updateRow(row.id, 'lisatieto', e.target.value)}
                  />
                </td>
                <td className="py-3 text-right">
                  {!row.isFixed && (
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      className="text-[rgba(17,17,17,0.35)] hover:text-red-600 [transition:color_150ms_var(--ease-out)]"
                      aria-label="Poista rivi"
                    >
                      <X size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button
          type="button"
          onClick={addPriceRow}
          className="text-sm text-[#111111] font-bold underline-offset-2 hover:underline w-fit mt-2"
        >
          {t('addPriceRowCta')}
        </button>
      </div>

      <AnimatePresence>
        {(editMode ? saveSuccessVisible : false) && (
          <motion.p
            key="price-save-success"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="text-sm text-green-600"
            role="status"
            aria-live="polite"
          >
            {t('saveSuccess')}
          </motion.p>
        )}
        {(editMode ? saveError : error) && (
          <motion.p
            key="price-error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="text-sm text-red-600"
            role="alert"
            aria-live="polite"
          >
            {editMode ? saveError : error}
          </motion.p>
        )}
      </AnimatePresence>

      <footer className="flex justify-between items-center pt-4 border-t border-[rgba(0,0,0,0.07)]">
        <button
          type="button"
          onClick={onPrev}
          className="text-sm text-[rgba(17,17,17,0.45)] hover:text-[#111111] [transition:color_150ms_var(--ease-out)] flex items-center gap-1"
        >
          {t('prevCta')}
        </button>
        {editMode ? (
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            disabled={!hasAnyPrice || saving}
            className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm rounded-full h-10 px-6 [transition:background-color_150ms_var(--ease-out)] disabled:opacity-60 disabled:pointer-events-none"
          >
            {saving ? (
              <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" />
            ) : (
              t('saveCta')
            )}
          </motion.button>
        ) : (
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={handleNext}
            disabled={!hasAnyPrice || loading}
            className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm rounded-full h-10 px-6 [transition:background-color_150ms_var(--ease-out)] disabled:opacity-60 disabled:pointer-events-none"
          >
            {loading ? (
              <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" />
            ) : (
              t('nextCta')
            )}
          </motion.button>
        )}
      </footer>
    </div>
  )
}
