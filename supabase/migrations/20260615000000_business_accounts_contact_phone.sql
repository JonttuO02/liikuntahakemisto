-- Phase 43: Add contact_phone to business_accounts
-- Purpose: Business users can store their personal phone number for admin-to-user contact.
-- RLS: existing "Business updates own account" policy covers UPDATE on this column.

ALTER TABLE business_accounts ADD COLUMN IF NOT EXISTS contact_phone TEXT;
