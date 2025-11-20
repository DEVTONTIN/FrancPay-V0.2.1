-- Fix record_user_transaction to allow definer calls for crediting other users (while still blocking client misuse)
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
  -- If executed with a JWT (non service role) and not as definer, prevent acting on another user
  if current_user <> 'postgres' and not public.is_service_role() then
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
