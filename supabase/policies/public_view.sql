-- 공개/멤버 접근을 분리한 RLS + 뷰 호출자 권한 전환
begin;

set search_path = public;

-- 1) 뷰를 SECURITY INVOKER로 전환 (기존 정의 유지)
alter view public.pattern_with_counts set (security_invoker = true);

-- 2) RLS 활성화
alter table public.patterns enable row level security;
alter table public.captures enable row level security;
alter table public.insights enable row level security;

-- 3) 정책 재정의 (drop 후 create)
drop policy if exists "public patterns readable by anyone" on public.patterns;
drop policy if exists "members can read workspace patterns" on public.patterns;
drop policy if exists "public captures readable" on public.captures;
drop policy if exists "public insights readable" on public.insights;

-- 공개 패턴은 익명/로그인 모두 조회 허용
create policy "public patterns readable by anyone" on public.patterns
  for select using (is_public);

-- 워크스페이스 멤버는 비공개 포함 조회
create policy "members can read workspace patterns" on public.patterns
  for select using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = public.patterns.workspace_id
        and wm.profile_id = auth.uid()
    )
  );

-- 캡처: 패턴이 공개이거나 멤버일 때만 조회
create policy "public captures readable" on public.captures
  for select using (
    exists (
      select 1 from public.patterns p
      where p.id = public.captures.pattern_id
        and (
          p.is_public
          or exists (
            select 1 from public.workspace_members wm
            where wm.workspace_id = p.workspace_id
              and wm.profile_id = auth.uid()
          )
        )
    )
  );

-- 인사이트: 상위 패턴이 공개이거나 멤버일 때만 조회
create policy "public insights readable" on public.insights
  for select using (
    exists (
      select 1
      from public.captures c
      join public.patterns p on p.id = c.pattern_id
      where c.id = public.insights.capture_id
        and (
          p.is_public
          or exists (
            select 1 from public.workspace_members wm
            where wm.workspace_id = p.workspace_id
              and wm.profile_id = auth.uid()
          )
        )
    )
  );

-- 4) 공개 조회 허용용 권한 부여 (필요 시 조정)
grant usage on schema public to anon, authenticated;
grant select on public.pattern_with_counts to anon, authenticated;
grant select on public.patterns, public.captures, public.insights to anon, authenticated;

commit;
