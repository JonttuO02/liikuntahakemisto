'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X, Search, User, LogOut } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import ActaLogo from './ActaLogo'
import AuthModal from './AuthModal'
import { createBrowserSupabase, subscribeToAuthUser } from '@/lib/supabaseSSR'

interface NavBarProps {
  userEmail: string | null
}

export default function NavBar({ userEmail }: NavBarProps) {
  const [open, setOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [clientEmail, setClientEmail] = useState<string | null>(userEmail)

  useEffect(() => {
    return subscribeToAuthUser((user) => setClientEmail(user?.email ?? null))
  }, [])

  function handleSignOut() {
    setClientEmail(null) // immediate UI update — signOut() may hang like signInWithPassword
    createBrowserSupabase().auth.signOut()
  }

  return (
    <>
      <div className="sticky top-0 z-50">

        <header className="glass-nav">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center">

            <div className="flex-1" />

            <Link href="/" aria-label="ACTA – etusivu" onClick={() => setOpen(false)}>
              <ActaLogo />
            </Link>

            {/* Right side — expanding pill (grows left) */}
            <div className="flex-1 flex justify-end">
              <motion.div
                layout
                transition={{ layout: { type: 'spring', damping: 30, stiffness: 350 } }}
                className="glass rounded-full flex items-center overflow-hidden"
                style={{ height: 36 }}
              >
                {/* Expanded content — appears to the left of trigger */}
                <AnimatePresence>
                  {open && (
                    <motion.div
                      key="nav-content"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.12, delay: 0.06 }}
                      className="flex items-center gap-1 pl-2 whitespace-nowrap"
                    >
                      {clientEmail ? (
                        <>
                          <span className="text-xs font-bold text-[#111111] max-w-[90px] truncate px-1">{clientEmail}</span>
                          <button
                            onClick={() => { setOpen(false); handleSignOut() }}
                            className="flex items-center gap-1.5 px-3 h-8 rounded-full glass-btn text-sm font-bold text-[rgba(17,17,17,0.55)] hover:text-[#111111] [transition:color_150ms_var(--ease-out)]"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            Kirjaudu ulos
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => { setOpen(false); setAuthModalOpen(true) }}
                          className="flex items-center gap-1.5 px-3 h-8 rounded-full glass-btn text-sm font-bold text-[rgba(17,17,17,0.55)] hover:text-[#111111] [transition:color_150ms_var(--ease-out)]"
                        >
                          <User className="w-3.5 h-3.5" />
                          Kirjaudu
                        </button>
                      )}
                      <Link
                        href="/?nakyma=lista"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-1.5 px-3 h-8 rounded-full glass-btn text-sm font-bold text-[rgba(17,17,17,0.55)] hover:text-[#111111] [transition:color_150ms_var(--ease-out)]"
                      >
                        <Search className="w-3.5 h-3.5" />
                        Haku
                      </Link>

                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Trigger */}
                <button
                  onClick={() => setOpen(o => !o)}
                  aria-label={open ? 'Sulje valikko' : 'Avaa valikko'}
                  className="w-9 h-9 shrink-0 flex items-center justify-center text-[rgba(17,17,17,0.55)] hover:text-[#111111] [transition:color_150ms_var(--ease-out)]"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {open ? (
                      <motion.span key="x" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                        <X className="w-4 h-4" />
                      </motion.span>
                    ) : (
                      <motion.span key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                        <Menu className="w-4 h-4" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </motion.div>
            </div>

          </div>
        </header>

      </div>

      {/* AuthModal mounted outside sticky header to avoid z-index stacking context issues */}
      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </>
  )
}
