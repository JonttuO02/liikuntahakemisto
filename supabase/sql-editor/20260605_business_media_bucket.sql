-- Manual execution: run this in Supabase SQL Editor, NOT via supabase db push
-- Reason: Storage bucket creation and storage.objects RLS policies are managed via the
-- Supabase Storage API layer. Running them as file-based migrations can cause ordering
-- issues and is not the recommended approach per CONTEXT.md decision D-14.
--
-- DATA-10: Creates the business-media Storage bucket and its RLS policies.
-- Path structure:
--   Logo:   {business_account_id}/logo/logo.{ext}
--   Images: {business_account_id}/{paikka_id}/images/{filename}
--
-- NOTE: Function is in public schema (not storage) — SQL Editor lacks permission
-- to create functions in the storage schema on hosted Supabase.

-- ============================================================
-- 1. Bucket creation (D-10, D-13 — public=true for public read)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-media', 'business-media', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. Security-definer ownership function (in public schema)
-- Avoids RLS cascade on business_paikka_links (RESEARCH.md Pitfall 3).
-- p_paikka_id is TEXT because Storage path segments are strings;
-- cast to bigint inside the function body.
-- ============================================================
CREATE OR REPLACE FUNCTION public.business_owns_paikka(
  p_business_id uuid,
  p_paikka_id   text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM business_paikka_links
    WHERE business_account_id = p_business_id
      AND paikka_id = p_paikka_id::bigint
  );
END;
$$;

-- ============================================================
-- 3. Public SELECT policy (belt-and-suspenders on top of bucket public=true)
-- ============================================================
CREATE POLICY "Public read business-media"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'business-media');

-- ============================================================
-- 4. INSERT policy (D-11, D-12)
-- User can only write to their own top-level folder (foldername[1] = auth.uid()).
-- For the logo sub-path ({uid}/logo/*) no paikka ownership check is needed.
-- For image sub-paths ({uid}/{paikka_id}/images/*) paikka ownership is verified
-- via the security-definer function.
-- ============================================================
CREATE POLICY "Business INSERT own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'business-media'
    AND (storage.foldername(objects.name))[1] = (auth.uid())::text
    AND (
      -- Logo path: {uid}/logo/logo.ext — no paikka check needed
      (storage.foldername(objects.name))[2] = 'logo'
      OR
      -- Image path: {uid}/{paikka_id}/images/{filename}
      public.business_owns_paikka(
        auth.uid(),
        (storage.foldername(objects.name))[2]
      )
    )
  );

-- ============================================================
-- 5. UPDATE policy (for overwrite/re-upload, RESEARCH.md Pitfall 6)
-- USING clause checks top-level folder ownership.
-- WITH CHECK re-applies the full insert-level logic to prevent
-- cross-business path modification.
-- ============================================================
CREATE POLICY "Business UPDATE own folder"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'business-media'
    AND (storage.foldername(objects.name))[1] = (auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'business-media'
    AND (storage.foldername(objects.name))[1] = (auth.uid())::text
    AND (
      (storage.foldername(objects.name))[2] = 'logo'
      OR
      public.business_owns_paikka(
        auth.uid(),
        (storage.foldername(objects.name))[2]
      )
    )
  );

-- ============================================================
-- 6. DELETE policy (D-12; covers both logo and image paths)
-- Checks paikka ownership for image sub-paths so a business whose
-- claim is revoked cannot delete images from a venue they no longer own.
-- Logo sub-path ({uid}/logo/*) only requires top-level ownership.
--
-- To apply this fix on an existing database, run first:
--   DROP POLICY "Business DELETE own folder" ON storage.objects;
-- Then re-run the CREATE POLICY block below.
-- ============================================================
CREATE POLICY "Business DELETE own folder"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'business-media'
    AND (storage.foldername(objects.name))[1] = (auth.uid())::text
    AND (
      (storage.foldername(objects.name))[2] = 'logo'
      OR
      public.business_owns_paikka(
        auth.uid(),
        (storage.foldername(objects.name))[2]
      )
    )
  );
