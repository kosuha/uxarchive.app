set search_path = public;

-- 구독/플랜 스냅샷 컬럼 추가 ----------------------------------------------
alter table public.profiles
  add column if not exists plan_code text not null default 'free',
  add column if not exists plan_status text not null default 'active' check (plan_status in ('active', 'trialing', 'past_due', 'canceled')),
  add column if not exists renewal_at timestamptz,
  add column if not exists cancel_at timestamptz,
  add column if not exists ls_customer_id text,
  add column if not exists ls_subscription_id text;

comment on column public.profiles.plan_code is '현재 가입된 플랜 코드';
comment on column public.profiles.plan_status is '플랜 상태 (active/trialing/past_due/canceled)';
comment on column public.profiles.renewal_at is '다음 결제 예정 일시';
comment on column public.profiles.cancel_at is '구독 취소 예정 일시';
comment on column public.profiles.ls_customer_id is 'Lemon Squeezy customer ID';
comment on column public.profiles.ls_subscription_id is 'Lemon Squeezy subscription ID';

create index if not exists profiles_plan_code_idx on public.profiles (plan_code);
create unique index if not exists profiles_ls_customer_id_key on public.profiles (ls_customer_id) where ls_customer_id is not null;
create unique index if not exists profiles_ls_subscription_id_key on public.profiles (ls_subscription_id) where ls_subscription_id is not null;

-- 플랜 메타 매핑 테이블 ---------------------------------------------------
create table if not exists public.plan_variants (
  plan_code text primary key,
  ls_variant_id text unique,
  limits jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.plan_variants is '플랜 코드와 Lemon Squeezy variant 매핑 및 제한치 저장';
comment on column public.plan_variants.plan_code is '내부 플랜 코드';
comment on column public.plan_variants.ls_variant_id is 'Lemon Squeezy variant ID';
comment on column public.plan_variants.limits is '플랜별 제한 정보(JSON)';

-- 기본 무료 플랜 시드
insert into public.plan_variants (plan_code, ls_variant_id, limits)
values ('free', null, '{}'::jsonb)
on conflict (plan_code) do nothing;

-- 결제 이벤트 멱등 처리 테이블 -------------------------------------------
create table if not exists public.plan_events (
  event_id text primary key,
  handled_at timestamptz not null default timezone('utc', now())
);

comment on table public.plan_events is '플랜/결제 이벤트 멱등 기록 테이블';
comment on column public.plan_events.event_id is '외부 이벤트 고유 ID';
comment on column public.plan_events.handled_at is '이벤트 처리 시각';

-- RLS: 서비스 롤 전용 접근
alter table public.plan_variants enable row level security;
alter table public.plan_events enable row level security;

drop policy if exists "plan_variants service manage" on public.plan_variants;
create policy "plan_variants service manage" on public.plan_variants
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "plan_events service manage" on public.plan_events;
create policy "plan_events service manage" on public.plan_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
