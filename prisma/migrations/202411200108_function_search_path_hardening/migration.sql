-- Ensure critical functions use a fixed search_path to avoid hijacking via mutable search paths

create or replace function public.auth_role() returns text
  language sql
  stable
  set search_path = public
as $$
  select coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role', '');
$$;

create or replace function public.auth_user_id() returns uuid
  language sql
  stable
  set search_path = public
as $$
  select auth.uid();
$$;

create or replace function public.is_service_role() returns boolean
  language sql
  stable
  set search_path = public
as $$
  select public.auth_role() = 'service_role';
$$;

create or replace function public.generate_referral_code()
returns text
language sql
volatile
set search_path = public, extensions
as $$
  select 'FRP-' || upper(substr(md5(gen_random_uuid()::text), 1, 10));
$$;

create or replace function public.handle_user_profile_insert()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  new."referralCode" := coalesce(new."referralCode", public.generate_referral_code());
  insert into "UserWalletBalance" ("authUserId", "balanceFre")
  values (
    new."authUserId",
    coalesce((select "balanceFre" from "UserWalletBalance" where "authUserId" = new."authUserId"), 0)
  )
  on conflict ("authUserId") do nothing;
  return new;
end;
$$;

create or replace function public.next_daily_stake_payout(p_from timestamptz default now())
returns timestamptz
language sql
immutable
set search_path = public
as $$
  select case
    when date_trunc('day', p_from) + interval '8 hours' > p_from
      then date_trunc('day', p_from) + interval '8 hours'
    else date_trunc('day', p_from) + interval '32 hours'
  end;
$$;

-- Normalize search_path on wallet functions that are already deployed
do $$
declare
  rec record;
begin
  for rec in
    select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where (n.nspname, p.proname) in (
      ('public', 'rpc_user_wallet_deposit'),
      ('public', 'rpc_user_wallet_transfer'),
      ('public', 'rpc_user_wallet_withdraw')
    )
  loop
    execute format(
      'alter function %I.%I(%s) set search_path = public, extensions',
      rec.nspname,
      rec.proname,
      rec.args
    );
  end loop;
end
$$;
