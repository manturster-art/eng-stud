---
name: eng-stud-harness
description: "eng-stud 영어 학습 대시보드의 모듈/콘텐츠 확장을 feature-scaffolder + content-curator + module-reviewer + design-reviewer 4에이전트 파이프라인으로 조율한다. '새 학습 모듈 추가', '학습 페이지 만들기', 'Peppa 시즌 N 표현 추가', '시드 데이터 확장', '동화/팟캐스트/발음 평가 모듈', 'TOEIC 표현 일괄 발췌', '신규 카테고리 추가', '디자인/UX 검토' 등 학습 콘텐츠·기능 확장 요청에 반드시 사용한다. 이전 산출물 기반의 '다시 실행', '부분 수정', '리뷰만 다시', '결과 개선' 요청도 처리. 단순 버그 수정·문구 수정·CSS 조정은 트리거하지 않는다."
---

# eng-stud Harness Orchestrator

## 작업 모드 분류

| 모드 | 키워드 예시 | 파이프라인 |
|------|----------|----------|
| **신규 모듈** | "X 페이지 만들어줘", "X 모듈 추가", "X 기능 넣어줘" | scaffolder → (필요 시 curator) → reviewer |
| **콘텐츠 확장** | "Peppa S2 표현 추가", "일상회화 50개", "비즈니스 카테고리" | curator → reviewer |
| **부분 재실행** | "방금 결과 수정", "리뷰만 다시", "X만 다시 만들어" | 해당 에이전트만 |

## Phase 0: 컨텍스트 확인

1. `_workspace/` 존재 확인
2. 분기:
   - **`_workspace/` 미존재** → 초기 실행, 새로 생성
   - **`_workspace/` 존재 + 사용자가 새 입력** → `_workspace/` → `_workspace_prev/`로 이동, 새 실행
   - **`_workspace/` 존재 + 부분 수정 요청** → 해당 단계만 재실행, 이전 결과 참조 경로를 전달

## Phase 1: 요구사항 파악

오케스트레이터(메인 Claude)가 결정:
- 작업 모드 (신규/콘텐츠/부분)
- 모듈명 (영문 kebab + 한글)
- 데이터 모델 (필드 + 타입 + 한글 라벨)
- 통합 영역 (Dashboard? Predict? Heatmap?)
- 시드 필요 여부 + 규모

불명확하면 `AskUserQuestion`으로 핵심 1~3개만 묻는다. 5개 이상 묻지 않는다.

## Phase 2: 실행

**실행 모드:** 서브 에이전트 (TeamCreate 미지원 환경)

### 신규 모듈 추가
```
1. Agent(feature-scaffolder)
   ├── subagent_type: "general-purpose"
   ├── model: "opus"
   ├── description: "Scaffold X module"
   └── prompt: 모듈명/모델/통합 영역 + .claude/agents/feature-scaffolder.md + .claude/skills/scaffold-feature/SKILL.md 참조 지시
   → _workspace/01_scaffold/ 산출

2. (scaffolder가 _workspace/scaffold-needs-content.md 작성했으면)
   Agent(content-curator)
   ├── model: "opus"
   └── prompt: 시드 명세 + 참조 지시
   → _workspace/02_curate/

3. 병렬 검토 (단일 메시지 내 2개 Agent 호출):
   ├── Agent(module-reviewer) → _workspace/03_review/report.md
   │   ├── 영역: schema↔storage↔routes↔page 정합성, userId, 통합 누락, npm run check
   │   └── model: "opus"
   └── Agent(design-reviewer) → _workspace/03_design/report.md
       ├── 영역: UI 일관성, 한국어 라벨, 모바일 반응형, 접근성, 상태 디자인, 다크모드
       └── model: "opus"
```

### 콘텐츠 확장
```
1. Agent(content-curator) → _workspace/02_curate/
2. Agent(module-reviewer) → _workspace/03_review/
   (콘텐츠만 변경된 경우 design-reviewer 생략 — UI 컴포넌트 변경 없음)
```

### 부분 재실행
해당 단계만 재호출. 이전 산출물 경로를 입력으로 전달.
디자인만 다시 검토하려면 design-reviewer 단독 호출 가능.

## Phase 3: 리뷰 결과 처리

두 reviewer의 보고를 통합한다:
- `_workspace/03_review/report.md` (구조 정합성)
- `_workspace/03_design/report.md` (디자인/UX, 신규 모듈일 때만 존재)

통합 Blocker 합산 후 분기:
- **Blocker 0개**: 두 보고서 요약 + PR 초안 제시 → 승인 시 시드 병합 (필요 시) + 커밋/푸시
- **Blocker N개**:
  - 자동 수정 가능: 각 reviewer가 적용한 결과 합산 보고
  - 재호출 필요: 어느 영역의 Blocker인지 판단하여 scaffolder 또는 curator 1회 재호출
    - 구조 Blocker → scaffolder
    - 디자인 Blocker → scaffolder (UI는 scaffolder 영역)
    - 시드 Blocker → curator
  - 2회째 실패: 사용자에게 수동 결정 요청

## Phase 4: 마무리

1. **CLAUDE.md 변경 이력 갱신**:
   ```markdown
   | YYYY-MM-DD | {요약} | {대상} | {사유} |
   ```
2. **피드백 요청**: "이번 결과에서 개선할 부분이 있나요?"
3. 피드백 시 Phase 7(에이전트/스킬 수정) 트리거

## 데이터 전달 규칙

- 중간 산출물: `_workspace/` 하위 (gitignored)
- 파일명: `{phase}_{agent}/{artifact}.{ext}`
- 최종 코드: 실제 경로 (`shared/`, `server/`, `client/`)
- 시드 데이터 적용: reviewer 통과 후 오케스트레이터가 `_workspace/02_curate/seed-data.ts` → 실제 `server/seed-*.ts` 병합

## 에러 핸들링

| 에러 | 대응 |
|------|------|
| 에이전트 실행 실패 | 1회 재시도, 재실패 시 사용자 보고 후 중단 |
| 타입 체크 실패 | reviewer가 위치/원인 보고 → 자동 fix 시도 → 재실패 시 사용자 결정 |
| 시드 50% 이상 중복 | curator에게 범위 조정 요청 |
| 라우트/테이블명 충돌 | scaffolder에게 이름 변경 요청 |
| Blocker 2회 재호출 실패 | 사용자에게 모든 컨텍스트와 함께 수동 결정 요청 |

## 호출 컨벤션

모든 Agent 호출 시:
```ts
Agent({
  subagent_type: "general-purpose",
  model: "opus",
  description: "<3-5 words>",
  prompt: `
    역할: .claude/agents/{name}.md 참조
    스킬: .claude/skills/{name}/SKILL.md 참조
    
    이번 작업:
    - {모드별 입력}
    - 산출물: _workspace/{phase}_{agent}/
    
    이전 산출물 (있으면): _workspace/{prev}/
  `,
})
```

## 테스트 시나리오

### 정상 흐름 (신규 모듈)
입력: "영어 동화 모듈 추가, 동화 10편 각 핵심 표현 5개"
1. scaffolder가 `stories` 테이블 + storage + routes + Stories 페이지 작성 → `_workspace/01_scaffold/`
2. scaffolder가 `scaffold-needs-content.md` 생성 ("동화 10편 + 각 5표현")
3. curator가 시드 작성 → `_workspace/02_curate/`
4. reviewer가 npm run check + 통합 누락 점검 → `_workspace/03_review/`
5. Blocker 0개 → PR 초안 제시
6. 사용자 승인 → 시드 병합, 커밋, 푸시
7. CLAUDE.md 변경 이력 갱신

### 에러 흐름 (리뷰 실패)
입력: "Peppa S2 E1~E5 표현 시드"
1. curator가 시드 생성 → 일부가 기존과 중복
2. reviewer가 blocker 보고 (중복률 60%)
3. 오케스트레이터가 curator 재호출, 중복 제외 명세 추가
4. curator 재생성, reviewer 통과
5. PR 초안 제시

## 산출물 위치
- 에이전트 정의: `.claude/agents/{feature-scaffolder,content-curator,module-reviewer,design-reviewer}.md`
- 에이전트 스킬: `.claude/skills/{scaffold-feature,curate-content,review-module,review-design}/SKILL.md`
- 오케스트레이터: `.claude/skills/eng-stud-harness/SKILL.md` (이 파일)
- 중간 산출물: `_workspace/` (gitignored)
  - `_workspace/01_scaffold/` — scaffolder 산출
  - `_workspace/02_curate/` — curator 산출
  - `_workspace/03_review/` — module-reviewer 산출 (구조 정합성)
  - `_workspace/03_design/` — design-reviewer 산출 (디자인/UX)
- 변경 이력: `CLAUDE.md`
