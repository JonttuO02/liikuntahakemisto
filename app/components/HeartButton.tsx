'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createBrowserSupabase } from '@/lib/supabaseSSR'
import AuthModal from './AuthModal'

interface HeartButtonProps {
  paikkaId: number
}

export default function HeartButton({ paikkaId }: HeartButtonProps) {
  const [isSuosikki, setIsSuosikki]       = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)

  useEffect(() => {
    const supabase = createBrowserSupabase()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null
      if (u) {
        const { data } = await supabase
          .from('suosikit')
          .select('id')
          .eq('user_id', u.id)
          .eq('paikka_id', paikkaId)
          .maybeSingle()
        setIsSuosikki(!!data)
      } else {
        setIsSuosikki(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [paikkaId])

  async function toggle() {
    const supabase = createBrowserSupabase()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? null

    if (!user) {
      setAuthModalOpen(true)
      return
    }

    const wasSaved = isSuosikki
    // Optimistic update
    setIsSuosikki(!wasSaved)

    if (wasSaved) {
      const { error } = await supabase
        .from('suosikit')
        .delete()
        .eq('user_id', user.id)
        .eq('paikka_id', paikkaId)
      if (error) {
        console.error('[HeartButton] delete error:', error)
        setIsSuosikki(wasSaved)
      }
    } else {
      const { error } = await supabase
        .from('suosikit')
        .insert({ user_id: user.id, paikka_id: paikkaId })
      if (error) {
        console.error('[HeartButton] insert error:', error)
        setIsSuosikki(wasSaved)
      }
    }
  }

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.85, transition: { duration: 0.12, ease: 'easeOut' } }}
        onClick={toggle}
        className="glass-btn w-10 h-10 rounded-full flex items-center justify-center shrink-0"
        aria-label={isSuosikki ? 'Poista suosikeista' : 'Lisää suosikkeihin'}
      >
        <Heart className={cn('w-5 h-5', isSuosikki ? 'fill-[#111111] text-[#111111]' : 'text-[rgba(17,17,17,0.35)]')} />
      </motion.button>
      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        pendingPaikkaId={paikkaId}
        onSuccess={async () => {
          setAuthModalOpen(false)
          const supabase = createBrowserSupabase()
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { error } = await supabase.from('suosikit').insert({ user_id: user.id, paikka_id: paikkaId })
            if (!error) setIsSuosikki(true)
          }
        }}
      />
    </>
  )
}
