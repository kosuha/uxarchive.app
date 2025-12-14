set search_path = storage;

-- 버킷 이름을 바꾸려면 아래 상수를 수정하세요.
-- 예: select set_config('app.capture_bucket', 'custom-bucket', true);
-- 여기서는 기본값으로 'ux-archive-captures'를 사용합니다.

-- 읽기 정책 --------------------------------------------------------
drop policy if exists "captures read" on storage.objects;
create policy "captures read" on storage.objects
for select
using (
  bucket_id = 'ux-archive-captures'
  and (
    auth.role() = 'service_role'
    or exists (
      select 1
      from public.captures c
      join public.patterns p on p.id = c.pattern_id
      where c.storage_path = objects.name
        and (p.is_public or public.is_workspace_member(p.workspace_id))
    )
  )
);

drop policy if exists "captures write" on storage.objects;
create policy "captures write" on storage.objects
for insert
with check (
  bucket_id = 'ux-archive-captures'
  and (
    auth.role() = 'service_role'
    or exists (
      select 1
      from public.captures c
      join public.patterns p on p.id = c.pattern_id
      where c.storage_path = objects.name
        and public.workspace_has_min_role(p.workspace_id, 'editor')
    )
  )
);
drop policy if exists "captures update" on storage.objects;
create policy "captures update" on storage.objects
for update
using (
  bucket_id = 'ux-archive-captures'
  and (
    auth.role() = 'service_role'
    or exists (
      select 1
      from public.captures c
      join public.patterns p on p.id = c.pattern_id
      where c.storage_path = objects.name
        and public.workspace_has_min_role(p.workspace_id, 'editor')
    )
  )
)
with check (
  bucket_id = 'ux-archive-captures'
  and (
    auth.role() = 'service_role'
    or exists (
      select 1
      from public.captures c
      join public.patterns p on p.id = c.pattern_id
      where c.storage_path = objects.name
        and public.workspace_has_min_role(p.workspace_id, 'editor')
    )
  )
);

drop policy if exists "captures delete" on storage.objects;
create policy "captures delete" on storage.objects
for delete
using (
  bucket_id = 'ux-archive-captures'
  and (
    auth.role() = 'service_role'
    or exists (
      select 1
      from public.captures c
      join public.patterns p on p.id = c.pattern_id
      where c.storage_path = objects.name
        and public.workspace_has_min_role(p.workspace_id, 'editor')
    )
  )
);
