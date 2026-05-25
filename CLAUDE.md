# CLAUDE.md

## 하네스: eng-stud (영어 학습 대시보드)

**목표:** Peppa Pig 에피소드·TOEIC 400문장·표현(PlayPhrase)·학습 로그·예측 모델로 구성된 영어 학습 대시보드의 모듈/콘텐츠 확장을 일관된 패턴으로 자동화한다.

**트리거:** 학습 모듈 추가·콘텐츠 시드 확장 요청 시 `eng-stud-harness` 스킬을 사용한다. 단순 버그 수정·문구·CSS 조정은 직접 처리한다.

**팀 구성 (서브 에이전트 파이프라인):**
- `.claude/agents/feature-scaffolder.md` — schema → storage → routes → page 4단 풀스택 스캐폴딩
- `.claude/agents/content-curator.md` — 시드 데이터 큐레이션 (PlayPhrase 최적화 + 자연스러운 한글)
- `.claude/agents/module-reviewer.md` — 경계면 정합성·통합 누락·npm run check 검증

**변경 이력:**
| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-05-25 | 초기 하네스 구성 | 전체 | feature/content/review 3에이전트 파이프라인 신규 |
