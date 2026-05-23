'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X, Search, Heart, User, LogOut } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import ActaLogo from './ActaLogo'
import AuthModal from './AuthModal'
import { createBrowserSupabase } from '@/lib/supabaseSSR'

interface NavBarProps {
  userEmail: string | null
}

export default function NavBar({ userEmail }: NavBarProps) {
  const [open, setOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createBrowserSupabase()
    await supabase.auth.signOut()
    router.refresh()
  }

  return (
    <>
      <div className="sticky top-0 z-50 relative">

        <header className="glass-nav">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center">

            <div className="flex-1" />

            <Link href="/" aria-label="ACTA – etusivu" onClick={() => setOpen(false)}>
              <ActaLogo />
            </Link>

            <div className="flex-1 flex justify-end">
              <button
                onClick={() => setOpen(o => !o)}
                aria-label={open ? 'Sulje valikko' : 'Avaa valikko'}
                className="glass-btn w-9 h-9 rounded-full flex items-center justify-center text-[rgba(17,17,17,0.55)] hover:text-[#111111] [transition:color_150ms_var(--ease-out)]"
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
            </div>

          </div>
        </header>

        {/* Dropdown ribbon — absolute so it overlays content without shifting layout */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute left-0 right-0 glass-nav border-t border-[rgba(0,0,0,0.06)]"
            >
              <div className="max-w-5xl mx-auto px-4 h-11 flex items-center justify-end gap-1">

                {/* Auth state: signed out shows User icon, signed in shows email + LogOut */}
                {userEmail ? (
                  <>
                    <span className="text-sm font-bold text-[#111111] max-w-[120px] truncate">{userEmail}</span>
                    <button
                      onClick={() => { setOpen(false); handleSignOut() }}
                      aria-label="Kirjaudu ulos"
                      className="glass-btn w-9 h-9 rounded-full flex items-center justify-center text-[rgba(17,17,17,0.55)] hover:text-[#111111] [transition:color_150ms_var(--ease-out)]"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => { setOpen(false); setAuthModalOpen(true) }}
                    aria-label="Kirjaudu"
                    className="glass-btn w-9 h-9 rounded-full flex items-center justify-center text-[rgba(17,17,17,0.55)] hover:text-[#111111] [transition:color_150ms_var(--ease-out)]"
                  >
                    <User className="w-4 h-4" />
                  </button>
                )}

                <Link
                  href="/?nakyma=lista"
                  onClick={() => setOpen(false)}
                  aria-label="Haku"
                  className="glass-btn w-9 h-9 rounded-full flex items-center justify-center text-[rgba(17,17,17,0.55)] hover:text-[#111111] [transition:color_150ms_var(--ease-out)]"
                >
                  <Search className="w-4 h-4" />
                </Link>
                <Link
                  href="/suosikit"
                  onClick={() => setOpen(false)}
                  aria-label="Suosikit"
                  className="glass-btn w-9 h-9 rounded-full flex items-center justify-center text-[rgba(17,17,17,0.55)] hover:text-[#111111] [transition:color_150ms_var(--ease-out)]"
                >
                  <Heart className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* AuthModal mounted outside sticky header to avoid z-index stacking context issues */}
      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </>
  )
}
