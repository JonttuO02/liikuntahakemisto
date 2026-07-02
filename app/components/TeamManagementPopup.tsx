'use client'

import { useEffect, useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { createBusinessBrowserClient } from '@/lib/supabase-business'
import { pendingRowToTeamMember, type PendingRequestRow, type TeamMemberRow } from '@/lib/teamManagement'

interface TeamManagementPopupProps {
  open: boolean
  paikkaId: number | null
  onClose: () => void
  onChanged?: () => void
}

/**
 * TeamManagementPopup — the single combined "team management" entry point
 * (D-01/D-03/D-08) opened from DiagonaalKortti's dashboardActions Users icon.
 * Scaffolding copied from RejectionReasonPopup.tsx exactly (backdrop/panel/
 * Escape/close), widened to hold two list sections instead of one paragraph.
 *
 * Data comes exclusively from the Plan 64-01 service-role list endpoint
 * (D-07/D-09) — never the anon client, since business_accounts/
 * business_paikka_links SELECT RLS is self-scoped only. Approve/Reject reuse
 * the existing Phase 60 endpoints unmodified (one-click reject, no reason
 * field per D-13). Remove wires the Plan 64-02 endpoint behind an inline
 * two-state confirm (D-10) — no separate modal.
 *
 * The owner's own row is always rendered in "Current team", labeled
 * "(Sinä) Omistaja", with its remove control disabled (D-14) — this is
 * UI-only defense-in-depth; the actual self-removal block is enforced
 * server-side by the remove Route Handler (T-64-15).
 */
export default function TeamManagementPopup({ open, paikkaId, onClose, onChanged }: TeamManagementPopupProps) {
  const t = useTranslations('Business')

  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [pendingRequests, setPendingRequests] = useState<PendingRequestRow[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMemberRow[]>([])
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionInFlightId, setActionInFlightId] = useState<string | null>(null)
  const [confirmTargetUserId, setConfirmTargetUserId] = useState<string | null>(null)

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  // Escape key handler — mirrors RejectionReasonPopup's keydown-listener pattern.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, handleClose])

  // Reset transient UI-only state (confirm step, action error) whenever the
  // popup closes — list data itself is refetched fresh on every open below.
  useEffect(() => {
    if (!open) {
      setConfirmTargetUserId(null)
      setActionError(null)
    }
  }, [open])

  // Fetch pending requests + current team on open (D-07/D-09) — bearer-token
  // pattern matches app/business/liity/page.tsx's handleSubmit exactly.
  useEffect(() => {
    if (!open || paikkaId == null) return
    let cancelled = false

    async function load() {
      setLoading(true)
      setFetchError(null)
      try {
        const supabase = createBusinessBrowserClient()
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token ?? ''
        const res = await fetch(`/api/business/access-request/list?paikka_id=${paikkaId}`, {
          headers: { Authorization: 'Bearer ' + token },
        })
        const json = await res.json() as { pendingRequests?: PendingRequestRow[]; teamMembers?: TeamMemberRow[]; error?: string }
        if (!res.ok) throw new Error(json?.error ?? 'error')
        if (!cancelled) {
          setPendingRequests(json.pendingRequests ?? [])
          setTeamMembers(json.teamMembers ?? [])
        }
      } catch {
        if (!cancelled) setFetchError(t('teamActionError'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, paikkaId])

  async function handleApprove(requestId: number) {
    setActionError(null)
    setActionInFlightId('req-' + requestId)
    try {
      const supabase = createBusinessBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token ?? ''
      const res = await fetch('/api/business/access-request/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ request_id: requestId }),
      })
      if (res.ok) {
        const approved = pendingRequests.find(r => r.id === requestId)
        setPendingRequests(prev => prev.filter(r => r.id !== requestId))
        if (approved) {
          setTeamMembers(prev =>
            prev.some(m => m.userId === approved.requesterId)
              ? prev
              : [...prev, pendingRowToTeamMember(approved)]
          )
        }
        onChanged?.()
      } else if (res.status === 409) {
        setActionError(t('teamAlreadyProcessed'))
        setPendingRequests(prev => prev.filter(r => r.id !== requestId))
      } else {
        setActionError(t('teamActionError'))
      }
    } catch {
      setActionError(t('teamActionError'))
    } finally {
      setActionInFlightId(null)
    }
  }

  async function handleReject(requestId: number) {
    setActionError(null)
    setActionInFlightId('req-' + requestId)
    try {
      const supabase = createBusinessBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token ?? ''
      // D-13: one-click reject — no reason field sent from this popup.
      const res = await fetch('/api/business/access-request/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ request_id: requestId }),
      })
      if (res.ok) {
        setPendingRequests(prev => prev.filter(r => r.id !== requestId))
        onChanged?.()
      } else if (res.status === 409) {
        setActionError(t('teamAlreadyProcessed'))
        setPendingRequests(prev => prev.filter(r => r.id !== requestId))
      } else {
        setActionError(t('teamActionError'))
      }
    } catch {
      setActionError(t('teamActionError'))
    } finally {
      setActionInFlightId(null)
    }
  }

  async function handleConfirmRemove(userId: string) {
    if (paikkaId == null) return
    setActionError(null)
    setActionInFlightId('member-' + userId)
    try {
      const supabase = createBusinessBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token ?? ''
      const res = await fetch('/api/business/access-request/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ paikka_id: paikkaId, target_user_id: userId }),
      })
      if (res.ok) {
        setTeamMembers(prev => prev.filter(m => m.userId !== userId))
        setConfirmTargetUserId(null)
        onChanged?.()
      } else if (res.status === 409) {
        setActionError(t('teamAlreadyProcessed'))
        setConfirmTargetUserId(null)
      } else {
        setActionError(t('teamActionError'))
      }
    } catch {
      setActionError(t('teamActionError'))
    } finally {
      setActionInFlightId(null)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center"
          aria-modal="true"
          role="dialog"
          aria-label={t('teamManagementTitle')}
        >
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="absolute inset-0 bg-[rgba(0,0,0,0.40)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
          />

          {/* Panel — wider than RejectionReasonPopup's max-w-sm (two list sections) */}
          <motion.div
            key="panel"
            className="relative glass rounded-2xl p-6 w-full max-w-md mx-4"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              aria-label={t('previewClose')}
              className="glass-btn w-7 h-7 rounded-full flex items-center justify-center absolute top-4 right-4 text-[rgba(17,17,17,0.55)] hover:text-[#111111] [transition:color_150ms_var(--ease-out)]"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="flex flex-col gap-4 pr-4">
              <h2 className="text-xl font-bold text-[#111111]">{t('teamManagementTitle')}</h2>

              <div className="max-h-[60vh] overflow-y-auto flex flex-col gap-4">
                {loading ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="w-5 h-5 rounded-full border-2 border-[rgba(17,17,17,0.12)] border-t-[#111111] animate-spin" />
                  </div>
                ) : fetchError ? (
                  <p className="text-sm text-red-600">{fetchError}</p>
                ) : (
                  <>
                    {/* Pending requests section */}
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-bold text-[#111111] uppercase tracking-widest">
                        {t('sectionPendingRequests')}
                      </span>
                      {pendingRequests.length === 0 ? (
                        <p className="text-sm text-[rgba(17,17,17,0.45)]">{t('pendingEmptyBody')}</p>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {pendingRequests.map(row => (
                            <div key={row.id} className="flex items-center justify-between gap-2">
                              <span className="text-sm font-bold text-[#111111] truncate">{row.name}</span>
                              <div className="flex gap-2 shrink-0">
                                <button
                                  type="button"
                                  disabled={actionInFlightId === 'req-' + row.id}
                                  onClick={() => handleApprove(row.id)}
                                  className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm rounded-full h-9 px-4 disabled:opacity-60 [transition:background-color_150ms]"
                                >
                                  {t('approveCta')}
                                </button>
                                <button
                                  type="button"
                                  disabled={actionInFlightId === 'req-' + row.id}
                                  onClick={() => handleReject(row.id)}
                                  className="text-sm font-bold text-red-600 border border-red-200 hover:border-red-400 rounded-full h-9 px-4 disabled:opacity-60 [transition:border-color_150ms]"
                                >
                                  {t('rejectCta')}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="border-t border-[rgba(0,0,0,0.07)]" />

                    {/* Current team section */}
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-bold text-[#111111] uppercase tracking-widest">
                        {t('sectionCurrentTeam')}
                      </span>
                      <div className="flex flex-col gap-3">
                        {teamMembers.map(m => (
                          <div key={m.userId}>
                            {confirmTargetUserId === m.userId ? (
                              <div className="flex flex-col gap-2">
                                <p className="text-sm text-[rgba(17,17,17,0.6)]">
                                  {t('removeConfirmBody', { name: m.name })}
                                </p>
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    disabled={actionInFlightId === 'member-' + m.userId}
                                    onClick={() => handleConfirmRemove(m.userId)}
                                    className="bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-full h-9 px-4 disabled:opacity-60 [transition:background-color_150ms]"
                                  >
                                    {t('removeConfirmCta')}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmTargetUserId(null)}
                                    className="text-sm text-[rgba(17,17,17,0.45)] hover:text-[#111111] [transition:color_150ms]"
                                  >
                                    {t('removeCancelCta')}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex flex-col gap-0.5 min-w-0">
                                  <span className="text-sm font-bold text-[#111111] truncate">{m.name}</span>
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-[rgba(17,17,17,0.45)]">
                                    {m.isSelf ? t('ownerSelfLabel') : t('memberRoleBadge')}
                                  </span>
                                </div>
                                {m.isSelf ? (
                                  <button
                                    type="button"
                                    disabled
                                    aria-label={t('ownerCannotRemoveAria')}
                                    className="w-7 h-7 rounded-full flex items-center justify-center opacity-40 pointer-events-none text-[rgba(17,17,17,0.35)] shrink-0"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    aria-label={t('removeAccessAria')}
                                    onClick={() => setConfirmTargetUserId(m.userId)}
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-red-600 hover:text-red-700 shrink-0 [transition:color_150ms]"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {actionError && (
                      <p className="text-sm text-red-600">{actionError}</p>
                    )}
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
