-- Phase 35: Admin approval system columns
-- D-07: rejection_reason stored in business_paikka_links so /business page can display it
-- D-04: role_in_company collected at registration so admin sees the applicant's role

ALTER TABLE business_paikka_links
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT NULL;

ALTER TABLE business_accounts
  ADD COLUMN IF NOT EXISTS role_in_company TEXT NULL;
