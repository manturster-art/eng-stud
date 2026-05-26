# 배포 가이드 — Railway

이 프로젝트는 React + Vite SPA + Express + SQLite(better-sqlite3) 구조입니다.
SQLite는 영구 디스크가 필요하므로 Vercel 같은 서버리스 플랫폼에는 부적합합니다.
**Railway**가 Node 자동 빌드 + 영구 볼륨 + GitHub 자동 배포를 모두 지원해 가장 적합합니다.

## 1) Railway 프로젝트 생성

1. https://railway.app 가입 (GitHub 로그인)
2. **New Project → Deploy from GitHub repo** 선택
3. `manturster-art/eng-stud` 선택, 브랜치 `claude/english-learning-peppa-pig-a24is` (또는 머지된 main)
4. Nixpacks가 `railway.json`을 읽고 자동으로 `npm ci → npm run build → npm start` 실행

## 2) 영구 볼륨 추가 (SQLite 데이터 보존)

서비스 페이지 → **Variables** 탭 옆 **Volumes** → **+ New Volume**
- Mount path: `/data`
- Size: 1GB (시작 충분)

> 볼륨 없이 배포하면 재배포·인스턴스 재시작 시 사용자 데이터가 초기화됩니다.

## 3) 환경변수 설정

서비스 페이지 → **Variables** 탭에서 다음 추가:

| 변수 | 값 | 비고 |
|------|-----|------|
| `JWT_SECRET` | `openssl rand -hex 48` 로 생성한 긴 랜덤 문자열 | 필수 (운영에서 기본값 사용 금지) |
| `DATABASE_PATH` | `/data/data.db` | 볼륨 마운트 경로와 일치 |
| `GOOGLE_CLIENT_ID` | 본인 Google OAuth Client ID | 데모 기본값 사용해도 동작은 함, 운영용은 본인 ID 권장 |
| `NODE_ENV` | `production` | Railway가 보통 자동 주입하지만 안전하게 명시 |

`PORT`는 Railway가 자동 주입하므로 **설정하지 말 것**.

## 4) Google OAuth 도메인 등록

배포 후 Railway가 발급한 URL(예: `https://eng-stud-production.up.railway.app`)을
Google Cloud Console에서 추가해야 로그인이 동작합니다.

1. https://console.cloud.google.com/apis/credentials
2. 사용 중인 OAuth 2.0 Client ID 클릭
3. **Authorized JavaScript origins** 에 Railway URL 추가
4. (필요 시) **Authorized redirect URIs** 도 동일 URL 추가
5. 저장 → 반영까지 몇 분 소요될 수 있음

> 본인 Client ID를 따로 안 만들고 코드 기본값(`server/auth.ts:9`)을 그대로 쓰면
> Authorized origins에 도메인 추가가 불가능하므로 운영에서는 본인 Client ID 발급 권장.

## 5) 첫 배포 확인

- Railway Deployments 탭에서 빌드 로그 확인
- `healthcheckPath: /api/auth/config` 가 200 응답해야 통과 (railway.json 설정)
- 배포 완료 후 발급 URL로 접속 → Google 로그인 → 표현 학습 페이지에서 60개 Peppa 표현 확인

## 6) 데이터 백업 (선택)

Railway 영구 볼륨은 자동 백업되지 않습니다. 정기 백업이 필요하면:
- Railway CLI: `railway run sqlite3 /data/data.db ".backup /tmp/backup.db"` 후 다운로드
- 또는 cron job 서비스 추가

## 비용

- Hobby Plan ($5/월)에 트라이얼 크레딧 포함, 이 규모(SQLite + Express) 운영에는 충분
- 더 큰 트래픽이면 Pro Plan 검토

## 문제 발생 시

- 빌드 실패: `npm run build` 로컬에서 먼저 재현
- 런타임 에러: Railway Deployments → Logs 탭
- DB 초기화: `DATABASE_PATH` 환경변수가 볼륨 마운트 경로와 일치하는지 확인
- 로그인 실패: Google Console의 Authorized origins에 정확한 Railway 도메인이 포함됐는지 확인 (https 포함, 끝 슬래시 없음)
