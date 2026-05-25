---
name: review-module
description: "eng-stud의 신규 모듈/콘텐츠 추가 산출물을 검토한다. schema↔storage↔routes↔page 경계면 shape 일치, userId 스코프, Predict/Heatmap/네비게이션 통합 누락, 시드 마이그레이션, npm run check 통과를 검증한다. scaffolder 또는 curator의 산출물이 _workspace/에 작성된 후 자동 호출. '방금 추가한 모듈 검증', 'PR 만들기 전 점검' 요청에도 사용."
---

# Review Module — 통합 정합성 검증

## 작업 흐름

### Phase 0: 검토 대상 확인
- `_workspace/01_scaffold/summary.md` 읽고 변경 파일 목록 파악
- `_workspace/02_curate/summary.md` 읽고 시드 변경 파악
- 둘 다 있으면 통합 검토

### Phase 1: 경계면 정합성 (Critical)

각 경계의 두 파일을 **동시 읽기**로 검증한다.

#### A. schema ↔ storage
- schema의 컬럼명/타입과 CREATE TABLE 블록 일치
- 새 컬럼이 있으면 `safeAlter` 누락 검사
- 인덱스 누락 검사 (userId 포함된 인덱스)

#### B. storage ↔ routes
- IStorage 인터페이스와 DatabaseStorage 구현 일치
- 라우트의 storage 호출 시그니처 일치 (userId 인자 누락 검사)
- zod 스키마(`insertXSchema`)와 storage `Insert*` 타입 일치

#### C. routes ↔ page
- `useQuery({ queryKey: ["/api/x"] })` 경로와 실제 라우트 일치
- 응답 shape과 컴포넌트가 사용하는 필드 일치
- `apiRequest("PATCH", "/api/x/:id", body)` body shape이 zod 검증 통과 가능한지

#### D. 컴포넌트 ↔ 컴포넌트
- Props 타입 일치
- 공유 상태(예: 모달 prop)

### Phase 2: 횡단 관심사 (모든 신규 코드)

| 체크 항목 | 확인 방법 |
|----------|----------|
| 모든 storage 쿼리에 `eq(table.userId, userId)` | grep |
| 모든 라우트에 `app.use("/api/x", requireAuth)` | grep |
| zod 검증 (`safeParse`) | grep |
| TanStack `onSuccess: invalidateQueries` | grep |
| 모든 UI 문자열 한국어 | 페이지 파일 검토 |
| `data-testid` 인터랙티브 요소에 부여 | grep `onClick=` 후 testid 짝 확인 |

### Phase 3: 통합 누락 검사

| 영역 | 트리거 조건 | 확인 |
|------|----------|------|
| App.tsx 라우트 | 신규 페이지 | `<Route path="/x" component={XPage} />` |
| AppShell navItems | 신규 페이지 | 항목 추가됨, testId 부여됨 |
| 모바일 바텀 5개 한도 | navItems 6개 이상 | 우선순위 재배치 결정 명시 |
| Dashboard KPI | 학습 활동 모듈 | StatCard 추가 + grid 컬럼 수 조정 |
| Predict 가중치 | 진척 기여 모듈 | `predictGoal()` 가중치, breakdown 필드, breakdownItems |
| Heatmap | 일일 활동 기여 | `totalActivityMin()` 가산 |
| seedUserData | 시드 필요 | storage.ts 확장 + auth.ts 호출 수정 |

### Phase 4: 시드 데이터 검토 (curate 산출물일 때)

- [ ] 영문 표현 3~6단어 (롱폼 검출)
- [ ] 한글 번역 자연스러움 (자동번역 톤 검출)
- [ ] 카테고리 일관성
- [ ] 기존 시드와 중복 검사
- [ ] 출처 라벨 형식 일치
- [ ] 신규 카테고리 근거 검토

### Phase 5: 실행 검증

```bash
npm run check  # 필수
```

대규모 변경(파일 5개 이상 수정)이면 추가:
```bash
npm run build
```

실패 시 정확한 메시지와 위치를 보고. 임의 수정 금지.

### Phase 6: 출력

`_workspace/03_review/report.md`:
```markdown
# Review Report — {YYYY-MM-DD HH:MM}

## 검출 이슈

### Blocker (반드시 수정)
- `server/routes.ts:120` — POST /api/x 에 requireAuth 누락

### Warning (수정 권장)
- `client/src/pages/X.tsx:45` — data-testid 누락 (button-action)

### Suggestion (선택)
- `client/src/pages/X.tsx` — KPI 카드 색상 톤 통일 검토

## 자동 수정 적용
- `client/src/App.tsx`: `<Route path="/x" component={XPage} />` 추가
- `client/src/components/AppShell.tsx`: navItems 항목 추가

## 수동 결정 필요
- 신규 페이지가 6번째 nav이므로 모바일 바텀 5개 중 하나 제외 필요. 후보: Quiz / Predict

## 최종 검증
- npm run check: ✅
- 통합 누락: 0개

## PR 메시지 초안
feat: add {모듈명} module

{한국어 요약 1~2문장}
```

## 자동 수정 가능 범위 (보수적)

다음만 자동 수정:
- import 누락
- App.tsx 라우트 등록
- AppShell navItems 항목 추가
- requireAuth 미들웨어 적용

다음은 자동 수정 금지 (수동 결정 항목으로):
- 비즈니스 로직 변경
- UI 레이아웃 수정
- 가중치·임계값 조정
- 한글 라벨·번역 수정
- 모바일 바텀 우선순위 재배치

## 협업
- Blocker 발견 → 오케스트레이터에게 해당 에이전트 1회 재호출 요청
- 모두 통과 → PR 초안 제공, 오케스트레이터가 사용자 승인 받음

## 절대 하지 말 것
- 산출물 자체를 다시 작성
- `npm run check` 생략
- Blocker를 Warning으로 다운그레이드
- 모호한 영역을 자동 수정
