-- Update pattern_public_listing view to exclude patterns without images
-- Also updates author name to use username from profiles if available

drop view if exists public.pattern_public_listing;

create or replace view public.pattern_public_listing
with (security_barrier = true, security_invoker = true)
as
select
  p.id,
  p.workspace_id,
  p.name as title,
  p.service_name as service,
  coalesce(pr.username, p.author) as author,
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
left join public.profiles pr on pr.id = p.created_by
left join public.pattern_tags pt on pt.pattern_id = p.id
left join public.tags t on t.id = pt.tag_id and t.is_active = true
where p.is_public = true
  and p.is_archived = false
  and exists (select 1 from public.captures c where c.pattern_id = p.id)
group by p.id, pr.username;

comment on view public.pattern_public_listing is 'Public listing view with statistics (filtered to patterns with captures)';
