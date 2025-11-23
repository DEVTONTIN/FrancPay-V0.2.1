-- Helper functions to inspect Supabase JWT claims
create or replace function auth_role() returns text
  language sql
  stable
  set search_path = public
as $$
  select coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role', '');
$$;

create or replace function auth_user_id() returns uuid
  language sql
  stable
  set search_path = public
as $$
  select auth.uid();
$$;

create or replace function is_service_role() returns boolean
  language sql
  stable
  set search_path = public
as $$
  select auth_role() = 'service_role';
$$;

-- User profiles
alter table "UserProfile" enable row level security;
alter table "UserProfile" force row level security;

drop policy if exists "user_profile_select" on "UserProfile";
create policy "user_profile_select" on "UserProfile"
  for select using (
    "authUserId" = auth_user_id()
    or is_service_role()
  );

drop policy if exists "user_profile_write" on "UserProfile";
create policy "user_profile_write" on "UserProfile"
  for all using (
    "authUserId" = auth_user_id()
    or is_service_role()
  ) with check (
    "authUserId" = auth_user_id()
    or is_service_role()
  );

-- Wallet balances
alter table "UserWalletBalance" enable row level security;
alter table "UserWalletBalance" force row level security;

drop policy if exists "wallet_balance_select" on "UserWalletBalance";
create policy "wallet_balance_select" on "UserWalletBalance"
  for select using (
    "authUserId" = auth_user_id()
    or is_service_role()
  );

drop policy if exists "wallet_balance_write" on "UserWalletBalance";
create policy "wallet_balance_write" on "UserWalletBalance"
  for all using (is_service_role())
  with check (is_service_role());

-- User payments
alter table "UserPaymentTransaction" enable row level security;
alter table "UserPaymentTransaction" force row level security;

drop policy if exists "user_payment_select" on "UserPaymentTransaction";
create policy "user_payment_select" on "UserPaymentTransaction"
  for select using (
    "authUserId" = auth_user_id()
    or is_service_role()
  );

drop policy if exists "user_payment_write" on "UserPaymentTransaction";
create policy "user_payment_write" on "UserPaymentTransaction"
  for all using (is_service_role())
  with check (is_service_role());

-- Professional applications
alter table "ProfessionalApplication" enable row level security;
alter table "ProfessionalApplication" force row level security;

drop policy if exists "professional_application_access" on "ProfessionalApplication";
create policy "professional_application_access" on "ProfessionalApplication"
  for select using (
    is_service_role()
    or "authUserId" = auth_user_id()
    or exists (
      select 1 from "UserProfile" up
      where up.id = "userProfileId"
        and up."authUserId" = auth_user_id()
    )
  );

drop policy if exists "professional_application_manage" on "ProfessionalApplication";
create policy "professional_application_manage" on "ProfessionalApplication"
  for all using (
    is_service_role()
    or "authUserId" = auth_user_id()
    or exists (
      select 1 from "UserProfile" up
      where up.id = "userProfileId"
        and up."authUserId" = auth_user_id()
    )
  ) with check (
    is_service_role()
    or "authUserId" = auth_user_id()
    or exists (
      select 1 from "UserProfile" up
      where up.id = "userProfileId"
        and up."authUserId" = auth_user_id()
    )
  );

-- Staking
alter table "StakeProduct" enable row level security;
alter table "StakeProduct" force row level security;

drop policy if exists "stake_product_read" on "StakeProduct";
create policy "stake_product_read" on "StakeProduct"
  for select using (true);

drop policy if exists "stake_product_manage" on "StakeProduct";
create policy "stake_product_manage" on "StakeProduct"
  for all using (is_service_role())
  with check (is_service_role());

alter table "UserStakePosition" enable row level security;
alter table "UserStakePosition" force row level security;

drop policy if exists "stake_position_read" on "UserStakePosition";
create policy "stake_position_read" on "UserStakePosition"
  for select using (
    "authUserId" = auth_user_id()
    or is_service_role()
  );

drop policy if exists "stake_position_manage" on "UserStakePosition";
create policy "stake_position_manage" on "UserStakePosition"
  for all using (
    "authUserId" = auth_user_id()
    or is_service_role()
  ) with check (
    "authUserId" = auth_user_id()
    or is_service_role()
  );

alter table "UserStakeLedger" enable row level security;
alter table "UserStakeLedger" force row level security;

drop policy if exists "stake_ledger_read" on "UserStakeLedger";
create policy "stake_ledger_read" on "UserStakeLedger"
  for select using (
    "authUserId" = auth_user_id()
    or is_service_role()
  );

drop policy if exists "stake_ledger_manage" on "UserStakeLedger";
create policy "stake_ledger_manage" on "UserStakeLedger"
  for all using (
    "authUserId" = auth_user_id()
    or is_service_role()
  ) with check (
    "authUserId" = auth_user_id()
    or is_service_role()
  );

-- Idempotency keys
alter table "UserIdempotencyKey" enable row level security;
alter table "UserIdempotencyKey" force row level security;

drop policy if exists "user_idempotency_key_read" on "UserIdempotencyKey";
create policy "user_idempotency_key_read" on "UserIdempotencyKey"
  for select using (
    "authUserId" = auth_user_id()
    or is_service_role()
  );

drop policy if exists "user_idempotency_key_insert" on "UserIdempotencyKey";
create policy "user_idempotency_key_insert" on "UserIdempotencyKey"
  for insert with check (
    "authUserId" = auth_user_id()
    or is_service_role()
  );

drop policy if exists "user_idempotency_key_manage" on "UserIdempotencyKey";
create policy "user_idempotency_key_manage" on "UserIdempotencyKey"
  for update using (is_service_role())
  with check (is_service_role());

drop policy if exists "user_idempotency_key_delete" on "UserIdempotencyKey";
create policy "user_idempotency_key_delete" on "UserIdempotencyKey"
  for delete using (is_service_role());

-- On-chain deposits
alter table "OnchainDeposit" enable row level security;
alter table "OnchainDeposit" force row level security;

drop policy if exists "onchain_deposit_read" on "OnchainDeposit";
create policy "onchain_deposit_read" on "OnchainDeposit"
  for select using (
    is_service_role()
    or "authUserId" = auth_user_id()
  );

drop policy if exists "onchain_deposit_manage" on "OnchainDeposit";
create policy "onchain_deposit_manage" on "OnchainDeposit"
  for all using (is_service_role())
  with check (is_service_role());

-- Application fee tracking (service only)
alter table "ApplicationFeeLedger" enable row level security;
alter table "ApplicationFeeLedger" force row level security;

drop policy if exists "app_fee_access" on "ApplicationFeeLedger";
create policy "app_fee_access" on "ApplicationFeeLedger"
  for all using (is_service_role())
  with check (is_service_role());

alter table "ApplicationFeeBalance" enable row level security;
alter table "ApplicationFeeBalance" force row level security;

drop policy if exists "app_fee_balance_access" on "ApplicationFeeBalance";
create policy "app_fee_balance_access" on "ApplicationFeeBalance"
  for all using (is_service_role())
  with check (is_service_role());

-- Market data
alter table "FrePriceSnapshot" enable row level security;
alter table "FrePriceSnapshot" force row level security;

drop policy if exists "fre_price_read" on "FrePriceSnapshot";
create policy "fre_price_read" on "FrePriceSnapshot"
  for select using (true);

drop policy if exists "fre_price_manage" on "FrePriceSnapshot";
create policy "fre_price_manage" on "FrePriceSnapshot"
  for all using (is_service_role())
  with check (is_service_role());
