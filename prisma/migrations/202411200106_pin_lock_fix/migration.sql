-- Ensure PIN lockout raises pin_locked when threshold is reached
create or replace function public.require_transfer_pin(p_pin text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user uuid := auth.uid();
  v_hash text;
  v_failed integer;
  v_locked_until timestamptz;
  v_attempt_limit constant integer := 5;
  v_lock_minutes constant integer := 15;
begin
  if v_user is null then
    raise exception 'unauthenticated';
  end if;

  if p_pin is null or length(trim(p_pin)) = 0 then
    raise exception 'pin_required';
  end if;

  select "transferPinHash", coalesce("pinFailedAttempts", 0), "pinLockedUntil"
    into v_hash, v_failed, v_locked_until
  from "UserProfile"
  where "authUserId" = v_user
  for update;

  if v_hash is null then
    raise exception 'pin_not_configured';
  end if;

  if v_locked_until is not null and v_locked_until > now() then
    raise exception 'pin_locked';
  end if;

  if crypt(p_pin, v_hash) <> v_hash then
    v_failed := coalesce(v_failed, 0) + 1;
    update "UserProfile"
      set "pinFailedAttempts" = v_failed,
          "pinLockedUntil" = case when v_failed >= v_attempt_limit then now() + (v_lock_minutes || ' minutes')::interval else null end
      where "authUserId" = v_user;
    if v_failed >= v_attempt_limit then
      raise exception 'pin_locked';
    end if;
    raise exception 'invalid_pin';
  end if;

  update "UserProfile"
    set "pinFailedAttempts" = 0,
        "pinLockedUntil" = null
    where "authUserId" = v_user;
end;
$$;
