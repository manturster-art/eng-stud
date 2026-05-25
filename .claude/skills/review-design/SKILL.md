---
name: review-design
description: "eng-stud 신규 페이지/컴포넌트의 디자인 일관성과 UX 품질을 검토한다. UI 패턴 통일성(spacing/KPI 카드/액션 버튼), 정보 위계, 한국어 라벨 가독성, 모바일 반응형(터치 타겟·grid·flex-wrap), 접근성(title/aria), 상태 디자인(empty/loading/error), 다크모드 토큰 사용 여부를 점검한다. scaffolder 산출물이 _workspace/01_scaffold/에 작성된 후 module-reviewer와 병렬 호출. '디자인만 검토', 'UX 점검', '모바일 확인' 요청에도 사용."
---

# Review Design — UX/디자인 검증

## 작업 흐름

### Phase 0: 기준선 흡수
검토 대상을 보기 전, 다음을 읽어 디자인 토큰·패턴 기준선을 잡는다:
- `client/src/pages/Phrases.tsx` (최신 패턴 표준)
- `client/src/pages/Peppa.tsx`
- `client/src/pages/Toeic.tsx`
- `client/src/pages/Dashboard.tsx` (KPI 카드 + Skeleton 패턴)
- `client/src/index.css` (CSS 변수/토큰)
- `tailwind.config.ts` (커스텀 토큰)

목적: 신규 페이지의 spacing·색상·컴포넌트 사용이 기존과 일치하는지 비교 가능한 멘탈모델 구축.

### Phase 1: 디자인 일관성

#### 페이지 컨테이너
표준: `<div className="px-5 sm:px-8 py-6 max-w-{N}xl mx-auto space-y-{N}">`
- max-w는 페이지 성격에 따라 5xl(폼), 6xl(리스트), 7xl(대시보드)
- 누락 또는 임의 변경 → Warning

#### 헤더
표준:
```tsx
<header>
  <h1 className="text-xl font-semibold tracking-tight">{제목}</h1>
  <p className="text-sm text-muted-foreground mt-0.5">{1줄 설명}</p>
</header>
```
- 제목 누락, 설명 영어, 폰트 사이즈 임의 변경 → Warning

#### KPI 카드
표준:
```tsx
<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
  <KPI label="..." value={...} accent="primary|amber|blue|purple" />
</div>
```
- 모바일 1열 → Warning (반응형 깨짐)
- 색상 톤 무계획 → Suggestion

#### 리스트 행
표준: `border rounded-lg p-3 sm:p-4 hover-elevate`
- 다른 스타일 사용 → Warning (페이지 간 일관성)

#### 액션 버튼
표준: `<Button size="sm" className="h-7 px-2 text-xs gap-1">`
- 큰 버튼(size="default") 남용 → Warning
- ghost/outline/default variant 사용 의도 명확한지 확인

### Phase 2: 한국어 UI

#### 라벨 검사
모든 사용자 노출 문자열 grep:
- 영어 라벨 잔존 ("Save", "OK", "Cancel") → Blocker
- 한영 혼용 ("Save 저장") → Warning
- 자동번역 톤 ("스스로를 도우십시오") → Suggestion (curator처럼 자연스러운 의역)

#### 카피 톤
- 토스트 제목: 수동태 일관 ("저장되었습니다", "삭제되었습니다")
- 안내문: 존댓말 ("~해 주세요")
- 에러: 명료한 원인 부연 가능 시 포함

### Phase 3: 모바일 반응형

#### 그리드
- `grid grid-cols-2 sm:grid-cols-N` — 모바일 2열 보장
- KPI 5개일 때: `grid-cols-2 lg:grid-cols-5` (모바일은 2열 유지)

#### Flex 줄바꿈
- 리스트 행의 액션 그룹: 부모에 `flex flex-wrap items-center gap-N`
- 텍스트 + 액션이 한 줄에 안 들어가면 자연스럽게 줄바꿈

#### 터치 타겟
- 버튼: `h-7` (28px) 최소, 아이콘 단독은 `h-7 w-7 p-0` (28×28)
- 더 작은 영역은 부모 패딩으로 확장 (`p-1.5` 등)

#### 모바일 바텀 네비
- 5개 한도. 6번째 이상은 우선순위 재배치
- 활성 표시 색상 일치 (`text-primary font-medium`)

### Phase 4: 접근성

#### Title / aria-label
- 아이콘 단독 버튼: `title="..."` 또는 `aria-label` 필수 (Blocker)
- 텍스트 동반 버튼: title 선택 (Suggestion)

#### Focus / Keyboard
- shadcn 컴포넌트 기본 focus 스타일 유지 (커스텀 outline 제거 금지)
- 모달: ESC로 닫기 가능한지 (shadcn Dialog 기본 동작)

#### data-testid
- 모든 인터랙티브 요소에 부여 (E2E + a11y hook 겸용)
- 컨벤션: `button-action-${id}`, `row-x-${id}`, `input-field-name`

### Phase 5: 상태 디자인

빈 데이터:
```tsx
{list.length === 0 ? (
  <p className="text-sm text-muted-foreground text-center py-8">
    아직 기록이 없습니다.
  </p>
) : (...)}
```
- 누락 → Blocker

로딩:
- 초기 fetch 중에 Skeleton 컴포넌트 또는 placeholder 노출
- 액션 중: 버튼 `disabled={mut.isPending}` + 라벨 전환 ("저장 중...")
- 누락 → Warning

에러:
- `useMutation`의 `onError`에서 `toast({ variant: "destructive", ... })`
- 누락 → Warning

### Phase 6: 다크모드

토큰 사용 검사:
- ✅ `text-foreground`, `text-muted-foreground`, `bg-card`, `border-border`
- ✅ `text-amber-700 dark:text-amber-400` 페어
- ❌ `text-gray-800`, `text-black`, `bg-white` 같은 절대값 → Blocker (다크모드 깨짐)

### Phase 7: 출력

`_workspace/03_design/report.md` 작성 (에이전트 정의 파일의 출력 템플릿 참조).

## 자동 수정 가능 범위 (보수적)

다음만 자동 수정:
- 영어 잔존 라벨 → 한국어 (단순한 경우: "Save" → "저장")
- 누락된 `title` 단순 추가 (아이콘 버튼)
- `text-gray-N` / `text-white` 같은 명확한 토큰 치환
- 누락된 `data-testid` 추가

다음은 수동 결정 항목으로 위임:
- 레이아웃 재배치
- 색상 톤 선택
- 정보 위계 재구성
- 신규 카피 작성·번역 검토

## 협업
- module-reviewer와 같은 `_workspace/01_scaffold/`를 검토하지만, 보는 영역이 직교
- Blocker 발견 시 오케스트레이터에게 scaffolder 1회 재호출 요청
- 두 reviewer 보고를 오케스트레이터가 통합하여 사용자에게 제시

## 절대 하지 말 것
- 비즈니스 로직·API·DB 검토 (module-reviewer 영역)
- npm run check 같은 빌드 검증
- 디자인 방향성을 임의로 결정 (수동 결정 항목으로)
- 산출물 자체를 다시 작성
