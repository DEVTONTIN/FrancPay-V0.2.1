CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE "UserProfile"
  ADD COLUMN IF NOT EXISTS "transferPinHash" TEXT,
  ADD COLUMN IF NOT EXISTS "transferPinSetAt" TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.rpc_set_transfer_pin(p_pin TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  normalized_pin TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  normalized_pin := regexp_replace(COALESCE(p_pin, ''), '[^0-9]', '', 'g');
  IF length(normalized_pin) <> 4 THEN
    RAISE EXCEPTION 'invalid_pin_format';
  END IF;

  UPDATE "UserProfile"
  SET "transferPinHash" = crypt(normalized_pin, gen_salt('bf')),
      "transferPinSetAt" = now()
  WHERE "authUserId" = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_profile_missing';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_set_transfer_pin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_set_transfer_pin(TEXT) TO service_role;
