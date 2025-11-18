CREATE OR REPLACE FUNCTION public.rpc_verify_transfer_pin(p_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  PERFORM public.require_transfer_pin(p_pin);
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_verify_transfer_pin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_verify_transfer_pin(TEXT) TO service_role;
