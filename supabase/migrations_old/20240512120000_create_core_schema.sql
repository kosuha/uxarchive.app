-- Supabase core schema for UX Archive
set check_function_bodies = off;
set client_min_messages = warning;
set search_path = public;

create extension if not exists "pgcrypto";

-- Profiles ----------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now())
);

comment on table public.profiles is 'Supabase Auth 사용자와 매핑되는 UX Archive 프로필입니다.';

-- Workspaces --------------------------------------------------------
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.workspaces is '워크스페이스(조직) 메타데이터';

-- Workspace members -------------------------------------------------
create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  joined_at timestamptz not null default timezone('utc', now()),
  favorite_pattern_ids uuid[] default null,
  primary key (workspace_id, profile_id)
);

comment on table public.workspace_members is '워크스페이스 사용자 멤버십 및 권한';

-- Folders -----------------------------------------------------------
create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  parent_id uuid references public.folders(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists folders_workspace_idx on public.folders (workspace_id);
create index if not exists folders_parent_idx on public.folders (parent_id);

-- Patterns ----------------------------------------------------------
create table if not exists public.patterns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  folder_id uuid references public.folders(id) on delete set null,
  name text not null,
  service_name text not null,
  summary text not null,
  author text not null,
  is_public boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  is_archived boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists patterns_workspace_idx on public.patterns (workspace_id);
create index if not exists patterns_folder_idx on public.patterns (folder_id);
create index if not exists patterns_created_by_idx on public.patterns (created_by);

-- Tags --------------------------------------------------------------
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  label text not null,
  type text not null check (type in ('service-category', 'pattern-type', 'custom')),
  color text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  unique (workspace_id, label)
);

create index if not exists tags_workspace_idx on public.tags (workspace_id);

-- Pattern tags (many-to-many) --------------------------------------
create table if not exists public.pattern_tags (
  pattern_id uuid not null references public.patterns(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  applied_at timestamptz not null default timezone('utc', now()),
  primary key (pattern_id, tag_id)
);

create index if not exists pattern_tags_tag_idx on public.pattern_tags (tag_id);

-- Captures ----------------------------------------------------------
create table if not exists public.captures (
  id uuid primary key default gen_random_uuid(),
  pattern_id uuid not null references public.patterns(id) on delete cascade,
  storage_path text not null,
  public_url text,
  media_type text not null default 'image' check (media_type in ('image', 'video')),
  mime_type text not null default 'image/jpeg',
  duration_seconds numeric(10,2),
  poster_storage_path text,
  order_index integer not null,
  width integer,
  height integer,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists captures_pattern_idx on public.captures (pattern_id);
create index if not exists captures_order_idx on public.captures (pattern_id, order_index);

-- Insights ----------------------------------------------------------
create table if not exists public.insights (
  id uuid primary key default gen_random_uuid(),
  capture_id uuid not null references public.captures(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  x numeric(5,2) not null check (x >= 0 and x <= 100),
  y numeric(5,2) not null check (y >= 0 and y <= 100),
  note text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists insights_capture_idx on public.insights (capture_id);
create index if not exists insights_author_idx on public.insights (author_id);

-- Derived view ------------------------------------------------------
create or replace view public.pattern_with_counts as
with capture_counts as (
  select pattern_id, count(*)::bigint as capture_count
  from public.captures
  group by pattern_id
), insight_counts as (
  select c.pattern_id, count(i.id)::bigint as insight_count
  from public.insights i
  join public.captures c on c.id = i.capture_id
  group by c.pattern_id
)
select
  p.*,
  coalesce(cc.capture_count, 0) as capture_count,
  coalesce(ic.insight_count, 0) as insight_count
from public.patterns p
left join capture_counts cc on cc.pattern_id = p.id
left join insight_counts ic on ic.pattern_id = p.id;

comment on view public.pattern_with_counts is '패턴별 캡쳐/인사이트 카운트를 제공하는 뷰';

-- Capture public URL helper ----------------------------------------
create or replace function public.resolve_storage_public_url(storage_path text)
returns text
language sql
stable
set search_path = public
as $$
  select case
    when coalesce(current_setting('app.storage_public_base_url', true), '') = '' then storage_path
    else concat(rtrim(coalesce(current_setting('app.storage_public_base_url', true), ''), '/'), '/', storage_path)
  end;
$$;

comment on function public.resolve_storage_public_url is '세션 변수 app.storage_public_base_url 값으로 스토리지 경로를 절대 경로로 변환';

-- Search helper -----------------------------------------------------
create or replace function public.search_patterns(search_text text, target_workspace_id uuid default null)
returns table (
  pattern_id uuid,
  workspace_id uuid,
  rank real
)
language sql
stable
set search_path = public
as $$
  with query_input as (
    select nullif(trim(coalesce(search_text, '')), '')::text as normalized_text
  ),
  ts_query as (
    select plainto_tsquery('simple', normalized_text) as query
    from query_input
  ),
  tag_vectors as (
    select pt.pattern_id,
           to_tsvector('simple', string_agg(t.label, ' ' order by t.label)) as tag_vector
    from public.pattern_tags pt
    join public.tags t on t.id = pt.tag_id
    group by pt.pattern_id
  ),
  pattern_documents as (
    select p.id,
           p.workspace_id,
           (
             setweight(to_tsvector('simple', coalesce(p.name, '')), 'A') ||
             setweight(to_tsvector('simple', coalesce(p.service_name, '')), 'B') ||
             setweight(to_tsvector('simple', coalesce(p.summary, '')), 'C') ||
             setweight(coalesce(tv.tag_vector, to_tsvector('simple', '')), 'D')
           ) as document
    from public.patterns p
    left join tag_vectors tv on tv.pattern_id = p.id
    where target_workspace_id is null or p.workspace_id = target_workspace_id
  )
  select pd.id as pattern_id,
         pd.workspace_id,
         ts_rank(pd.document, tq.query, 32) as rank
  from pattern_documents pd
  cross join ts_query tq
  where tq.query <> ''::tsquery
    and pd.document @@ tq.query
  order by rank desc, pd.id
$$;

comment on function public.search_patterns(search_text text, target_workspace_id uuid) is '패턴명/서비스명/요약/태그를 통합 검색하는 헬퍼 함수';

-- Indexes to support text search -----------------------------------
create index if not exists patterns_search_idx on public.patterns using gin (
  to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(service_name, '') || ' ' || coalesce(summary, ''))
);

create index if not exists tags_label_search_idx on public.tags using gin (to_tsvector('simple', coalesce(label, '')));

-- Include shared RLS policies
\ir '../policies/workspace_rls.sql'
