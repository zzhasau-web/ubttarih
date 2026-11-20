create table public.ubt_results (
  id uuid primary key,
  student text not null check (char_length(student) between 3 and 100),
  title text not null,
  correct integer not null,
  total integer not null,
  created_at timestamptz not null default now()
);
create index on public.ubt_results (created_at desc);
alter table public.ubt_results enable row level security;
revoke all on public.ubt_results from anon, authenticated;
grant select, insert, delete on public.ubt_results to service_role;

create table public.ubt_pin_attempts (
  day date primary key,
  failures integer not null default 0
);
alter table public.ubt_pin_attempts enable row level security;
revoke all on public.ubt_pin_attempts from anon, authenticated;

create function public.ubt_check_pin(is_correct boolean) returns boolean
language plpgsql security definer set search_path = '' as $$
declare used integer;
begin
  insert into public.ubt_pin_attempts(day)
    values ((now() at time zone 'UTC')::date) on conflict do nothing;
  select failures into used from public.ubt_pin_attempts
    where day = (now() at time zone 'UTC')::date for update;
  if used >= 10 then return false; end if;
  if not is_correct then
    update public.ubt_pin_attempts set failures = failures + 1
      where day = (now() at time zone 'UTC')::date;
  end if;
  return is_correct;
end;
$$;
revoke all on function public.ubt_check_pin(boolean) from public, anon, authenticated;
grant execute on function public.ubt_check_pin(boolean) to service_role;
create extension if not exists pg_cron;
select cron.schedule('ubt-expire-results', '15 * * * *',
  $$delete from public.ubt_results where created_at <= now() - interval '1 year';
    delete from public.ubt_pin_attempts where day < (now() at time zone 'UTC')::date;$$);
