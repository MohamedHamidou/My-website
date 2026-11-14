-- 0005_shared_homes_and_invites.sql
-- Homes, memberships, and invitations for roommate/flatmate sharing

create table if not exists public.homes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.home_members (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  unique (home_id, user_id)
);

create table if not exists public.home_invitations (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes (id) on delete cascade,
  invited_by uuid not null references public.profiles (id) on delete cascade,
  email text,
  token text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'cancelled')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

create index if not exists homes_created_by_idx on public.homes (created_by);
create index if not exists home_members_home_id_idx on public.home_members (home_id);
create index if not exists home_members_user_id_idx on public.home_members (user_id);
create index if not exists home_invitations_token_idx on public.home_invitations (token);
create index if not exists home_invitations_home_id_idx on public.home_invitations (home_id);

-- Set updated_at trigger
drop trigger if exists homes_set_updated_at on public.homes;
create trigger homes_set_updated_at
before update on public.homes
for each row
execute function public.set_updated_at();

-- Helper function: check membership with SECURITY DEFINER to prevent RLS recursion
create or replace function public.is_home_member(check_home_id uuid, check_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.home_members
    where home_id = check_home_id
      and user_id = check_user_id
  );
$$;

-- Enable RLS
alter table public.homes enable row level security;
alter table public.home_members enable row level security;
alter table public.home_invitations enable row level security;

-- Policies: homes
drop policy if exists "Users can view homes they are members of" on public.homes;
drop policy if exists "Users can view homes they created or belong to" on public.homes;
create policy "Users can view homes they created or belong to"
  on public.homes for select
  using (
    created_by = auth.uid()
    or public.is_home_member(id, auth.uid())
  );

drop policy if exists "Users can insert a home" on public.homes;
create policy "Users can insert a home"
  on public.homes for insert
  with check (auth.uid() = created_by);

drop policy if exists "Owners can update their home" on public.homes;
create policy "Owners can update their home"
  on public.homes for update
  using (
    created_by = auth.uid()
    or (public.is_home_member(id, auth.uid()) and exists (
      select 1 from public.home_members where home_id = homes.id and user_id = auth.uid() and role = 'owner'
    ))
  );

drop policy if exists "Owners can delete their home" on public.homes;
create policy "Owners can delete their home"
  on public.homes for delete
  using (created_by = auth.uid());

-- Policies: home_members
drop policy if exists "Users can view members of their home" on public.home_members;
create policy "Users can view members of their home"
  on public.home_members for select
  using (
    user_id = auth.uid()
    or public.is_home_member(home_id, auth.uid())
  );

drop policy if exists "Users can add themselves to a home" on public.home_members;
create policy "Users can add themselves to a home"
  on public.home_members for insert
  with check (auth.uid() = user_id);

drop policy if exists "Members can leave or owners can remove members" on public.home_members;
create policy "Members can leave or owners can remove members"
  on public.home_members for delete
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.home_members hm
      where hm.home_id = home_members.home_id
        and hm.user_id = auth.uid()
        and hm.role = 'owner'
    )
  );

-- Policies: home_invitations
drop policy if exists "Members can view invitations for their home" on public.home_invitations;
create policy "Members can view invitations for their home"
  on public.home_invitations for select
  using (
    public.is_home_member(home_id, auth.uid())
    or status = 'pending'
  );

drop policy if exists "Members can create invitations" on public.home_invitations;
create policy "Members can create invitations"
  on public.home_invitations for insert
  with check (
    auth.uid() = invited_by
    and public.is_home_member(home_id, auth.uid())
  );

drop policy if exists "Members can update their home invitations" on public.home_invitations;
create policy "Members can update their home invitations"
  on public.home_invitations for update
  using (public.is_home_member(home_id, auth.uid()));

-- Profiles policy: allow roommates to view each other's names and emails
drop policy if exists "Users can view housemates profiles" on public.profiles;
create policy "Users can view housemates profiles"
  on public.profiles for select
  using (
    id = auth.uid()
    or exists (
      select 1 from public.home_members hm
      where hm.user_id = profiles.id
        and public.is_home_member(hm.home_id, auth.uid())
    )
  );

-- RPC: create home atomically and securely
create or replace function public.create_home(home_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_home public.homes%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.homes (name, created_by)
  values (trim(home_name), auth.uid())
  returning * into v_home;

  insert into public.home_members (home_id, user_id, role)
  values (v_home.id, auth.uid(), 'owner')
  on conflict (home_id, user_id) do nothing;

  return to_jsonb(v_home);
end;
$$;

-- RPC: fetch my home and membership safely
create or replace function public.get_my_home()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member record;
  v_home record;
begin
  if auth.uid() is null then
    return null;
  end if;

  select * into v_member
  from public.home_members
  where user_id = auth.uid()
  limit 1;

  if v_member is null then
    return null;
  end if;

  select * into v_home
  from public.homes
  where id = v_member.home_id;

  if v_home is null then
    return null;
  end if;

  return jsonb_build_object(
    'home', to_jsonb(v_home),
    'membership', to_jsonb(v_member)
  );
end;
$$;

-- RPC: fetch housemates with profile information
create or replace function public.get_home_members(target_home_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_home_member(target_home_id, auth.uid()) then
    raise exception 'Not authorized';
  end if;

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', hm.id,
          'home_id', hm.home_id,
          'user_id', hm.user_id,
          'role', hm.role,
          'joined_at', hm.joined_at,
          'profile', jsonb_build_object(
            'id', p.id,
            'email', p.email,
            'name', p.name
          )
        )
        order by hm.joined_at asc
      )
      from public.home_members hm
      left join public.profiles p on p.id = hm.user_id
      where hm.home_id = target_home_id
    ),
    '[]'::jsonb
  );
end;
$$;

-- RPC: join home via token
create or replace function public.join_home_by_token(invite_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite record;
  v_home record;
  v_existing_membership record;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_invite
  from public.home_invitations
  where upper(token) = upper(trim(invite_token))
    and status = 'pending'
    and expires_at > now()
  limit 1;

  if v_invite is null then
    raise exception 'Invalid or expired invitation code';
  end if;

  select * into v_home
  from public.homes
  where id = v_invite.home_id;

  select * into v_existing_membership
  from public.home_members
  where home_id = v_invite.home_id
    and user_id = auth.uid();

  if v_existing_membership is not null then
    return jsonb_build_object(
      'home_id', v_home.id,
      'home_name', v_home.name,
      'already_member', true
    );
  end if;

  insert into public.home_members (home_id, user_id, role)
  values (v_invite.home_id, auth.uid(), 'member');

  update public.home_invitations
  set status = 'accepted'
  where id = v_invite.id;

  return jsonb_build_object(
    'home_id', v_home.id,
    'home_name', v_home.name,
    'already_member', false
  );
end;
$$;
