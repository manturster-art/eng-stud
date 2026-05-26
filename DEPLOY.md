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
| `INVITE_CODE` | 본인이 정한 초대코드 (예: `peppa-invite-2026`) | 가입 게이팅. 친구/가족에게 URL과 함께 공유 |
| `JWT_SECRET` | `openssl rand -hex 48` 로 생성한 긴 랜덤 문자열 | 필수 (운영에서 기본값 사용 금지) |
| `DATABASE_PATH` | `/data/data.db` | 볼륨 마운트 경로와 일치 |

> `NODE_ENV`는 **설정하지 말 것** — start 스크립트가 인라인으로 production을 설정함. 빌드 시 dev deps 누락 방지.
> `PORT`도 Railway가 자동 주입하므로 **설정하지 말 것**.

## 4) 로그인 방식

### 사용자명+비밀번호 (기본)

각 사용자는 본인이 정한 사용자명+비밀번호로 가입·로그인하며, 모든 데이터는
사용자별로 분리됩니다.

**가입 흐름:**
1. URL 접속 → "회원가입" 탭
2. 사용자명(영문/숫자/-/_ 3~32자) + 비밀번호(6자 이상) + 초대코드 입력
3. 자동 로그인 → 본인 대시보드 진입

**가입 닫기:** Variables에서 `INVITE_CODE` 제거 → 로그인 탭만 노출되고 "회원가입" 탭은 비활성화.

**첫 사용자 (관리자) 데이터 인수:** 만약 이전에 ACCESS_PASSWORD 기반 단일 사용자로
데이터를 만들었다면, 첫 신규 가입자가 자동으로 그 데이터를 인수받습니다.
(부팅 시 일회성 마이그레이션이 실행됨)

### Google OAuth (선택, 더 이상 권장 안 함)

코드에는 남아있지만 UI에서는 노출 안 됨. 활성화하려면 본인 Google Client ID
발급 + `GOOGLE_CLIENT_ID` 변수 설정 + Login.tsx 수정 필요.

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
