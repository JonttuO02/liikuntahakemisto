'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Bookmark, BookmarkCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createBrowserSupabase, subscribeToAuthUser } from '@/lib/supabaseSSR'
import AuthModal from './AuthModal'

interface BookmarkButtonProps {
  paikkaId: number
}

export default function BookmarkButton({ paikkaId }: BookmarkButtonProps) {
  const [isTodo, setIsTodo]            = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const currentUser = useRef<{ id: string } | null>(null)

  useEffect(() => {
    const supabase = createBrowserSupabase()
    return subscribeToAuthUser(async (user) => {
      currentUser.current = user
      if (user) {
        const { data } = await supabase.from('suosikit').select('id').eq('user_id', user.id).eq('paikka_id', paikkaId).maybeSingle()
        setIsTodo(!!data)
      } else {
        setIsTodo(false)
      }
    })
  }, [paikkaId])

  async function toggle() {
    const user = currentUser.current
    if (!user) {
      setAuthModalOpen(true)
      return
    }

    const supabase = createBrowserSupabase()
    const wasSaved = isTodo
    // Optimistic update
    setIsTodo(!wasSaved)

    if (wasSaved) {
      const { error } = await supabase
        .from('suosikit')
        .delete()
        .eq('user_id', user.id)
        .eq('paikka_id', paikkaId)
      if (error) {
        console.error('[BookmarkButton] delete error:', error)
        setIsTodo(wasSaved)
      }
    } else {
      const { error } = await supabase
        .from('suosikit')
        .insert({ user_id: user.id, paikka_id: paikkaId })
      if (error) {
        console.error('[BookmarkButton] insert error:', error)
        setIsTodo(wasSaved)
      }
    }
  }

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.85, transition: { duration: 0.12, ease: 'easeOut' } }}
        onClick={toggle}
        className="glass-btn w-10 h-10 rounded-full flex items-center justify-center shrink-0"
        aria-label={isTodo ? 'Poista TO DO -listalta' : 'Lisää TO DO -listalle'}
      >
        {isTodo
          ? <BookmarkCheck className={cn('w-5 h-5 fill-[#111111] text-[#111111]')} />
          : <Bookmark className={cn('w-5 h-5 text-[rgba(17,17,17,0.35)]')} />
        }
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
            if (!error) setIsTodo(true)
          }
        }}
      />
    </>
  )
}
