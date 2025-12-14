set search_path = public;

create or replace function public.workspace_role_priority(role text)
returns integer
language sql
immutable
as $$
  select case role
    when 'owner' then 3
    when 'editor' then 2
    when 'viewer' then 1
    else 0
  end;
$$;

create or replace function public.workspace_has_min_role(target_workspace_id uuid, min_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when auth.role() = 'service_role' then true
      when target_workspace_id is null then false
      else coalesce(max(public.workspace_role_priority(role)), 0) >= public.workspace_role_priority(min_role)
    end
  from public.workspace_members
  where workspace_id = target_workspace_id
    and profile_id = auth.uid();
$$;

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.workspace_has_min_role(target_workspace_id, 'viewer');
$$;

-- Profiles ----------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles self access" on public.profiles;
create policy "profiles self access" on public.profiles
for select
using (auth.uid() = id or auth.role() = 'service_role');

drop policy if exists "profiles self insert" on public.profiles;
create policy "profiles self insert" on public.profiles
for insert
with check (auth.uid() = id or auth.role() = 'service_role');

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
for update
using (auth.uid() = id or auth.role() = 'service_role')
with check (auth.uid() = id or auth.role() = 'service_role');

-- Workspaces --------------------------------------------------------
alter table public.workspaces enable row level security;

drop policy if exists "workspaces readable" on public.workspaces;
create policy "workspaces readable" on public.workspaces
for select
using (public.is_workspace_member(id) or auth.role() = 'service_role');

drop policy if exists "workspaces create" on public.workspaces;
create policy "workspaces create" on public.workspaces
for insert
with check (
  (auth.uid() = created_by and auth.uid() is not null)
  or auth.role() = 'service_role'
  or auth.role() = 'supabase_admin'
  or coalesce(current_setting('app.bypass_profile_bootstrap', true), '') = '1'
);

drop policy if exists "workspaces update" on public.workspaces;
create policy "workspaces update" on public.workspaces
for update
using (public.workspace_has_min_role(id, 'owner') or auth.role() = 'service_role')
with check (public.workspace_has_min_role(id, 'owner') or auth.role() = 'service_role');

drop policy if exists "workspaces delete" on public.workspaces;
create policy "workspaces delete" on public.workspaces
for delete
using (public.workspace_has_min_role(id, 'owner') or auth.role() = 'service_role');

-- Workspace members -------------------------------------------------
alter table public.workspace_members enable row level security;

drop policy if exists "workspace_members readable" on public.workspace_members;
create policy "workspace_members readable" on public.workspace_members
for select
using (public.is_workspace_member(workspace_id) or auth.role() = 'service_role');

drop policy if exists "workspace_members manage" on public.workspace_members;
create policy "workspace_members manage" on public.workspace_members
for all
using (public.workspace_has_min_role(workspace_id, 'owner') or auth.role() = 'service_role')
with check (public.workspace_has_min_role(workspace_id, 'owner') or auth.role() = 'service_role');

drop policy if exists "workspace_members bootstrap" on public.workspace_members;
create policy "workspace_members bootstrap" on public.workspace_members
for insert
with check (
  (
    auth.uid() = workspace_members.profile_id
    and exists (
      select 1
      from public.workspaces w
      where w.id = workspace_members.workspace_id
        and w.created_by = auth.uid()
    )
  )
  or auth.role() = 'service_role'
  or auth.role() = 'supabase_admin'
  or coalesce(current_setting('app.bypass_profile_bootstrap', true), '') = '1'
);

-- Folders -----------------------------------------------------------
alter table public.folders enable row level security;

drop policy if exists "folders readable" on public.folders;
create policy "folders readable" on public.folders
for select
using (public.is_workspace_member(workspace_id) or auth.role() = 'service_role');

drop policy if exists "folders write" on public.folders;
create policy "folders write" on public.folders
for all
using (public.workspace_has_min_role(workspace_id, 'editor') or auth.role() = 'service_role')
with check (public.workspace_has_min_role(workspace_id, 'editor') or auth.role() = 'service_role');

-- Patterns ----------------------------------------------------------
alter table public.patterns enable row level security;

drop policy if exists "patterns readable" on public.patterns;
create policy "patterns readable" on public.patterns
for select
using (public.is_workspace_member(workspace_id) or is_public or auth.role() = 'service_role');

drop policy if exists "patterns write" on public.patterns;
create policy "patterns write" on public.patterns
for all
using (public.workspace_has_min_role(workspace_id, 'editor') or auth.role() = 'service_role')
with check (public.workspace_has_min_role(workspace_id, 'editor') or auth.role() = 'service_role');

-- Tags --------------------------------------------------------------
alter table public.tags enable row level security;

drop policy if exists "tags readable" on public.tags;
create policy "tags readable" on public.tags
for select
using (public.is_workspace_member(workspace_id) or auth.role() = 'service_role');

drop policy if exists "tags write" on public.tags;
create policy "tags write" on public.tags
for all
using (public.workspace_has_min_role(workspace_id, 'editor') or auth.role() = 'service_role')
with check (public.workspace_has_min_role(workspace_id, 'editor') or auth.role() = 'service_role');

-- Pattern tags ------------------------------------------------------
alter table public.pattern_tags enable row level security;

drop policy if exists "pattern_tags readable" on public.pattern_tags;
create policy "pattern_tags readable" on public.pattern_tags
for select
using (
  exists (
    select 1
    from public.patterns p
    where p.id = pattern_tags.pattern_id
      and public.is_workspace_member(p.workspace_id)
  )
  or auth.role() = 'service_role'
);

drop policy if exists "pattern_tags write" on public.pattern_tags;
create policy "pattern_tags write" on public.pattern_tags
for all
using (
  exists (
    select 1
    from public.patterns p
    where p.id = pattern_tags.pattern_id
      and public.workspace_has_min_role(p.workspace_id, 'editor')
  )
  or auth.role() = 'service_role'
)
with check (
  exists (
    select 1
    from public.patterns p
    where p.id = pattern_tags.pattern_id
      and public.workspace_has_min_role(p.workspace_id, 'editor')
  )
  or auth.role() = 'service_role'
);

-- Captures ----------------------------------------------------------
alter table public.captures enable row level security;

drop policy if exists "captures readable" on public.captures;
create policy "captures readable" on public.captures
for select
using (
  exists (
    select 1
    from public.patterns p
    where p.id = captures.pattern_id
      and public.is_workspace_member(p.workspace_id)
  )
  or auth.role() = 'service_role'
);

drop policy if exists "captures write" on public.captures;
create policy "captures write" on public.captures
for all
using (
  exists (
    select 1
    from public.patterns p
    where p.id = captures.pattern_id
      and public.workspace_has_min_role(p.workspace_id, 'editor')
  )
  or auth.role() = 'service_role'
)
with check (
  exists (
    select 1
    from public.patterns p
    where p.id = captures.pattern_id
      and public.workspace_has_min_role(p.workspace_id, 'editor')
  )
  or auth.role() = 'service_role'
);

-- Insights ----------------------------------------------------------
alter table public.insights enable row level security;

drop policy if exists "insights readable" on public.insights;
create policy "insights readable" on public.insights
for select
using (
  exists (
    select 1
    from public.captures c
    join public.patterns p on p.id = c.pattern_id
    where c.id = insights.capture_id
      and public.is_workspace_member(p.workspace_id)
  )
  or auth.role() = 'service_role'
);

drop policy if exists "insights write" on public.insights;
create policy "insights write" on public.insights
for all
using (
  exists (
    select 1
    from public.captures c
    join public.patterns p on p.id = c.pattern_id
    where c.id = insights.capture_id
      and public.workspace_has_min_role(p.workspace_id, 'editor')
  )
  or auth.role() = 'service_role'
)
with check (
  exists (
    select 1
    from public.captures c
    join public.patterns p on p.id = c.pattern_id
    where c.id = insights.capture_id
      and public.workspace_has_min_role(p.workspace_id, 'editor')
  )
  or auth.role() = 'service_role'
);
