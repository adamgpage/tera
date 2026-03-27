-- Trigger: when a request status changes to 'confirmed', invoke the matching engine.
-- This uses pg_net to call the run-matching Edge Function.
-- Note: pg_net must be enabled and the function URL configured.

create or replace function public.trigger_matching_on_confirm()
returns trigger as $$
declare
  base_url text;
  service_key text;
begin
  -- Only fire when status changes TO 'confirmed'
  if new.status = 'confirmed' and (old.status is null or old.status != 'confirmed') then
    -- Get the Supabase URL from a config table or hardcode for now
    -- In production, these would come from vault secrets or a config table
    base_url := current_setting('app.settings.supabase_url', true);
    service_key := current_setting('app.settings.service_role_key', true);

    -- If settings aren't configured, skip silently
    -- The retry-unmatched cron will pick it up
    if base_url is not null and service_key is not null then
      perform net.http_post(
        url := base_url || '/functions/v1/run-matching',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || service_key,
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object('requestId', new.id)
      );
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Only create the trigger if it doesn't already exist
do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'on_request_confirmed'
  ) then
    create trigger on_request_confirmed
      after update on public.requests
      for each row
      when (new.status = 'confirmed')
      execute function public.trigger_matching_on_confirm();
  end if;
end;
$$;
