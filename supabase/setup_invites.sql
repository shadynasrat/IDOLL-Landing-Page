-- Tables
create table if not exists public.early_access (
  email text primary key,
  approved boolean default false,
  approved_at timestamptz
);

create table if not exists public.invites (
  code text primary key,
  normalized_code text unique not null,
  note text,
  active boolean default true,
  max_uses integer,
  uses integer default 0,
  expires_at timestamptz
);

-- RLS
alter table public.early_access enable row level security;
alter table public.invites enable row level security;

-- Policies
-- Authenticated users can read their own approval status
create policy if not exists "read_own_early_access"
on public.early_access for select
to authenticated
using (email = auth.email());

-- Only admins can read/manage invites via RLS. We'll gate by JWT app_metadata.role = 'admin'
create policy if not exists "admin_read_invites"
on public.invites for select
to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy if not exists "admin_write_invites"
on public.invites for all
to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Secure function to redeem invites; runs as definer
create or replace function public.redeem_invite(code_input text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := (auth.jwt() ->> 'email');
  v_now timestamptz := now();
  v_code text := replace(lower(coalesce(code_input, '')), '-', '');
  v_ok boolean := false;
begin
  if v_email is null then
    return false;
  end if;

  -- Validate and claim one use atomically
  perform 1 from public.invites i
   where i.normalized_code = v_code
     and i.active is true
     and (i.expires_at is null or i.expires_at > v_now)
     and (i.max_uses is null or i.uses < i.max_uses)
   for update;

  if found then
    -- Upsert approval
    insert into public.early_access(email, approved, approved_at)
    values (v_email, true, v_now)
    on conflict (email) do update set approved = excluded.approved, approved_at = excluded.approved_at;

    -- Increment uses
    update public.invites
       set uses = coalesce(uses,0) + 1
     where normalized_code = v_code;

    v_ok := true;
  end if;

  return v_ok;
end;
$$;

-- Allow authenticated users to call redeem_invite
revoke all on function public.redeem_invite(text) from public;
grant execute on function public.redeem_invite(text) to authenticated;

-- Helper: create an initial invite (example)
-- insert into public.invites (code, normalized_code, note, max_uses)
-- values ('IDOLL-ALPHA-2024', replace(lower('IDOLL-ALPHA-2024'), '-', ''), 'Alpha cohort', 100)
-- on conflict (code) do nothing;

