-- claim_beta_slot: atomically increments beta_signups if under the cap.
-- Returns the new total_users value, or null if cap was already reached.
create or replace function public.claim_beta_slot()
returns int
language plpgsql
security definer
as $$
declare
  new_total int;
begin
  update public.beta_signups
  set total_users = total_users + 1
  where total_users < 100
  returning total_users into new_total;

  return new_total; -- null if no row was updated (cap reached)
end;
$$;

-- increment_session_usage: increments sessions_used and minutes_used for a user.
create or replace function public.increment_session_usage(p_user_id uuid, p_minutes numeric)
returns void
language plpgsql
security definer
as $$
begin
  update public.user_quota
  set
    sessions_used = sessions_used + 1,
    minutes_used  = minutes_used + p_minutes
  where user_id = p_user_id;
end;
$$;
