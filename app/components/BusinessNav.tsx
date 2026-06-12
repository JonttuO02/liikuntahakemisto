'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { User, LogOut, MoreHorizontal, X, Map } from 'lucide-react'
import { createBusinessBrowserClient } from '@/lib/supabase-business'
import { useTranslations } from 'next-intl'

const BTN = 'flex items-center gap-1.5 px-3 h-8 rounded-full glass-btn text-sm font-bold text-[rgba(17,17,17,0.7)] hover:text-[#111111] [transition:color_150ms_ease]'

export default function BusinessNav() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations('Business')

  async function handleSignOut() {
    setOpen(false)
    try {
      await createBusinessBrowserClient().auth.signOut()
    } finally {
      router.push('/business/kirjaudu')
    }
  }

  return (
    <>
      {/* Backdrop — closes pill on outside click */}
      {open && (
        <div
          className="fixed inset-0"
          style={{ zIndex: 63 }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Top-left brand link */}
      <div
        className="fixed"
        style={{ top: 'max(12px, env(safe-area-inset-top))', left: 16, zIndex: 64 }}
      >
        <Link
          href="/business"
          className="text-sm font-bold text-[#111111] [transition:color_150ms_ease]"
        >
          {t('navDashboard')}
        </Link>
      </div>

      {/* Top-right glass pill */}
      <div
        className="fixed"
        style={{ top: 'max(12px, env(safe-area-inset-top))', right: 16, zIndex: 64 }}
      >
        <motion.div
          layout
          transition={{ layout: { type: 'spring', damping: 30, stiffness: 350 } }}
          className="glass rounded-full flex items-center overflow-hidden"
          style={{ height: 40 }}
        >
          {/* Expanded content — appears to the left of trigger */}
          <AnimatePresence>
            {open && (
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12, delay: 0.06 }}
                className="flex items-center gap-1 pl-2 whitespace-nowrap"
              >
                <Link
                  href="/business/profiili"
                  onClick={() => setOpen(false)}
                  className={`${BTN}${pathname === '/business/profiili' ? ' text-[#111111]' : ''}`}
                >
                  <User className="w-3.5 h-3.5" />
                  {t('navProfile')}
                </Link>
                <button onClick={handleSignOut} className={BTN}>
                  <LogOut className="w-3.5 h-3.5" />
                  {t('navSignOut')}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Trigger */}
          <button
            onClick={() => setOpen(o => !o)}
            aria-label={open ? t('navCloseMenu') : t('navOpenMenu')}
            className="w-10 h-10 shrink-0 flex items-center justify-center text-[rgba(17,17,17,0.7)] hover:text-[#111111] [transition:color_150ms_ease]"
          >
            <AnimatePresence mode="wait" initial={false}>
              {open ? (
                <motion.span key="x" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                  <X className="w-4 h-4" />
                </motion.span>
              ) : (
                <motion.span key="more" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                  <MoreHorizontal className="w-4 h-4" />
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </motion.div>
      </div>

      {/* Bottom-left Kartta button */}
      <div
        className="fixed"
        style={{
          bottom: 'max(16px, env(safe-area-inset-bottom))',
          left: 16,
          zIndex: 64,
        }}
      >
        <Link
          href="/business/map"
          className={`w-10 h-10 glass-btn rounded-full flex items-center justify-center [transition:color_150ms_ease] ${
            pathname === '/business/map'
              ? 'text-[#111111]'
              : 'text-[rgba(17,17,17,0.7)] hover:text-[#111111]'
          }`}
          aria-label={t('navMap')}
        >
          <Map className="w-4 h-4" />
        </Link>
      </div>
    </>
  )
}
