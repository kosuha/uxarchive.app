set search_path = public;

-- Prevent the default pattern seed function from inserting a null summary that violates constraints
create or replace function public.seed_workspace_default_pattern(
  target_workspace_id uuid,
  created_by_profile_id uuid default null,
  workspace_label text default null,
  template_pattern_id uuid default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pattern_id uuid;
  v_has_patterns boolean;
  v_workspace_name text := coalesce(nullif(workspace_label, ''), 'New workspace');
  v_summary text := 'Sample pattern to help you start your workspace.';
  v_default_template_pattern_id constant uuid := 'dc724d0c-64d8-4cdb-adf9-5469f7bcbc63';
  v_template_pattern_id uuid := coalesce(template_pattern_id, v_default_template_pattern_id);
  v_template_record public.patterns%rowtype;
  v_author_name text;
begin
  if target_workspace_id is null then
    return null;
  end if;

  select exists(
    select 1
    from public.patterns
    where workspace_id = target_workspace_id
    limit 1
  ) into v_has_patterns;

  if coalesce(v_has_patterns, false) then
    return null;
  end if;

  if v_template_pattern_id is not null then
    select *
    into v_template_record
    from public.patterns
    where id = v_template_pattern_id;
  end if;

  if created_by_profile_id is not null then
    select coalesce(display_name, 'UX Archive user')
    into v_author_name
    from public.profiles
    where id = created_by_profile_id;
  end if;

  v_author_name := coalesce(v_author_name, 'UX Archive user');

  if v_template_record.id is not null then
    insert into public.patterns (
      workspace_id,
      folder_id,
      name,
      service_name,
      summary,
      author,
      created_by,
      is_public,
      is_archived
    )
    values (
      target_workspace_id,
      null,
      coalesce(v_template_record.name, 'Getting started pattern'),
      coalesce(v_template_record.service_name, 'Sample onboarding flow'),
      coalesce(v_template_record.summary, v_summary),
      coalesce(v_author_name, v_template_record.author, 'UX Archive Team'),
      created_by_profile_id,
      false,
      false
    )
    returning id into v_pattern_id;
  else
    insert into public.patterns (
      workspace_id,
      folder_id,
      name,
      service_name,
      summary,
      author,
      created_by,
      is_public,
      is_archived
    )
    values (
      target_workspace_id,
      null,
      'Getting started pattern',
      'Sample onboarding flow',
      v_summary,
      v_author_name,
      created_by_profile_id,
      false,
      false
    )
    returning id into v_pattern_id;
  end if;

  return v_pattern_id;
end;
$$;

comment on function public.seed_workspace_default_pattern(uuid, uuid, text, uuid) is
  'If a workspace has no patterns, create the specified template or the default sample pattern.';
