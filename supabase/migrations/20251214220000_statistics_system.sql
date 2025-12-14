-- Add statistics columns to patterns table
alter table public.patterns
add column if not exists view_count integer default 0 not null,
add column if not exists like_count integer default 0 not null,
add column if not exists fork_count integer default 0 not null,
add column if not exists original_pattern_id uuid references public.patterns(id) on delete set null;

-- Index for original_pattern_id to speed up fork count lookups
create index if not exists patterns_original_pattern_id_idx on public.patterns(original_pattern_id);

-- Create pattern_likes table
create table if not exists public.pattern_likes (
    pattern_id uuid references public.patterns(id) on delete cascade,
    user_id uuid references auth.users(id) on delete cascade,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    primary key (pattern_id, user_id)
);

-- Enable RLS on pattern_likes
alter table public.pattern_likes enable row level security;

-- Policies for pattern_likes
create policy "Users can view all likes"
    on public.pattern_likes for select
    using (true);

create policy "Users can toggle their own likes"
    on public.pattern_likes for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Function to increment view count safely
create or replace function public.increment_view_count(p_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.patterns
  set view_count = view_count + 1
  where id = p_id;
end;
$$;

-- Function to toggle like
create or replace function public.toggle_like(p_id uuid)
returns boolean -- Returns true if liked, false if unliked
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_liked boolean;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from public.pattern_likes where pattern_id = p_id and user_id = v_user_id) then
    delete from public.pattern_likes where pattern_id = p_id and user_id = v_user_id;
    update public.patterns set like_count = like_count - 1 where id = p_id;
    v_liked := false;
  else
    insert into public.pattern_likes (pattern_id, user_id) values (p_id, v_user_id);
    update public.patterns set like_count = like_count + 1 where id = p_id;
    v_liked := true;
  end if;

  return v_liked;
end;
$$;

-- Function/Trigger to auto-update fork count when a pattern is created with original_pattern_id
create or replace function public.handle_new_fork()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.original_pattern_id is not null then
    update public.patterns
    set fork_count = fork_count + 1
    where id = new.original_pattern_id;
  end if;
  return new;
end;
$$;

create trigger on_pattern_forked
  after insert on public.patterns
  for each row
  execute function public.handle_new_fork();

-- Update pattern_public_listing view to include stats
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
  p.view_count as views,
  p.like_count,
  p.fork_count,
  coalesce(array_remove(array_agg(distinct t.label), null), '{}') as tags
from public.patterns p
left join public.pattern_tags pt on pt.pattern_id = p.id
left join public.tags t on t.id = pt.tag_id and t.is_active = true
where p.is_public = true
  and p.published = true
  and p.is_archived = false
group by p.id;

comment on view public.pattern_public_listing is 'Public listing view with statistics';
