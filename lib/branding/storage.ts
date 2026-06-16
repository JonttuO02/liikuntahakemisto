// Server-only. Never import in client components.

import { supabaseAdmin } from '@/lib/supabaseAdmin.server'

/**
 * Uploads a PNG buffer to the business-media Supabase Storage bucket.
 * Path pattern: branding/{businessAccountId}/{paikkaId}/logo.png
 * Returns the full public https URL of the uploaded file.
 */
export async function uploadLogo(
  businessAccountId: string,
  paikkaId: number,
  pngBuffer: Buffer
): Promise<string> {
  const path = 'branding/' + businessAccountId + '/' + paikkaId + '/logo.png'

  const { error: uploadError } = await supabaseAdmin.storage
    .from('business-media')
    .upload(path, pngBuffer, { contentType: 'image/png', upsert: true })

  if (uploadError) {
    console.error('[branding/storage] upload error:', uploadError)
    throw uploadError
  }

  // getPublicUrl never returns an error field — safe to destructure directly
  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from('business-media').getPublicUrl(path)

  return publicUrl + '?t=' + Date.now()
}

/**
 * Uploads a single logo-candidate PNG buffer to the business-media Supabase Storage bucket.
 * Path pattern: branding/{businessAccountId}/{paikkaId}/logo-{index}.png
 * Used to persist each distinct logo candidate (D-12 logo_candidates).
 * Returns the full public https URL of the uploaded file.
 */
export async function uploadLogoCandidate(
  businessAccountId: string,
  paikkaId: number,
  pngBuffer: Buffer,
  index: number
): Promise<string> {
  const path = 'branding/' + businessAccountId + '/' + paikkaId + '/logo-' + index + '.png'

  const { error: uploadError } = await supabaseAdmin.storage
    .from('business-media')
    .upload(path, pngBuffer, { contentType: 'image/png', upsert: true })

  if (uploadError) {
    console.error('[branding/storage] upload error:', uploadError)
    throw uploadError
  }

  // getPublicUrl never returns an error field — safe to destructure directly
  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from('business-media').getPublicUrl(path)

  return publicUrl + '?t=' + Date.now()
}

/**
 * Uploads a single gallery image PNG buffer to the business-media Supabase Storage bucket.
 * Path pattern: branding/{businessAccountId}/{paikkaId}/gallery/{index}.png
 * Used to persist scraped gallery images (D-11 image_urls).
 * Returns the full public https URL of the uploaded file.
 */
export async function uploadGalleryImage(
  businessAccountId: string,
  paikkaId: number,
  pngBuffer: Buffer,
  index: number
): Promise<string> {
  const path = 'branding/' + businessAccountId + '/' + paikkaId + '/gallery/' + index + '.png'

  const { error: uploadError } = await supabaseAdmin.storage
    .from('business-media')
    .upload(path, pngBuffer, { contentType: 'image/png', upsert: true })

  if (uploadError) {
    console.error('[branding/storage] upload error:', uploadError)
    throw uploadError
  }

  // getPublicUrl never returns an error field — safe to destructure directly
  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from('business-media').getPublicUrl(path)

  return publicUrl + '?t=' + Date.now()
}
