-- ============================================================
-- PATCH: Fix RLS recursion on home_members & apply all RPCs
-- Run this in Supabase SQL Editor (safe to re-run multiple times)
-- ============================================================

-- Step 1: SECURITY DEFINER helper (bypasses RLS to prevent recursion)
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

-- Step 2: Drop ALL old home_members policies (old ones cause recursion)
drop policy if exists "Users can view members of their home" on public.home_members;
drop policy if exists "home_members_select" on public.home_members;
drop policy if exists "Users can see their own membership" on public.home_members;
drop policy if exists "Members can see other members" on public.home_members;

-- Step 3: Recreate home_members SELECT policy using the SECURITY DEFINER helper
create policy "Users can view members of their home"
  on public.home_members for select
  using (
    user_id = auth.uid()
    or public.is_home_member(home_id, auth.uid())
  );

-- Step 4: Drop ALL old homes policies
drop policy if exists "Users can view homes they are members of" on public.homes;
drop policy if exists "Users can view homes they created or belong to" on public.homes;

-- Step 5: Recreate homes SELECT policy
create policy "Users can view homes they created or belong to"
  on public.homes for select
  using (
    created_by = auth.uid()
    or public.is_home_member(id, auth.uid())
  );

-- Step 6: Ensure other home_members policies exist
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

-- Step 7: Ensure homes INSERT/UPDATE/DELETE policies exist
drop policy if exists "Users can insert a home" on public.homes;
create policy "Users can insert a home"
  on public.homes for insert
  with check (auth.uid() = created_by);

drop policy if exists "Owners can update their home" on public.homes;
create policy "Owners can update their home"
  on public.homes for update
  using (created_by = auth.uid());

drop policy if exists "Owners can delete their home" on public.homes;
create policy "Owners can delete their home"
  on public.homes for delete
  using (created_by = auth.uid());

-- Step 8: home_invitations policies
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

-- Step 9: RPC: create_home (atomic, security definer)
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

-- Step 10: RPC: get_my_home (security definer, no RLS recursion)
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

-- Step 11: RPC: get_home_members (security definer)
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

-- Step 12: RPC: join_home_by_token
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

-- ============================================================
-- Verification: run these to confirm everything is working
-- ============================================================
-- select public.is_home_member(gen_random_uuid(), gen_random_uuid());
-- → should return: false
--
-- select public.get_my_home();
-- → should return: null (if not in a home) or a JSON object
-- ============================================================

