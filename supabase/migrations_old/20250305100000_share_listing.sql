-- Share listing columns, trigger, view, and indexes
set search_path = public;
set check_function_bodies = off;

alter table public.patterns
  add column if not exists published boolean not null default false,
  add column if not exists published_at timestamptz,
  add column if not exists unpublished_at timestamptz,
  add column if not exists public_url text,
  add column if not exists thumbnail_url text,
  add column if not exists views bigint not null default 0 check (views >= 0);

comment on column public.patterns.published is '공개 목록 노출 여부 (Publish to listing).';
comment on column public.patterns.published_at is '목록 게시 일시.';
comment on column public.patterns.unpublished_at is '목록 내림 일시.';
comment on column public.patterns.public_url is '퍼블릭 접근 URL(선택).';
comment on column public.patterns.thumbnail_url is '목록 썸네일 URL(선택).';
comment on column public.patterns.views is '조회수(공개 목록용).';

create or replace function public.normalize_pattern_sharing_state()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if coalesce(new.is_public, false) = false then
    new.published := false;
    new.published_at := null;
  end if;

  if new.published = true and (old is null or coalesce(old.published, false) = false) then
    if new.published_at is null then
      new.published_at := timezone('utc', now());
    end if;
    new.unpublished_at := null;
  elsif (old is not null and coalesce(old.published, false) = true) and new.published = false then
    new.unpublished_at := timezone('utc', now());
  end if;

  new.updated_at := timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists trg_patterns_normalize_sharing on public.patterns;
create trigger trg_patterns_normalize_sharing
before insert or update on public.patterns
for each row execute procedure public.normalize_pattern_sharing_state();

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

comment on view public.pattern_public_listing is '공개 목록(/share) 노출용 패턴 뷰: is_public=true AND published=true만 포함.';

create index if not exists patterns_share_listing_idx
  on public.patterns (is_public, published, published_at desc, updated_at desc);

create index if not exists patterns_share_views_idx
  on public.patterns (views desc);

-- Update RLS to allow public read when explicitly shared + published
alter table public.patterns enable row level security;

drop policy if exists "patterns readable" on public.patterns;
create policy "patterns readable" on public.patterns
for select
using (
  public.is_workspace_member(workspace_id)
  or is_public
  or (is_public and published)
  or auth.role() = 'service_role'
);

-- Keep existing write policy; other policies remain unchanged
