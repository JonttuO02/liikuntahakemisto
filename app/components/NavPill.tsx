'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { User, LogOut, MoreHorizontal, X } from 'lucide-react'
import { createBrowserSupabase, subscribeToAuthUser } from '@/lib/supabaseSSR'
import AuthModal from './AuthModal'

const BTN = 'flex items-center gap-1.5 px-3 h-8 rounded-full glass-btn text-sm font-bold text-[rgba(17,17,17,0.7)] hover:text-[#111111] [transition:color_150ms_ease]'

export default function NavPill() {
  const [open, setOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const router = useRouter()

  useEffect(() => subscribeToAuthUser(setUser), [])

  async function handleSignOut() {
    setUser(null)
    setOpen(false)
    try {
      await createBrowserSupabase().auth.signOut()
    } finally {
      router.refresh()
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
                {/* /profiili has its own unauthenticated guest guard (ProfiiliClient) */}
                {user && (
                  <Link href="/profiili" onClick={() => setOpen(false)} className={BTN}>
                    <User className="w-3.5 h-3.5" />
                    Profiili
                  </Link>
                )}
                {user ? (
                  <button onClick={handleSignOut} className={BTN}>
                    <LogOut className="w-3.5 h-3.5" />
                    Kirjaudu ulos
                  </button>
                ) : (
                  <button onClick={() => { setAuthModalOpen(true); setOpen(false) }} className={BTN}>
                    <User className="w-3.5 h-3.5" />
                    Kirjaudu
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Trigger */}
          <button
            onClick={() => setOpen(o => !o)}
            aria-label={open ? 'Sulje valikko' : 'Avaa valikko'}
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

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  )
}
