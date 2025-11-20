-- Security hardening: lock down RPC permissions, add ledger function, and restrict on-chain crediting
create extension if not exists "pgcrypto";

-- Ledger helper (centralized balance mutation + transaction insert)
drop function if exists public.record_user_transaction(uuid, text, text, numeric, numeric, jsonb);
create or replace function public.record_user_transaction(
  p_auth_user_id uuid,
  p_context text,
  p_counterparty text,
  p_amount_fre numeric,
  p_fee_fre numeric default 0,
  p_metadata jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_balance numeric(18,2);
  v_delta numeric(18,2);
  v_now timestamptz := now();
begin
  if p_auth_user_id is null then
    raise exception 'auth_user_required';
  end if;

  select "balanceFre"
    into v_balance
  from "UserWalletBalance"
  where "authUserId" = p_auth_user_id
  for update;

  if not found then
    raise exception 'wallet_not_initialized';
  end if;

  v_delta := round(coalesce(p_amount_fre, 0), 2) - round(coalesce(p_fee_fre, 0), 2);

  if coalesce(v_balance, 0) + v_delta < -0.009 then
    raise exception 'insufficient_funds';
  end if;

  update "UserWalletBalance"
     set "balanceFre" = round(coalesce("balanceFre", 0) + v_delta, 2),
         "updatedAt" = v_now
   where "authUserId" = p_auth_user_id;

  insert into "UserPaymentTransaction" (
    "authUserId",
    "context",
    "counterparty",
    "amountFre",
    "feeFre",
    "metadata",
    "createdAt"
  )
  values (
    p_auth_user_id,
    coalesce(nullif(trim(p_context), ''), 'general'),
    coalesce(nullif(trim(p_counterparty), ''), 'n/a'),
    round(coalesce(p_amount_fre, 0), 2),
    round(coalesce(p_fee_fre, 0), 2),
    coalesce(p_metadata, '{}'::jsonb),
    v_now
  );
end;
$$;

-- Restrict on-chain credit RPC to service role; rely on ledger for balance mutation
create or replace function public.rpc_register_onchain_deposit(
  p_tx_hash text,
  p_wallet_address text,
  p_amount_ton numeric,
  p_amount_fre numeric,
  p_memo_tag text default null,
  p_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_deposit_id uuid;
  v_existing_status text;
  v_existing_user uuid;
  v_target_user uuid;
begin
  if not public.is_service_role() then
    raise exception 'forbidden';
  end if;

  if coalesce(p_tx_hash, '') = '' then
    raise exception 'tx hash required';
  end if;
  if coalesce(p_wallet_address, '') = '' then
    raise exception 'wallet address required';
  end if;
  if p_amount_ton is null or p_amount_ton <= 0 then
    raise exception 'ton amount must be positive';
  end if;
  if p_amount_fre is null or p_amount_fre <= 0 then
    raise exception 'fre amount must be positive';
  end if;

  select "authUserId"
    into v_target_user
  from "UserProfile"
  where upper(coalesce("referralCode", '')) = upper(coalesce(p_memo_tag, ''))
  limit 1;

  if v_target_user is null and p_memo_tag ilike 'FRP-%' then
    select "authUserId"
      into v_target_user
    from "UserProfile"
    where replace(upper("authUserId"::text), '-', '') like upper(replace(p_memo_tag, 'FRP-', '') || '%')
    limit 1;
  end if;

  insert into "OnchainDeposit" ("txHash","walletAddress","memoTag","authUserId","amountTon","amountFre","metadata")
  values (p_tx_hash, p_wallet_address, p_memo_tag, v_target_user, p_amount_ton, p_amount_fre, coalesce(p_metadata,'{}'::jsonb))
  on conflict ("txHash") do update
    set "walletAddress" = excluded."walletAddress",
        "memoTag" = coalesce(excluded."memoTag","OnchainDeposit"."memoTag"),
        "amountTon" = excluded."amountTon",
        "amountFre" = excluded."amountFre",
        "metadata" = coalesce("OnchainDeposit"."metadata",'{}'::jsonb) || coalesce(excluded."metadata",'{}'::jsonb),
        "updatedAt" = now()
  returning "id","status","authUserId"
  into v_deposit_id, v_existing_status, v_existing_user;

  if v_target_user is not null and v_existing_user is distinct from v_target_user then
    update "OnchainDeposit"
      set "authUserId" = v_target_user,
          "updatedAt" = now()
      where "id" = v_deposit_id;
  else
    v_target_user := coalesce(v_existing_user, v_target_user);
  end if;

  if v_target_user is not null and v_existing_status <> 'CREDITED' then
    perform public.record_user_transaction(
      v_target_user,
      'deposit',
      coalesce(p_wallet_address, 'TON Wallet'),
      p_amount_fre,
      0,
      jsonb_build_object(
        'txHash', p_tx_hash,
        'wallet', p_wallet_address,
        'memo', p_memo_tag
      ) || coalesce(p_metadata, '{}'::jsonb)
    );

    update "OnchainDeposit"
      set "status" = 'CREDITED',
          "creditedAt" = now(),
          "updatedAt" = now()
      where "id" = v_deposit_id;
  end if;

  return v_target_user;
end;
$$;

-- Harden permissions: remove PUBLIC, grant only authenticated/service as appropriate
revoke all on function public.record_user_transaction(uuid, text, text, numeric, numeric, jsonb) from public;
grant execute on function public.record_user_transaction(uuid, text, text, numeric, numeric, jsonb) to authenticated, service_role;

revoke all on function public.require_transfer_pin(text) from public;
grant execute on function public.require_transfer_pin(text) to authenticated, service_role;

revoke all on function public.rpc_set_transfer_pin(text) from public;
grant execute on function public.rpc_set_transfer_pin(text) to authenticated, service_role;

revoke all on function public.rpc_verify_transfer_pin(text) from public;
grant execute on function public.rpc_verify_transfer_pin(text) to authenticated, service_role;

revoke all on function public.rpc_transfer_between_users(text, numeric, text, text) from public;
grant execute on function public.rpc_transfer_between_users(text, numeric, text, text) to authenticated, service_role;

revoke all on function public.rpc_user_wallet_payment(text, numeric, text, text, jsonb) from public;
grant execute on function public.rpc_user_wallet_payment(text, numeric, text, text, jsonb) to authenticated, service_role;

revoke all on function public.rpc_user_merchant_payment(text, numeric, text, text, jsonb) from public;
grant execute on function public.rpc_user_merchant_payment(text, numeric, text, text, jsonb) to authenticated, service_role;

revoke all on function public.rpc_user_stake_create(text, numeric) from public;
grant execute on function public.rpc_user_stake_create(text, numeric) to authenticated, service_role;

revoke all on function public.rpc_user_stake_withdraw(uuid, numeric) from public;
grant execute on function public.rpc_user_stake_withdraw(uuid, numeric) to authenticated, service_role;

revoke all on function public.rpc_user_stake_redeem(uuid) from public;
grant execute on function public.rpc_user_stake_redeem(uuid) to authenticated, service_role;

revoke all on function public.rpc_register_onchain_deposit(text, text, numeric, numeric, text, jsonb) from public;
grant execute on function public.rpc_register_onchain_deposit(text, text, numeric, numeric, text, jsonb) to service_role;

revoke all on function public.verify_user_handle(text) from public;
grant execute on function public.verify_user_handle(text) to authenticated, service_role;

revoke all on function public.record_application_fee(numeric, text, text, jsonb) from public;
grant execute on function public.record_application_fee(numeric, text, text, jsonb) to authenticated, service_role;

revoke all on function public.process_daily_stake_rewards(timestamptz) from public;
grant execute on function public.process_daily_stake_rewards(timestamptz) to service_role;

revoke all on function public.process_stake_position_rewards(uuid, timestamptz) from public;
grant execute on function public.process_stake_position_rewards(uuid, timestamptz) to service_role;

revoke all on function public.next_daily_stake_payout(timestamptz) from public;
grant execute on function public.next_daily_stake_payout(timestamptz) to authenticated, service_role;
