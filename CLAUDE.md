# CLAUDE.md

## 하네스: eng-stud (영어 학습 대시보드)

**목표:** Peppa Pig 에피소드·TOEIC 400문장·표현(PlayPhrase)·학습 로그·예측 모델로 구성된 영어 학습 대시보드의 모듈/콘텐츠 확장을 일관된 패턴으로 자동화한다.

**트리거:** 학습 모듈 추가·콘텐츠 시드 확장 요청 시 `eng-stud-harness` 스킬을 사용한다. 단순 버그 수정·문구·CSS 조정은 직접 처리한다.

**팀 구성 (서브 에이전트 파이프라인):**
- `.claude/agents/feature-scaffolder.md` — schema → storage → routes → page 4단 풀스택 스캐폴딩
- `.claude/agents/content-curator.md` — 시드 데이터 큐레이션 (PlayPhrase 최적화 + 자연스러운 한글)
- `.claude/agents/module-reviewer.md` — 경계면 정합성·통합 누락·npm run check 검증
- `.claude/agents/design-reviewer.md` — UI 일관성·한국어 라벨·모바일 반응형·접근성·상태 디자인·다크모드 검증 (module-reviewer와 병렬)

**변경 이력:**
| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-05-25 | 초기 하네스 구성 | 전체 | feature/content/review 3에이전트 파이프라인 신규 |
| 2026-05-25 | design-reviewer 추가 | agents/design-reviewer.md, skills/review-design, orchestrator | UX·디자인 검증 영역 분리, module-reviewer와 병렬 실행 |
| 2026-05-26 | Peppa S2 E1~E10 표현 30개 시드 추가 | server/seed-peppa-phrases.ts | curator → reviewer 파이프라인 1차 가동, 중복 0건, npm run check 통과 |
| 2026-05-26 | Friends S1 E1~E10 표현 40개 시드 + UI 통합 | server/seed-friends-phrases.ts, storage.ts, auth.ts, Phrases.tsx, schema.ts | 성인 일상 회화 컨텐츠 확장. curator → module/design-reviewer 병렬, rose 톤 채택, sourceLabel truncate + Tabs 가로 스크롤 자동 수정 |
| 2026-05-27 | Business 표현 50개 + UI 종합 개선 | server/seed-business-phrases.ts, storage.ts, auth.ts, Phrases.tsx, AppShell.tsx, Dashboard.tsx, StudyLog.tsx, Settings.tsx, Predict.tsx, Toeic.tsx, not-found.tsx | 비즈니스 회화 5개 카테고리(phone/email/meeting/smalltalk/negotiation) 신규 + slate 톤. 모바일 바텀 네비 Quiz 포함(Peppa 제외), Dashboard 오늘 액션 카드 상단 승격, 종결어미 통일, 누락 title, StudyLog 터치 타겟, not-found 색상 토큰. design-reviewer 종합 감사 결과 반영 |
| 2026-05-27 | 사용자 피드백 3건 반영 | Toeic.tsx, Phrases.tsx, Dashboard.tsx, AppShell.tsx | 마스터리 별점 → 가로 버튼 그룹(h-7 w-7) 변환으로 모바일 터치 타겟 강화. KPI 카드(TOEIC/Peppa/표현)에 href 추가하여 페이지 이동 가능. Dashboard 상단에 "오늘 볼 영상" 페파 카드 추가(violet 톤, 진행중/대기 에피소드 자동 추천). 모바일 상단 바에 로그아웃 버튼 추가 |
| 2026-05-27 | Oracle Cloud 마이그레이션 사전 준비 | Dockerfile, .dockerignore, ORACLE_DEPLOY.md | Railway $5/월 회피 위한 Oracle Cloud Always Free 이전 준비. Multi-stage Dockerfile(builder + slim runtime), 영구 볼륨 /data 마운트, 헬스체크 포함. 단계별 가이드(가입·인스턴스·방화벽·Docker·도메인·Cloudflare Tunnel·idle 회피·마이그레이션) 작성. Railway는 그대로 운영, 가입·셋업 후 이전 |
| 2026-06-13 | 보안·정확성 종합 검토 반영 | auth.ts, routes.ts, index.ts, storage.ts, Quiz/StudyLog/Phrases/Toeic/Peppa/Settings/Dashboard.tsx, PlayPhraseModal.tsx, utils-study.ts | 백엔드+프론트엔드 module-reviewer 병렬 감사 결과 전부 수정. 보안: JWT_SECRET production 폴백 제거(부팅 가드), express-rate-limit(/api/auth 15분 20회), 에러/토큰 로깅 일반화, body 100kb. 데이터: study_logs (user_id,date) 유니크+ON CONFLICT, peppa/toeic/phrases 자연키 유니크+INSERT OR IGNORE, 퀴즈 통계 서버 원자적 증분 엔드포인트. 정확성: :id NaN 400 처리, SRS 간격 off-by-one, Quiz 선택지 중복 제거, StudyLog 렌더중 setState→useEffect, PlayPhrase 타이머 ref화, 마스터리 버튼 토글, onError 토스트, 날짜 타임존 경계. 로컬 검증 완료(부팅 가드·rate limit·유니크·증분) |
