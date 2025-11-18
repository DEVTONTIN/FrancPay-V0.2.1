CREATE OR REPLACE FUNCTION public.require_transfer_pin(p_pin TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user uuid;
  v_hash text;
BEGIN
  v_user := auth.uid();
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  IF p_pin IS NULL OR length(trim(p_pin)) = 0 THEN
    RAISE EXCEPTION 'pin_required';
  END IF;

  SELECT "transferPinHash"
    INTO v_hash
  FROM "UserProfile"
  WHERE "authUserId" = v_user;

  IF v_hash IS NULL THEN
    RAISE EXCEPTION 'pin_not_configured';
  END IF;

  IF crypt(p_pin, v_hash) <> v_hash THEN
    RAISE EXCEPTION 'invalid_pin';
  END IF;
END;
$$;
CREATE OR REPLACE FUNCTION public.rpc_transfer_between_users(
  p_handle text,
  p_amount numeric,
  p_pin text,
  p_note text default null
) returns void
language plpgsql
security definer
set search_path = public, extensions
AS $$
DECLARE
  v_sender uuid;
  v_receiver uuid;
  v_normalized_handle text;
  v_sender_handle text;
  v_sender_balance numeric(18,2);
  v_fee constant numeric(18,2) := 1.00;
BEGIN
  v_sender := auth.uid();
  IF v_sender IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  PERFORM public.require_transfer_pin(p_pin);

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;
  v_normalized_handle := lower(regexp_replace(coalesce(p_handle,''), '^@', ''));
  SELECT "authUserId" INTO v_receiver FROM "UserProfile"
    WHERE lower("username") = v_normalized_handle
    LIMIT 1;

  IF v_receiver IS NULL THEN
    RAISE EXCEPTION 'unknown_contact';
  END IF;
  IF v_receiver = v_sender THEN
    RAISE EXCEPTION 'cannot transfer to yourself';
  END IF;

  SELECT coalesce("username",'FrancPay user') INTO v_sender_handle
    FROM "UserProfile" WHERE "authUserId" = v_sender;

  SELECT "balanceFre"
    INTO v_sender_balance
  FROM "UserWalletBalance"
  WHERE "authUserId" = v_sender
  FOR UPDATE;

  IF coalesce(v_sender_balance, 0) < p_amount + v_fee THEN
    RAISE EXCEPTION 'insufficient_funds';
  END IF;
  PERFORM public.record_user_transaction(
    v_sender,
    'transfer',
    coalesce(p_handle, 'FrancPay user'),
    -p_amount,
    v_fee,
    jsonb_build_object('note', p_note)
  );

  PERFORM public.record_user_transaction(
    v_receiver,
    'transfer',
    v_sender_handle,
    p_amount,
    0,
    jsonb_build_object('note', p_note, 'source', 'contact')
  );
END;
$$;
CREATE OR REPLACE FUNCTION public.rpc_user_wallet_payment(
  p_wallet_address text,
  p_amount_fre numeric,
  p_pin text,
  p_note text default null,
  p_metadata jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = public, extensions
AS $$
DECLARE
  v_user uuid;
  v_balance numeric;
  v_fee constant numeric(18,2) := 1.00;
  v_address text;
  v_payload jsonb;
BEGIN
  v_user := auth.uid();
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  PERFORM public.require_transfer_pin(p_pin);

  v_address := nullif(trim(coalesce(p_wallet_address, '')), '');
  IF v_address IS NULL THEN
    RAISE EXCEPTION 'wallet_address_required';
  END IF;

  IF p_amount_fre IS NULL OR p_amount_fre <= 0 THEN
    RAISE EXCEPTION 'amount_must_be_positive';
  END IF;
  SELECT "balanceFre"
    INTO v_balance
  FROM "UserWalletBalance"
  WHERE "authUserId" = v_user
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'wallet_not_initialized';
  END IF;

  IF coalesce(v_balance, 0) < p_amount_fre + v_fee THEN
    RAISE EXCEPTION 'insufficient_funds';
  END IF;

  v_payload :=
    coalesce(p_metadata, '{}'::jsonb) ||
    jsonb_build_object(
      'note', p_note,
      'walletAddress', v_address
    );

  PERFORM public.record_user_transaction(
    v_user,
    'wallet',
    v_address,
    -p_amount_fre,
    v_fee,
    v_payload
  );

  PERFORM public.record_application_fee(
    v_fee,
    'wallet',
    v_address,
    jsonb_build_object('note', p_note)
  );
END;
$$;
CREATE OR REPLACE FUNCTION public.rpc_user_merchant_payment(
  p_reference text,
  p_amount_fre numeric,
  p_pin text,
  p_tag text default null,
  p_metadata jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = public, extensions
AS $$
DECLARE
  v_user uuid;
  v_balance numeric;
  v_fee constant numeric(18,2) := 1.00;
  v_reference text;
  v_payload jsonb;
BEGIN
  v_user := auth.uid();
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  PERFORM public.require_transfer_pin(p_pin);

  v_reference := nullif(trim(coalesce(p_reference, '')), '');
  IF v_reference IS NULL THEN
    RAISE EXCEPTION 'reference_required';
  END IF;

  IF p_amount_fre IS NULL OR p_amount_fre <= 0 THEN
    RAISE EXCEPTION 'amount_must_be_positive';
  END IF;
  SELECT "balanceFre"
    INTO v_balance
  FROM "UserWalletBalance"
  WHERE "authUserId" = v_user
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'wallet_not_initialized';
  END IF;

  IF coalesce(v_balance, 0) < p_amount_fre + v_fee THEN
    RAISE EXCEPTION 'insufficient_funds';
  END IF;

  v_payload :=
    coalesce(p_metadata, '{}'::jsonb) ||
    jsonb_build_object(
      'merchantReference', v_reference,
      'tag', nullif(trim(coalesce(p_tag, '')), '')
    );

  PERFORM public.record_user_transaction(
    v_user,
    'merchant',
    v_reference,
    -p_amount_fre,
    v_fee,
    v_payload
  );

  PERFORM public.record_application_fee(
    v_fee,
    'merchant',
    v_reference,
    jsonb_build_object(
      'tag', nullif(trim(coalesce(p_tag, '')), '')
    )
  );
END;
$$;
