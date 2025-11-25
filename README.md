# UX Archive Web

## 개요

UX Archive 웹앱은 Next.js 14 + shadcn/ui 기반으로 제작되며, Supabase Database/Storage를 백엔드로 사용합니다. 다중 사용자 협업과 캡처 파일 업로드를 위해 Supabase 프로젝트와 환경 변수를 먼저 구성해야 합니다.

## Supabase 프로젝트 생성

1. [Supabase 대시보드](https://supabase.com/dashboard)에 로그인 후 `New project`를 선택합니다.
2. 조직과 프로젝트 이름(예: `ux-archive`)을 지정하고 지역은 이미지 업로드 지연을 고려해 가까운 리전을 선택합니다.
3. 데이터베이스 비밀번호를 생성해 안전한 비밀 관리 도구(1Password, Bitwarden 등)에 보관합니다.
4. 프로젝트가 준비되면 `Project Settings → API`에서 `Project URL`, `publishable key`, `secret key`를 확인해 둡니다.
5. `Storage → Buckets`에서 `ux-archive-captures`와 같이 앱에서 사용할 버킷을 하나 생성합니다.

> ⚠️ `secret key`와 DB 비밀번호는 서버 전용 시크릿입니다. Git, 클라이언트 번들, Issue 등에 절대 공유하지 마세요.

## 환경 변수 설정

1. `web/.env.example` 또는 `.example.env.local`을 참고하여 `web/.env.local` 파일을 만듭니다.
2. Supabase 대시보드에서 복사한 값으로 빈 칸을 채웁니다.
3. 로컬 개발 환경에서는 `.env.local`만 사용하고, 저장소에는 커밋하지 않습니다.

| 변수 | 설명 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL (`https://<project-ref>.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 프론트엔드에서 사용할 공개 키 |
| `SUPABASE_PROJECT_ID` | Supabase Project Reference (예: `abcd1234`) |
| `SUPABASE_SECRET_KEY` | 서버에서만 사용하는 secret 키 |
| `SUPABASE_DB_PASSWORD` | 프로젝트 생성 시 지정한 Postgres 비밀번호 |
| `SUPABASE_STORAGE_BUCKET` | 업로드에 사용할 Storage 버킷 이름 |
| `SUPABASE_STORAGE_REGION` | 선택 사항, 버킷이 위치한 리전(예: `ap-northeast-2`) |

### Discord 알림 (서비스는 영어권 대상)

- 로컬/스테이징에서는 **비활성 유지**: `DISCORD_NOTIFY_ENABLED=false`로 두고 웹훅 URL은 비워 둡니다.
- **프로덕션에서만 활성화**: `DISCORD_NOTIFY_ENABLED=true`로 설정하고 아래 웹훅 URL을 채웁니다.
- 프론트엔드에서 데이터베이스에 직접 접근하지 말고 항상 서버 액션/API 라우트를 통해 호출하세요.

| 변수 | 용도 | 권장 기본값 |
| --- | --- | --- |
| `DISCORD_NOTIFY_ENABLED` | Discord 알림 전체 스위치 | 로컬/스테이징은 `false` |
| `DISCORD_WEBHOOK_URL_ERROR` | 오류 알림용 웹훅 (프로덕션) | 로컬에서는 비워 둠 |
| `DISCORD_WEBHOOK_URL_WARNING` | 경고 알림용 웹훅 (프로덕션) | 로컬에서는 비워 둠 |
| `DISCORD_WEBHOOK_URL_PAYMENT` | 결제/청구 알림용 웹훅 (프로덕션) | 로컬에서는 비워 둠 |
| `DISCORD_TIMEOUT_MS` | 웹훅 호출 타임아웃(ms) | `5000` |
| `DISCORD_RETRY_COUNT` | 실패 시 재시도 횟수 | `2` |

**Discord 웹훅 발급 방법**
1. Discord 서버에서 대상 채널을 열고 `Settings → Integrations → Webhooks`로 이동합니다.
2. `error`, `warning`, `payment` 용도로 채널별 웹훅을 각각 생성해 알림 범위를 분리합니다.
3. 프로덕션 시크릿 저장소에 각 웹훅 URL을 해당 환경 변수에 넣어 적용합니다.

### Discord staging webhook manual checklist (error/warning/payment)

이 섹션은 스테이징 채널에서 세 가지 이벤트 타입을 눈으로 확인하기 위한 절차입니다. 프로덕션 웹훅과는 절대 혼동하지 말고, `.env.example`를 참고해 별도의 스테이징 웹훅을 사용하세요.

1. Pre-flight
   - 터미널 세션에서만 `DISCORD_NOTIFY_ENABLED=true` 로 설정하고, 스테이징 웹훅 URL 3종을 환경 변수에 채웁니다.
   - `NODE_ENV=production pnpm test`로 유닛 테스트(재시도/타임아웃/비활성화 경로)를 통과시킵니다.
2. Manual sends (각 명령은 한 번씩 실행)
   - Error:  
     `curl -X POST "$DISCORD_WEBHOOK_URL_ERROR" -H "Content-Type: application/json" -d '{"embeds":[{"title":"Staging error","description":"Simulated processing failure","color":15548997,"fields":[{"name":"Type","value":"error","inline":true},{"name":"Severity","value":"critical","inline":true},{"name":"Workspace","value":"staging-lab","inline":true},{"name":"User","value":"qa-user","inline":true},{"name":"Context","value":"{\"step\":\"sync\",\"action\":\"retry\"}"}],"timestamp":"2024-01-01T00:00:00.000Z"}]}'`
   - Warning:  
     `curl -X POST "$DISCORD_WEBHOOK_URL_WARNING" -H "Content-Type: application/json" -d '{"embeds":[{"title":"Staging warning","description":"Slow response detected","color":16705372,"fields":[{"name":"Type","value":"warning","inline":true},{"name":"Status","value":"degraded","inline":true},{"name":"Workspace","value":"staging-lab","inline":true},{"name":"Context","value":"{\"latency_ms\":1200}"}],"timestamp":"2024-01-01T00:00:10.000Z"}]}'`
   - Payment:  
     `curl -X POST "$DISCORD_WEBHOOK_URL_PAYMENT" -H "Content-Type: application/json" -d '{"embeds":[{"title":"Staging payment","description":"Test invoice paid","color":5763719,"fields":[{"name":"Type","value":"payment","inline":true},{"name":"Status","value":"succeeded","inline":true},{"name":"Transaction","value":"txn_stg_123","inline":true},{"name":"Amount","value":"49 USD","inline":true},{"name":"Workspace","value":"staging-lab","inline":true}],"timestamp":"2024-01-01T00:00:20.000Z"}]}'`
3. 기대 결과
   - Error는 붉은색, Warning은 노란색, Payment는 초록색 임베드 컬러로 표시되고 필드가 모두 보이는지 확인합니다.
   - 메시지 타임스탬프와 필드 순서가 `buildDiscordPayload`와 동일하게 유지되는지 체크합니다.
4. 종료
   - 스테이징 검증이 끝나면 `DISCORD_NOTIFY_ENABLED=false`로 돌려놓고, 스테이징 웹훅 키를 별도 보관소에만 유지합니다.

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
