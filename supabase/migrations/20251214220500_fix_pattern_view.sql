-- Refresh pattern_with_counts view to include new statistics columns
drop view if exists public.pattern_with_counts cascade;
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
  p.view_count,
  p.like_count,
  p.fork_count,
  p.original_pattern_id,
  p.is_archived,
  p.created_by,
  p.created_at,
  p.updated_at,
  coalesce(cc.capture_count, 0) as capture_count,
  coalesce(ic.insight_count, 0) as insight_count
from public.patterns p
left join capture_counts cc on cc.pattern_id = p.id
left join insight_counts ic on ic.pattern_id = p.id;

-- Ensure view security
alter view public.pattern_with_counts set (security_invoker = true);
