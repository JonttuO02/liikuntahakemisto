-- CR-04: Raise an exception if the trigger UPDATE finds no matching liikuntapaikat row.
-- Without this, a missing paikka_id causes a silent no-op: approve route returns HTTP 200
-- but the venue is never published and the admin sees no error.

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
  IF NOT FOUND THEN
    RAISE EXCEPTION 'liikuntapaikat row not found for paikka_id=%', NEW.paikka_id;
  END IF;
  RETURN NEW;
END;
$$;
