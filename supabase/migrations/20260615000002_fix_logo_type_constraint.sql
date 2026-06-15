-- Phase 45 fix: align logo_type CHECK constraint with analyzer.ts BrandingAnalysisResult.
-- Phase 44 migration used ('icon','icon_with_text','text_only') but the Claude analyzer
-- produces ('wordmark','icon','combination','unknown') — update constraint to match.

ALTER TABLE business_branding
  DROP CONSTRAINT IF EXISTS business_branding_logo_type_check;

ALTER TABLE business_branding
  ADD CONSTRAINT business_branding_logo_type_check
    CHECK (logo_type IN ('wordmark', 'icon', 'combination', 'unknown'));
