set search_path = public;

-- Auto profile & workspace creation trigger ---------------------------------
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_auth_user;
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid := new.id;
  v_display_name text;
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

  insert into public.profiles (id, display_name, avatar_url)
  values (v_profile_id, v_display_name, v_avatar_url)
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

comment on function public.handle_new_auth_user is 'Automatically creates a profile and default workspace when a new Supabase auth.users record is inserted.';

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_auth_user();
