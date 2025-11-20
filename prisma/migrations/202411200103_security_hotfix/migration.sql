-- Harden ledger helpers: enforce caller identity and restrict execution to service role
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
  v_caller uuid := auth.uid();
  v_target uuid := p_auth_user_id;
begin
  -- Only service_role can act on behalf of another user; authenticated callers are bound to themselves
  if not public.is_service_role() then
    if v_caller is null then
      raise exception 'not_authenticated';
    end if;
    if v_target is null then
      v_target := v_caller;
    elsif v_target <> v_caller then
      raise exception 'forbidden';
    end if;
  end if;

  if v_target is null then
    raise exception 'auth_user_required';
  end if;

  select "balanceFre"
    into v_balance
  from "UserWalletBalance"
  where "authUserId" = v_target
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
   where "authUserId" = v_target;

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
    v_target,
    coalesce(nullif(trim(p_context), ''), 'general'),
    coalesce(nullif(trim(p_counterparty), ''), 'n/a'),
    round(coalesce(p_amount_fre, 0), 2),
    round(coalesce(p_fee_fre, 0), 2),
    coalesce(p_metadata, '{}'::jsonb),
    v_now
  );
end;
$$;

-- Restrict ledger helpers to service role only
revoke all on function public.record_user_transaction(uuid, text, text, numeric, numeric, jsonb) from public;
revoke execute on function public.record_user_transaction(uuid, text, text, numeric, numeric, jsonb) from authenticated;
grant execute on function public.record_user_transaction(uuid, text, text, numeric, numeric, jsonb) to service_role;

-- Application fee ledger should also be service_role only
revoke all on function public.record_application_fee(numeric, text, text, jsonb) from public;
revoke execute on function public.record_application_fee(numeric, text, text, jsonb) from authenticated;
grant execute on function public.record_application_fee(numeric, text, text, jsonb) to service_role;
