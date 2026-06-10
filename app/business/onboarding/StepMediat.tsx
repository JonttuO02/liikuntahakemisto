'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { createBrowserSupabase } from '@/lib/supabaseSSR'
import UploadDropZone from './UploadDropZone'
import UploadProgressBar from './UploadProgressBar'
import type { OnboardingDraft } from '@/lib/onboardingUtils'

interface StepMediatProps {
  paikkaId: number
  initialDraft?: OnboardingDraft | null
  onNext: () => void
  onPrev: () => void
}

export default function StepMediat({
  paikkaId,
  initialDraft,
  onNext,
  onPrev,
}: StepMediatProps) {
  const t = useTranslations('Business')

  const [logoFiles, setLogoFiles] = useState<File[]>([])
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [existingLogoUrl, setExistingLogoUrl] = useState<string | null>(
    initialDraft?.media_urls?.logo ?? null
  )
  const [existingPhotoUrls, setExistingPhotoUrls] = useState<string[]>(
    initialDraft?.media_urls?.photos ?? []
  )
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleLogoFilesSelected(files: File[]) {
    // Logo zone: only the first file
    setLogoFiles(files.slice(0, 1))
  }

  function handlePhotoFilesSelected(files: File[]) {
    // Images zone: combine existing + new, cap at 5 total
    setPhotoFiles((prev) => {
      const combined = [...prev, ...files]
      return combined.slice(0, 5)
    })
  }

  function removeLogoFile(_i: number) {
    setLogoFiles([])
  }

  function removePhotoFile(i: number) {
    setPhotoFiles((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function handleNext() {
    setIsUploading(true)
    setUploadProgress(10)
    setError(null)

    try {
      const supabase = createBrowserSupabase()
      // Security: always derive the storage path prefix from the session, never from a prop.
      // Using session.user.id ensures the path matches the RLS policy (auth.uid() = path prefix).
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        setError(t('errorUploadFailed'))
        setUploadProgress(0)
        return
      }

      const userId = session.user.id

      let logoUrl: string | null = existingLogoUrl
      const photoUrls: string[] = [...existingPhotoUrls]

      // Upload logo (replaces existing if a new file is selected)
      if (logoFiles[0]) {
        const ext = logoFiles[0].name.split('.').pop() ?? 'jpg'
        const filename = `logo-${Date.now()}.${ext}`
        const path = `${userId}/${paikkaId}/logo/${filename}`

        const { error: uploadErr } = await supabase.storage
          .from('business-media')
          .upload(path, logoFiles[0], {
            contentType: logoFiles[0].type,
            upsert: true,
          })

        if (uploadErr) {
          setError(t('errorUploadFailed'))
          setUploadProgress(0)
          return
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from('business-media').getPublicUrl(path)
        logoUrl = publicUrl
      }

      // Upload photos
      for (let i = 0; i < photoFiles.length; i++) {
        const file = photoFiles[i]
        const ext = file.name.split('.').pop() ?? 'jpg'
        const filename = `photo-${Date.now()}-${i}.${ext}`
        const path = `${userId}/${paikkaId}/photos/${filename}`

        const { error: uploadErr } = await supabase.storage
          .from('business-media')
          .upload(path, file, {
            contentType: file.type,
            upsert: true,
          })

        if (uploadErr) {
          setError(t('errorUploadFailed'))
          setUploadProgress(0)
          return
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from('business-media').getPublicUrl(path)
        photoUrls.push(publicUrl)
      }

      setUploadProgress(100)

      // Save URLs to onboarding_draft via save-step Route Handler
      const res = await fetch('/api/business/onboarding/save-step', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          paikka_id: paikkaId,
          step: 2,
          field: 'media_urls',
          value: { logo: logoUrl, photos: photoUrls },
        }),
      })

      if (!res.ok) {
        setError(t('errorUploadFailed'))
        setUploadProgress(0)
        return
      }

      onNext()
    } catch {
      setError(t('errorUploadFailed'))
      setUploadProgress(0)
    } finally {
      setIsUploading(false)
    }
  }

  const submitButtonClass =
    'bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm rounded-full h-10 px-6 [transition:background-color_150ms_var(--ease-out)] disabled:opacity-60 disabled:pointer-events-none'

  return (
    <motion.div
      className="glass rounded-2xl p-6 w-full max-w-xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <div className="flex flex-col gap-6">
        <h2 className="text-xl font-bold text-[#111111]">{t('stepMedia')}</h2>

        {/* Logo drop zone */}
        <div className="flex flex-col gap-2">
          {existingLogoUrl && logoFiles.length === 0 && (
            <div className="flex items-center gap-3">
              <img src={existingLogoUrl} alt="" className="w-14 h-14 object-cover rounded-lg border border-[rgba(0,0,0,0.07)]" />
              <button
                type="button"
                onClick={() => setExistingLogoUrl(null)}
                className="text-xs text-[rgba(17,17,17,0.45)] hover:text-red-600 [transition:color_150ms]"
              >
                Poista
              </button>
            </div>
          )}
          <UploadDropZone
            label={existingLogoUrl && logoFiles.length === 0 ? 'Vaihda logo' : t('logoDropLabel')}
            allowMultiple={false}
            maxFileSizeMB={2}
            maxFiles={1}
            selectedFiles={logoFiles}
            onFilesSelected={handleLogoFilesSelected}
            onRemove={removeLogoFile}
          />
        </div>

        {/* Images drop zone */}
        <div className="flex flex-col gap-2">
          {existingPhotoUrls.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {existingPhotoUrls.map((url, i) => (
                <div key={url} className="relative">
                  <img src={url} alt="" className="w-14 h-14 object-cover rounded-lg border border-[rgba(0,0,0,0.07)]" />
                  <button
                    type="button"
                    onClick={() => setExistingPhotoUrls(prev => prev.filter((_, idx) => idx !== i))}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#111111] text-white text-[10px] flex items-center justify-center leading-none"
                    aria-label="Poista kuva"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <UploadDropZone
            label={t('imagesDropLabel')}
            allowMultiple={true}
            maxFileSizeMB={5}
            maxFiles={5}
            selectedFiles={photoFiles}
            onFilesSelected={handlePhotoFilesSelected}
            onRemove={removePhotoFile}
          />
        </div>

        {/* Upload progress bar */}
        <UploadProgressBar pct={uploadProgress} />

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.p
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="text-sm text-red-600"
              role="alert"
              aria-live="polite"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Step footer */}
        <footer className="flex justify-between items-center pt-4 border-t border-[rgba(0,0,0,0.07)]">
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={onPrev}
            disabled={isUploading}
            className="text-sm text-[rgba(17,17,17,0.45)] hover:text-[#111111] [transition:color_150ms_var(--ease-out)] flex items-center gap-1"
          >
            {t('prevCta')}
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            disabled={isUploading}
            onClick={handleNext}
            className={submitButtonClass}
          >
            {isUploading ? t('uploadingLabel') : t('nextCta')}
          </motion.button>
        </footer>
      </div>
    </motion.div>
  )
}
