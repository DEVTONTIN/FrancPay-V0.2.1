create or replace function public.verify_user_handle(
  p_handle text
) returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_normalized_handle text;
  v_exists boolean;
begin
  v_normalized_handle := lower(regexp_replace(coalesce(p_handle, ''), '^@', ''));
  if v_normalized_handle = '' then
    return false;
  end if;

  select exists (
    select 1
    from "UserProfile"
    where lower("username") = v_normalized_handle
      and "authUserId" is not null
  )
  into v_exists;

  return coalesce(v_exists, false);
end;
$$;
