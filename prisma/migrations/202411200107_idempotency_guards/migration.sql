-- Add idempotency keys to prevent double-processing of transfer/payment RPCs
create table if not exists "UserIdempotencyKey" (
  "requestId" uuid primary key,
  "authUserId" uuid not null references "UserProfile"("authUserId") on delete cascade,
  "context" text not null,
  "createdAt" timestamptz not null default now()
);

create index if not exists "UserIdempotencyKey_authUserId_createdAt_idx"
  on "UserIdempotencyKey" ("authUserId", "createdAt");

-- Remove old RPC signatures to avoid overload ambiguity
drop function if exists public.rpc_transfer_between_users(text, numeric, text, text);
drop function if exists public.rpc_user_wallet_payment(text, numeric, text, text, jsonb);
drop function if exists public.rpc_user_merchant_payment(text, numeric, text, text, jsonb);

-- Only count debits toward daily transfer limits
create or replace function public.enforce_transfer_limits(p_amount numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_daily_used numeric(18,2);
  v_tx_limit constant numeric(18,2) := 1000000;   -- per transaction
  v_daily_limit constant numeric(18,2) := 5000000; -- per rolling 24h
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'amount_must_be_positive';
  end if;

  if p_amount > v_tx_limit then
    raise exception 'transfer_limit_exceeded';
  end if;

  select sum(-"amountFre")
    into v_daily_used
  from "UserPaymentTransaction"
  where "authUserId" = v_user
    and "amountFre" < 0
    and "createdAt" >= now() - interval '1 day';

  if coalesce(v_daily_used, 0) + p_amount > v_daily_limit then
    raise exception 'transfer_daily_limit_exceeded';
  end if;
end;
$$;

-- Add idempotency guard to transfers between users
create or replace function public.rpc_transfer_between_users(
  p_handle text,
  p_amount numeric,
  p_pin text,
  p_note text default null,
  p_request_id uuid default null
) returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_sender uuid;
  v_receiver uuid;
  v_normalized_handle text;
  v_sender_handle text;
  v_sender_balance numeric(18,2);
  v_fee constant numeric(18,2) := 1.00;
  v_request_id uuid;
  v_inserted integer;
begin
  v_sender := auth.uid();
  if v_sender is null then
    raise exception 'unauthenticated';
  end if;

  v_request_id := coalesce(p_request_id, gen_random_uuid());
  with ins as (
    insert into "UserIdempotencyKey" ("requestId", "authUserId", "context")
    values (v_request_id, v_sender, 'transfer_between_users')
    on conflict ("requestId") do nothing
    returning 1
  )
  select 1 into v_inserted from ins;

  if not found then
    -- Request already processed
    return;
  end if;

  perform public.assert_email_confirmed();
  perform public.require_transfer_pin(p_pin);
  perform public.enforce_transfer_limits(p_amount);

  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be positive';
  end if;
  v_normalized_handle := lower(regexp_replace(coalesce(p_handle,''), '^@', ''));
  select "authUserId" into v_receiver from "UserProfile"
    where lower("username") = v_normalized_handle
    limit 1;

  if v_receiver is null then
    raise exception 'unknown_contact';
  end if;
  if v_receiver = v_sender then
    raise exception 'cannot transfer to yourself';
  end if;

  select coalesce("username",'FrancPay user') into v_sender_handle
    from "UserProfile" where "authUserId" = v_sender;

  select "balanceFre"
    into v_sender_balance
  from "UserWalletBalance"
  where "authUserId" = v_sender
  for update;

  if coalesce(v_sender_balance, 0) < p_amount + v_fee then
    raise exception 'insufficient_funds';
  end if;
  perform public.record_user_transaction(
    v_sender,
    'transfer',
    coalesce(p_handle, 'FrancPay user'),
    -p_amount,
    v_fee,
    jsonb_build_object('note', p_note)
  );

  perform public.record_user_transaction(
    v_receiver,
    'transfer',
    v_sender_handle,
    p_amount,
    0,
    jsonb_build_object('note', p_note, 'source', 'contact')
  );
end;
$$;

-- Add idempotency guard to wallet payments
create or replace function public.rpc_user_wallet_payment(
  p_wallet_address text,
  p_amount_fre numeric,
  p_pin text,
  p_note text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_request_id uuid default null
) returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user uuid;
  v_balance numeric;
  v_fee constant numeric(18,2) := 1.00;
  v_address text;
  v_payload jsonb;
  v_request_id uuid;
  v_inserted integer;
begin
  v_user := auth.uid();
  if v_user is null then
    raise exception 'unauthenticated';
  end if;

  v_request_id := coalesce(p_request_id, gen_random_uuid());
  with ins as (
    insert into "UserIdempotencyKey" ("requestId", "authUserId", "context")
    values (v_request_id, v_user, 'user_wallet_payment')
    on conflict ("requestId") do nothing
    returning 1
  )
  select 1 into v_inserted from ins;

  if not found then
    -- Request already processed
    return;
  end if;

  perform public.assert_email_confirmed();
  perform public.require_transfer_pin(p_pin);
  perform public.enforce_transfer_limits(p_amount_fre);

  v_address := nullif(trim(coalesce(p_wallet_address, '')), '');
  if v_address is null then
    raise exception 'wallet_address_required';
  end if;

  if p_amount_fre is null or p_amount_fre <= 0 then
    raise exception 'amount_must_be_positive';
  end if;
  select "balanceFre"
    into v_balance
  from "UserWalletBalance"
  where "authUserId" = v_user
  for update;

  if not found then
    raise exception 'wallet_not_initialized';
  end if;

  if coalesce(v_balance, 0) < p_amount_fre + v_fee then
    raise exception 'insufficient_funds';
  end if;

  v_payload :=
    coalesce(p_metadata, '{}'::jsonb) ||
    jsonb_build_object(
      'note', p_note,
      'walletAddress', v_address
    );

  perform public.record_user_transaction(
    v_user,
    'wallet',
    v_address,
    -p_amount_fre,
    v_fee,
    v_payload
  );

  perform public.record_application_fee(
    v_fee,
    'wallet',
    v_address,
    jsonb_build_object('note', p_note)
  );
end;
$$;

-- Add idempotency guard to merchant payments
create or replace function public.rpc_user_merchant_payment(
  p_reference text,
  p_amount_fre numeric,
  p_pin text,
  p_tag text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_request_id uuid default null
) returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user uuid;
  v_balance numeric;
  v_fee constant numeric(18,2) := 1.00;
  v_reference text;
  v_payload jsonb;
  v_request_id uuid;
  v_inserted integer;
begin
  v_user := auth.uid();
  if v_user is null then
    raise exception 'unauthenticated';
  end if;

  v_request_id := coalesce(p_request_id, gen_random_uuid());
  with ins as (
    insert into "UserIdempotencyKey" ("requestId", "authUserId", "context")
    values (v_request_id, v_user, 'user_merchant_payment')
    on conflict ("requestId") do nothing
    returning 1
  )
  select 1 into v_inserted from ins;

  if not found then
    -- Request already processed
    return;
  end if;

  perform public.assert_email_confirmed();
  perform public.require_transfer_pin(p_pin);
  perform public.enforce_transfer_limits(p_amount_fre);

  v_reference := nullif(trim(coalesce(p_reference, '')), '');
  if v_reference is null then
    raise exception 'reference_required';
  end if;

  if p_amount_fre is null or p_amount_fre <= 0 then
    raise exception 'amount_must_be_positive';
  end if;
  select "balanceFre"
    into v_balance
  from "UserWalletBalance"
  where "authUserId" = v_user
  for update;

  if not found then
    raise exception 'wallet_not_initialized';
  end if;

  if coalesce(v_balance, 0) < p_amount_fre + v_fee then
    raise exception 'insufficient_funds';
  end if;

  v_payload :=
    coalesce(p_metadata, '{}'::jsonb) ||
    jsonb_build_object(
      'merchantReference', v_reference,
      'tag', nullif(trim(coalesce(p_tag, '')), '')
    );

  perform public.record_user_transaction(
    v_user,
    'merchant',
    v_reference,
    -p_amount_fre,
    v_fee,
    v_payload
  );

  perform public.record_application_fee(
    v_fee,
    'merchant',
    v_reference,
    jsonb_build_object(
      'tag', nullif(trim(coalesce(p_tag, '')), '')
    )
  );
end;
$$;
