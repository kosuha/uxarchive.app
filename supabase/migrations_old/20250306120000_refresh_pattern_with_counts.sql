-- Refresh pattern_with_counts view to include sharing/publish columns
set search_path = public;
set check_function_bodies = off;

drop view if exists public.pattern_with_counts;

create view public.pattern_with_counts as
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
  p.id,
  p.workspace_id,
  p.folder_id,
  p.name,
  p.service_name,
  p.summary,
  p.author,
  p.is_public,
  p.published,
  p.published_at,
  p.unpublished_at,
  p.public_url,
  p.thumbnail_url,
  p.views,
  p.is_archived,
  p.created_by,
  p.created_at,
  p.updated_at,
  coalesce(cc.capture_count, 0) as capture_count,
  coalesce(ic.insight_count, 0) as insight_count
from public.patterns p
left join capture_counts cc on cc.pattern_id = p.id
left join insight_counts ic on ic.pattern_id = p.id;

comment on view public.pattern_with_counts is '패턴별 캡쳐/인사이트 카운트와 게시/공유 상태를 함께 제공하는 뷰';

-- ensure view keeps invoker security
alter view public.pattern_with_counts set (security_invoker = true);
