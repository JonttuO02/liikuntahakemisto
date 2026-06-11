-- PUB-01: Trigger that atomically publishes a venue and marks it business-managed
-- when admin approval sets claim_status = 'approved' on business_paikka_links.
-- Fires for all venue types: for claim venues published=true is idempotent;
-- for created venues this is the first time published transitions to true.

CREATE OR REPLACE FUNCTION public.set_business_managed_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE liikuntapaikat
  SET published = true, business_managed = true
  WHERE id = NEW.paikka_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS approval_publish_trigger ON business_paikka_links;

CREATE TRIGGER approval_publish_trigger
  AFTER UPDATE OF claim_status ON business_paikka_links
  FOR EACH ROW
  WHEN (NEW.claim_status = 'approved')
  EXECUTE FUNCTION public.set_business_managed_on_approval();
