# UX Archive Web

## 개요

UX Archive 웹앱은 Next.js 14 + shadcn/ui 기반으로 제작되며, Supabase Database/Storage를 백엔드로 사용합니다. 다중 사용자 협업과 캡처 파일 업로드를 위해 Supabase 프로젝트와 환경 변수를 먼저 구성해야 합니다.

## Supabase 프로젝트 생성

1. [Supabase 대시보드](https://supabase.com/dashboard)에 로그인 후 `New project`를 선택합니다.
2. 조직과 프로젝트 이름(예: `ux-archive`)을 지정하고 지역은 이미지 업로드 지연을 고려해 가까운 리전을 선택합니다.
3. 데이터베이스 비밀번호를 생성해 안전한 비밀 관리 도구(1Password, Bitwarden 등)에 보관합니다.
4. 프로젝트가 준비되면 `Project Settings → API`에서 `Project URL`, `anon key`, `service_role key`를 확인해 둡니다.
5. `Storage → Buckets`에서 `ux-archive-captures`와 같이 앱에서 사용할 버킷을 하나 생성합니다.

> ⚠️ `service_role key`와 DB 비밀번호는 서버 전용 시크릿입니다. Git, 클라이언트 번들, Issue 등에 절대 공유하지 마세요.

## 환경 변수 설정

1. `web/.env.example` 또는 `.example.env.local`을 참고하여 `web/.env.local` 파일을 만듭니다.
2. Supabase 대시보드에서 복사한 값으로 빈 칸을 채웁니다.
3. 로컬 개발 환경에서는 `.env.local`만 사용하고, 저장소에는 커밋하지 않습니다.

| 변수 | 설명 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL (`https://<project-ref>.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 프론트엔드에서 사용할 익명 키 |
| `SUPABASE_PROJECT_ID` | Supabase Project Reference (예: `abcd1234`) |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버에서만 사용하는 service_role 키 |
| `SUPABASE_DB_PASSWORD` | 프로젝트 생성 시 지정한 Postgres 비밀번호 |
| `SUPABASE_STORAGE_BUCKET` | 업로드에 사용할 Storage 버킷 이름 |
| `SUPABASE_STORAGE_REGION` | 선택 사항, 버킷이 위치한 리전(예: `ap-northeast-2`) |

## 배포 환경 비밀 관리

- Vercel, Netlify 등 배포 플랫폼의 프로젝트 설정 페이지에서 위 변수들을 `Environment Variables`로 추가합니다.
- 프론트엔드에서 필요한 값(`NEXT_PUBLIC_*`)만 공개 범위로 설정하고, 나머지는 서버 런타임 전용 시크릿에 저장합니다.
- 환경 변수를 회전해야 할 경우 Supabase 대시보드에서 키를 재발급하고, 배포/로컬 모두 즉시 갱신합니다.

## 개발 서버 실행

필요한 패키지를 설치하고 개발 서버를 실행합니다.

```bash
pnpm install
pnpm dev
```

`http://localhost:3000`에서 앱을 확인할 수 있습니다. 변경 사항은 Hot Reloading으로 즉시 반영됩니다.

## 문제 해결

- 환경 변수가 로드되지 않을 경우 `pnpm dev`를 재시작하고 `.env.local` 파일명이 정확한지 확인합니다.
- Supabase Storage 업로드 권한 문제는 Storage 정책 또는 RLS 설정을 확인하세요.

필요 시 추가 정보는 [Supabase 문서](https://supabase.com/docs)와 [Next.js 문서](https://nextjs.org/docs)를 참고하세요.
