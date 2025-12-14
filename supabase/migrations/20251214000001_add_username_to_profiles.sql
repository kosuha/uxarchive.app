-- Add username and bio columns to profiles table
alter table public.profiles 
add column if not exists username text,
add column if not exists bio text;

-- Create unique index on username
create unique index if not exists profiles_username_idx on public.profiles (username);

-- Function to generate a random username (fallback)
create or replace function public.generate_unique_username(base_name text)
returns text
language plpgsql
as $$
declare
  new_username text;
  counter integer := 0;
begin
  -- First try: just the base name (sanitized)
  new_username := regexp_replace(lower(base_name), '[^a-z0-9_]', '', 'g');
  
  -- If empty or too short after sanitization, use a default
  if length(new_username) < 3 then
    new_username := 'user';
  end if;

  -- Check if exists, if so append random number
  loop
    begin
      -- Attempt check
      if not exists (select 1 from public.profiles where username = new_username) then
        return new_username;
      end if;
      
      -- If exists, append random suffix
      new_username := regexp_replace(lower(base_name), '[^a-z0-9_]', '', 'g') || floor(random() * 10000)::text;
    exception when others then
      -- Fallback
      return 'user_' || floor(random() * 1000000)::text;
    end;
    
    counter := counter + 1;
    if counter > 10 then
        -- Giving up on nice name, use UUID part
        return 'user_' || floor(random() * 10000000)::text;
    end if;
  end loop;
end;
$$;

-- Backfill existing profiles with a generated username
do $$
declare
  r record;
  new_uname text;
begin
  for r in select * from public.profiles where username is null loop
    new_uname := public.generate_unique_username(coalesce(r.display_name, 'user'));
    
    update public.profiles
    set username = new_uname
    where id = r.id;
  end loop;
end;
$$;

-- Now make username not null
alter table public.profiles alter column username set not null;

-- Update the handle_new_auth_user function to auto-generate username
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid := new.id;
  v_display_name text;
  v_username text;
  v_avatar_url text;
  v_workspace_name text;
  v_workspace_id uuid;
begin
  perform set_config('app.bypass_profile_bootstrap', '1', true);
  v_display_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(coalesce(new.email, 'UX Archive user'), '@', 1),
    'UX Archive user'
  );
  v_avatar_url := new.raw_user_meta_data->>'avatar_url';
  
  -- Generate username from display name or email prefix
  v_username := regexp_replace(lower(v_display_name), '[^a-z0-9_]', '', 'g');
  if length(v_username) < 3 then
     v_username := 'user_' || substr(md5(random()::text), 1, 6);
  end if;
  
  -- Simple check for collision
  if exists (select 1 from public.profiles where username = v_username) then
     v_username := v_username || '_' || substr(md5(random()::text), 1, 4);
  end if;

  insert into public.profiles (id, display_name, username, avatar_url)
  values (v_profile_id, v_display_name, v_username, v_avatar_url)
  on conflict (id) do update
    set display_name = excluded.display_name,
        avatar_url = excluded.avatar_url;

  if exists (
    select 1
    from public.workspace_members wm
    where wm.profile_id = v_profile_id
  ) then
    return new;
  end if;

  v_workspace_name := coalesce(v_display_name, 'Default workspace') || ' workspace';

  insert into public.workspaces (name, description, created_by)
  values (v_workspace_name, 'Automatically created default workspace', v_profile_id)
  returning id into v_workspace_id;

  insert into public.workspace_members (workspace_id, profile_id, role)
  values (v_workspace_id, v_profile_id, 'owner')
  on conflict do nothing;

  return new;
end;
$$;

-- Update pattern_public_listing view to include author_id (created_by)
drop view if exists public.pattern_public_listing;
create or replace view public.pattern_public_listing
with (security_barrier = true, security_invoker = true)
as
select
  p.id,
  p.workspace_id,
  p.name as title,
  p.service_name as service,
  p.author,
  p.summary,
  p.created_by as author_id,
  p.is_public as sharing_enabled,
  p.published,
  p.published_at,
  p.updated_at,
  p.public_url,
  p.thumbnail_url,
  p.views,
  coalesce(array_remove(array_agg(distinct t.label), null), '{}') as tags
from public.patterns p
left join public.pattern_tags pt on pt.pattern_id = p.id
left join public.tags t on t.id = pt.tag_id and t.is_active = true
where p.is_public = true
  and p.published = true
  and p.is_archived = false
group by p.id;

comment on view public.pattern_public_listing is '공개 목록(/share) 노출용 패턴 뷰: author_id 포함.';
